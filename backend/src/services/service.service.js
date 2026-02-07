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
    const { branch_id } = filters;

    const where = { isActive: true };
    if (branch_id) {
      where.branchId = branch_id;
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
        branchId: data.branch_id,
        price: data.price,
        durationMinutes: data.duration_minutes,
        starPoints: data.star_points || 0,
        description: data.description,
        imageUrl: data.image_url,
        isActive: data.is_active ?? true,
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
    if (branch_id) where.branchId = branch_id;
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
    if (data.branch_id !== undefined) updateData.branchId = data.branch_id;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.duration_minutes !== undefined) updateData.durationMinutes = data.duration_minutes;
    if (data.star_points !== undefined) updateData.starPoints = data.star_points;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
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
    return {
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
  }

  // Packages
  async createPackage(data) {
    const pkg = await prisma.$transaction(async (tx) => {
      const newPackage = await tx.package.create({
        data: {
          packageName: data.package_name,
          packagePrice: data.package_price,
          validityDays: data.validity_days,
          description: data.description,
          imageUrl: data.image_url,
          isActive: data.is_active ?? true,
          packageServices: {
            create: data.services.map((s) => ({
              serviceId: s.service_id,
              quantity: s.quantity || 1,
              servicePrice: s.service_price,
            })),
          },
        },
        include: {
          packageServices: {
            include: {
              service: true,
            },
          },
        },
      });

      return newPackage;
    });

    return this.formatPackage(pkg);
  }

  async getPackages(filters = {}) {
    const { is_active } = filters;

    const where = {};
    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { packageName: 'asc' },
    });

    return packages.map(this.formatPackage);
  }

  async getPackageById(id) {
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        packageServices: {
          include: {
            service: true,
          },
        },
      },
    });

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
      if (data.package_price !== undefined) updateData.packagePrice = data.package_price;
      if (data.validity_days !== undefined) updateData.validityDays = data.validity_days;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.image_url !== undefined) updateData.imageUrl = data.image_url;
      if (data.is_active !== undefined) updateData.isActive = data.is_active;

      // Update package
      const updated = await tx.package.update({
        where: { id },
        data: updateData,
      });

      // Update services if provided
      if (data.services) {
        // Delete existing
        await tx.packageService.deleteMany({
          where: { packageId: id },
        });

        // Create new
        await tx.packageService.createMany({
          data: data.services.map((s) => ({
            packageId: id,
            serviceId: s.service_id,
            quantity: s.quantity || 1,
            servicePrice: s.service_price,
          })),
        });
      }

      return tx.package.findUnique({
        where: { id },
        include: {
          packageServices: {
            include: {
              service: true,
            },
          },
        },
      });
    });

    return this.formatPackage(updatedPackage);
  }

  formatPackage(pkg) {
    const services = pkg.packageServices || [];
    const individualPrice = services.reduce(
      (sum, ps) => sum + parseFloat(ps.servicePrice || ps.service.price) * ps.quantity,
      0
    );
    const totalServices = services.reduce((sum, ps) => sum + ps.quantity, 0);

    return {
      package_id: pkg.id,
      package_name: pkg.packageName,
      package_price: parseFloat(pkg.packagePrice),
      validity_days: pkg.validityDays,
      description: pkg.description,
      image_url: pkg.imageUrl,
      services: services.map((ps) => ({
        service_id: ps.service.id,
        service_name: ps.service.serviceName,
        quantity: ps.quantity,
        service_price: parseFloat(ps.servicePrice || ps.service.price),
      })),
      total_services: totalServices,
      individual_price: individualPrice,
      savings: individualPrice - parseFloat(pkg.packagePrice),
      is_active: pkg.isActive,
      created_at: pkg.createdAt,
      updated_at: pkg.updatedAt,
    };
  }
}

module.exports = new ServiceService();
