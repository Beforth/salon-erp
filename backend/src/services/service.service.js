const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class ServiceService {
  // Service Categories
  async createCategory(data) {
    const category = await prisma.serviceCategory.create({
      data: {
        name: data.name,
        description: data.description,
        branchId: data.branch_id,
        parentId: data.parent_id,
        displayOrder: data.display_order || 0,
      },
    });

    return this.formatCategory(category);
  }

  async getCategories(filters = {}) {
    // Support both branch_id and branchId from query
    let branchId = filters.branch_id ?? filters.branchId;
    if (Array.isArray(branchId)) branchId = branchId[0];
    const branch_id = branchId && String(branchId).trim() ? String(branchId).trim() : null;

    const where = { isActive: true };
    if (branch_id) {
      // Branch mentioned: show global (branchId null) + branch-specific categories
      where.OR = [{ branchId: branch_id }, { branchId: null }];
    } else {
      // Branch not mentioned: only global categories (visible to all branches)
      where.branchId = null;
    }

    const categories = await prisma.serviceCategory.findMany({
      where,
      include: {
        children: { where: { isActive: true } },
        _count: { select: { services: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return categories.map((c) => ({
      category_id: c.id,
      name: c.name,
      description: c.description,
      branch_id: c.branchId,
      branch: c.branch ? { branch_id: c.branch.id, name: c.branch.name, code: c.branch.code } : null,
      parent_id: c.parentId,
      display_order: c.displayOrder,
      services_count: c._count.services,
      children: c.children.map(this.formatCategory),
    }));
  }

  formatCategory(category) {
    return {
      category_id: category.id,
      name: category.name,
      description: category.description,
      parent_id: category.parentId,
      display_order: category.displayOrder,
      is_active: category.isActive,
    };
  }

  // Services
  async createService(data) {
    const service = await prisma.service.create({
      data: {
        serviceName: data.service_name,
        categoryId: data.category_id,
        branchId: data.branch_id || null,
        price: data.price,
        durationMinutes: data.duration_minutes,
        starPoints: Number(data.star_points) || 0,
        description: data.description,
        imageUrl: data.image_url,
        isMultiEmployee: data.is_multi_employee === true,
        employeeCount: data.is_multi_employee === true ? (data.employee_count ?? null) : null,
        isActive: data.is_active !== false,
      },
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return this.formatService(service);
  }

  async getServices(filters) {
    const { category_id, branch_id, is_active, search } = filters;

    const where = {};

    if (category_id) where.categoryId = category_id;
    if (branch_id) {
      // Include both branch-specific and global (branchId null) services
      where.OR = [{ branchId: branch_id }, { branchId: null }];
    }
    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }
    if (search) {
      where.serviceName = { contains: search, mode: 'insensitive' };
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { serviceName: 'asc' },
      ],
    });

    return services.map((s) => this.formatService(s));
  }

  async getServiceById(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'NOT_FOUND');
    }

    return this.formatService(service);
  }

  async updateService(id, data) {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'NOT_FOUND');
    }

    const updateData = {};
    if (data.service_name !== undefined) updateData.serviceName = data.service_name;
    if (data.category_id !== undefined) updateData.categoryId = data.category_id;
    if (data.branch_id !== undefined) updateData.branchId = data.branch_id || null;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.duration_minutes !== undefined) updateData.durationMinutes = data.duration_minutes;
    if (data.star_points !== undefined) updateData.starPoints = Number(data.star_points) || 0;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
    if ('is_multi_employee' in data) {
      updateData.isMultiEmployee = data.is_multi_employee === true;
      updateData.employeeCount = data.is_multi_employee === true && data.employee_count != null
        ? Number(data.employee_count)
        : null;
    } else if (data.employee_count !== undefined) {
      updateData.employeeCount = data.employee_count != null ? Number(data.employee_count) : null;
    }
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return this.formatService(updatedService);
  }

  formatService(service) {
    const row = {
      service_id: service.id,
      service_name: service.serviceName,
      category: service.category
        ? {
            category_id: service.category.id,
            category_name: service.category.name,
          }
        : null,
      branch_id: service.branchId,
      branch: service.branch
        ? {
            branch_id: service.branch.id,
            name: service.branch.name,
            code: service.branch.code,
          }
        : null,
      price: parseFloat(service.price),
      duration_minutes: service.durationMinutes,
      star_points: service.starPoints,
      description: service.description,
      image_url: service.imageUrl,
      is_active: service.isActive,
      created_at: service.createdAt,
      updated_at: service.updatedAt,
    };
    // Always include employee type fields (ensure they appear in list + detail APIs)
    row.is_multi_employee = service.isMultiEmployee === true;
    row.employee_count = service.employeeCount != null ? Number(service.employeeCount) : null;
    return row;
  }

  // Packages
  async createPackage(data) {
    const pkg = await prisma.$transaction(async (tx) => {
      const newPackage = await tx.package.create({
        data: {
          packageName: data.package_name,
          packagePrice: data.package_price != null ? data.package_price : null,
          validityDays: data.validity_days,
          description: data.description,
          imageUrl: data.image_url,
          isActive: data.is_active ?? true,
        },
      });

      const standalone = (data.services || []).filter(Boolean);
      const groups = data.service_groups || [];

      if (standalone.length > 0) {
        await tx.packageService.createMany({
          data: standalone.map((s) => ({
            packageId: newPackage.id,
            serviceId: s.service_id,
            quantity: Number(s.quantity) || 1,
            servicePrice: s.service_price != null ? Number(s.service_price) : null,
            groupId: null,
          })),
        });
      }

      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const groupRecord = await tx.packageServiceGroup.create({
          data: {
            packageId: newPackage.id,
            groupLabel: g.group_label,
            sortOrder: i,
          },
        });
        if (g.services && g.services.length > 0) {
          await tx.packageService.createMany({
            data: g.services.map((s) => ({
              packageId: newPackage.id,
              serviceId: s.service_id,
              quantity: Number(s.quantity) || 1,
              servicePrice: s.service_price != null ? Number(s.service_price) : null,
              groupId: groupRecord.id,
            })),
          });
        }
      }

      return tx.package.findUnique({
        where: { id: newPackage.id },
        include: {
          packageServices: { include: { service: true } },
          packageServiceGroups: { include: { services: { include: { service: true } } } },
        },
      });
    });

    return this.formatPackage(pkg);
  }

  _packageIncludeWithGroups() {
    return {
      packageServices: {
        include: {
          service: {
            select: {
              id: true,
              serviceName: true,
              price: true,
              durationMinutes: true,
              starPoints: true,
              isMultiEmployee: true,
              employeeCount: true,
            },
          },
        },
      },
      packageServiceGroups: {
        orderBy: { sortOrder: 'asc' },
        include: {
          services: {
            include: {
              service: {
                select: {
                  id: true,
                  serviceName: true,
                  price: true,
                  durationMinutes: true,
                  starPoints: true,
                  isMultiEmployee: true,
                  employeeCount: true,
                },
              },
            },
          },
        },
      },
    };
  }

  async getPackages(filters = {}) {
    const { is_active } = filters;

    const where = {};
    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const baseInclude = {
      packageServices: {
        include: {
          service: {
            select: {
              id: true,
              serviceName: true,
              price: true,
              durationMinutes: true,
              starPoints: true,
              isMultiEmployee: true,
              employeeCount: true,
            },
          },
        },
      },
    };

    let packages;
    try {
      packages = await prisma.package.findMany({
        where,
        include: { ...baseInclude, ...this._packageIncludeWithGroups() },
        orderBy: { packageName: 'asc' },
      });
    } catch (err) {
      if (err.name === 'PrismaClientValidationError' && err.message?.includes('packageServiceGroups')) {
        packages = await prisma.package.findMany({
          where,
          include: baseInclude,
          orderBy: { packageName: 'asc' },
        });
        packages = packages.map((p) => ({ ...p, packageServiceGroups: [] }));
      } else {
        throw err;
      }
    }

    return packages.map(this.formatPackage);
  }

  async getPackageById(id) {
    const baseInclude = {
      packageServices: {
        include: {
          service: {
            select: {
              id: true,
              serviceName: true,
              price: true,
              durationMinutes: true,
              starPoints: true,
              isMultiEmployee: true,
              employeeCount: true,
            },
          },
        },
      },
    };

    let pkg;
    try {
      pkg = await prisma.package.findUnique({
        where: { id },
        include: { ...baseInclude, ...this._packageIncludeWithGroups() },
      });
    } catch (err) {
      if (err.name === 'PrismaClientValidationError' && err.message?.includes('packageServiceGroups')) {
        pkg = await prisma.package.findUnique({
          where: { id },
          include: baseInclude,
        });
        if (pkg) pkg = { ...pkg, packageServiceGroups: [] };
      } else {
        throw err;
      }
    }

    if (!pkg) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    return this.formatPackage(pkg);
  }

  async updatePackage(id, data) {
    const pkg = await prisma.package.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    const updatedPackage = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (data.package_name !== undefined) updateData.packageName = data.package_name;
      if (data.package_price !== undefined) updateData.packagePrice = data.package_price ?? null;
      if (data.validity_days !== undefined) updateData.validityDays = data.validity_days;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
      if (data.is_active !== undefined) updateData.isActive = data.is_active;

      // Update package
      const updated = await tx.package.update({
        where: { id },
        data: updateData,
      });

      // Update services and/or service_groups if provided
      if (data.services !== undefined || data.service_groups !== undefined) {
        await tx.packageService.deleteMany({ where: { packageId: id } });
        await tx.packageServiceGroup.deleteMany({ where: { packageId: id } });

        const standalone = (data.services || []).filter(Boolean);
        const groups = data.service_groups || [];

        if (standalone.length > 0) {
          await tx.packageService.createMany({
            data: standalone.map((s) => ({
              packageId: id,
              serviceId: s.service_id,
              quantity: s.quantity || 1,
              servicePrice: s.service_price,
              groupId: null,
            })),
          });
        }

        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          const groupRecord = await tx.packageServiceGroup.create({
            data: {
              packageId: id,
              groupLabel: g.group_label,
              sortOrder: i,
            },
          });
          if (g.services && g.services.length > 0) {
            await tx.packageService.createMany({
              data: g.services.map((s) => ({
                packageId: id,
                serviceId: s.service_id,
                quantity: s.quantity || 1,
                servicePrice: s.service_price,
                groupId: groupRecord.id,
              })),
            });
          }
        }
      }

      return tx.package.findUnique({
        where: { id },
        include: {
          packageServices: {
            include: {
              service: {
                select: {
                  id: true,
                  serviceName: true,
                  price: true,
                  durationMinutes: true,
                  starPoints: true,
                  isMultiEmployee: true,
                  employeeCount: true,
                },
              },
            },
          },
          packageServiceGroups: {
            orderBy: { sortOrder: 'asc' },
            include: {
              services: {
                include: {
                  service: {
                    select: {
                      id: true,
                      serviceName: true,
                      price: true,
                      durationMinutes: true,
                      starPoints: true,
                      isMultiEmployee: true,
                      employeeCount: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return this.formatPackage(updatedPackage);
  }

  formatPackage(pkg) {
    const allPackageServices = pkg.packageServices || [];
    const standaloneServices = allPackageServices.filter((ps) => !ps.groupId);
    const groups = pkg.packageServiceGroups || [];

    const mapPs = (ps) => {
      const svc = ps.service || {};
      return {
        service_id: svc.id,
        service_name: svc.serviceName,
        quantity: ps.quantity,
        service_price: parseFloat(ps.servicePrice ?? svc.price ?? 0),
        star_points: Number(svc.starPoints ?? svc.star_points ?? 0),
        is_multi_employee: svc.isMultiEmployee ?? false,
        employee_count: svc.employeeCount ?? null,
      };
    };

    let individualPrice = standaloneServices.reduce(
      (sum, ps) => sum + parseFloat(ps.servicePrice || ps.service?.price || 0) * ps.quantity,
      0
    );
    const serviceGroupsFormatted = groups.map((g) => {
      const groupServices = g.services || [];
      const groupPrices = groupServices.map(
        (ps) => parseFloat(ps.servicePrice || ps.service?.price || 0) * ps.quantity
      );
      const maxInGroup = groupPrices.length ? Math.max(...groupPrices) : 0;
      individualPrice += maxInGroup;
      return {
        group_id: g.id,
        group_label: g.groupLabel,
        services: groupServices.map(mapPs),
      };
    });

    const totalServices =
      standaloneServices.reduce((sum, ps) => sum + ps.quantity, 0) + groups.length;

    const packagePrice = pkg.packagePrice != null ? parseFloat(pkg.packagePrice) : null;
    return {
      package_id: pkg.id,
      package_name: pkg.packageName,
      package_price: packagePrice,
      validity_days: pkg.validityDays,
      description: pkg.description,
      image_url: pkg.imageUrl,
      services: standaloneServices.map(mapPs),
      service_groups: serviceGroupsFormatted,
      total_services: totalServices,
      individual_price: individualPrice,
      savings: packagePrice != null ? individualPrice - packagePrice : 0,
      is_active: pkg.isActive,
      created_at: pkg.createdAt,
      updated_at: pkg.updatedAt,
    };
  }
}

module.exports = new ServiceService();
