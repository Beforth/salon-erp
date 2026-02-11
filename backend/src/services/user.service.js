const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class UserService {
  async generateEmployeeCode(tx) {
    const db = tx || prisma;
    const latest = await db.employeeDetail.findFirst({
      where: { employeeCode: { not: null } },
      orderBy: { employeeCode: 'desc' },
    });

    let nextNum = 100001;
    if (latest?.employeeCode) {
      const num = parseInt(latest.employeeCode);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }

    return String(nextNum);
  }

  /**
   * Get all users with optional filters
   */
  async getUsers(filters = {}, requestingUser) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      branch_id,
      is_active,
    } = filters;

    const where = {};

    // Branch filtering based on user role
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'developer') {
      where.branchId = requestingUser.branchId;
    } else if (branch_id) {
      where.branchId = branch_id;
    }

    // Search filter
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role) {
      where.role = role;
    }

    // Active status filter
    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          employeeDetails: {
            select: {
              employeeCode: true,
              joiningDate: true,
              baseSalary: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map(this.formatUser),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId, requestingUser) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
        employeeDetails: true,
        employeeBranches: {
          include: { branch: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'developer') {
      if (user.branchId !== requestingUser.branchId && user.id !== requestingUser.userId) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    return this.formatUser(user);
  }

  /**
   * Create new user
   */
  async createUser(data, requestingUser) {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      role,
      branch_id,
      additional_branches,
      is_active = true,
      // Employee details
      employee_code,
      joining_date,
      date_of_birth,
      address,
      aadhar_number,
      pan_number,
      base_salary,
      bank_account_number,
      bank_name,
      bank_ifsc,
      emergency_contact_name,
      emergency_contact_phone,
    } = data;

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new AppError('Username already exists', 400, 'DUPLICATE_USERNAME');
      }
      throw new AppError('Email already exists', 400, 'DUPLICATE_EMAIL');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine branch
    let assignedBranchId = branch_id;
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'developer') {
      assignedBranchId = requestingUser.branchId;
    }

    // Create user with employee details in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          fullName: full_name,
          phone,
          role,
          branchId: assignedBranchId,
          isActive: is_active,
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // Create employee details if role is employee, manager, or cashier
      if (['employee', 'manager', 'cashier'].includes(role)) {
        const generatedCode = employee_code || await this.generateEmployeeCode(tx);
        await tx.employeeDetail.create({
          data: {
            id: newUser.id,
            employeeCode: generatedCode,
            joiningDate: joining_date ? new Date(joining_date) : new Date(),
            dateOfBirth: date_of_birth ? new Date(date_of_birth) : null,
            address,
            aadharNumber: aadhar_number,
            panNumber: pan_number,
            baseSalary: base_salary,
            bankAccountNumber: bank_account_number,
            bankName: bank_name,
            bankIfsc: bank_ifsc,
            emergencyContactName: emergency_contact_name,
            emergencyContactPhone: emergency_contact_phone,
            isActive: is_active,
          },
        });

        // Create branch mappings
        if (assignedBranchId) {
          await tx.employeeBranch.create({
            data: { userId: newUser.id, branchId: assignedBranchId, isPrimary: true },
          });
          if (Array.isArray(additional_branches)) {
            for (const abId of additional_branches) {
              if (abId && abId !== assignedBranchId) {
                await tx.employeeBranch.create({
                  data: { userId: newUser.id, branchId: abId, isPrimary: false },
                });
              }
            }
          }
        }
      }

      return newUser;
    });

    return this.formatUser(user);
  }

  /**
   * Update user
   */
  async updateUser(userId, data, requestingUser) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { employeeDetails: true },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'developer') {
      if (existingUser.branchId !== requestingUser.branchId) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    const {
      email,
      full_name,
      phone,
      role,
      branch_id,
      additional_branches,
      is_active,
      password,
      // Employee details
      employee_code,
      joining_date,
      date_of_birth,
      address,
      aadhar_number,
      pan_number,
      base_salary,
      bank_account_number,
      bank_name,
      bank_ifsc,
      emergency_contact_name,
      emergency_contact_phone,
    } = data;

    // Check email uniqueness if changing
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (emailExists) {
        throw new AppError('Email already exists', 400, 'DUPLICATE_EMAIL');
      }
    }

    // Build update data
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (full_name !== undefined) updateData.fullName = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.isActive = is_active;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    if (branch_id !== undefined && (requestingUser.role === 'owner' || requestingUser.role === 'developer')) {
      updateData.branchId = branch_id;
    }

    // Update in transaction
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          employeeDetails: true,
        },
      });

      // Update or create employee details
      if (['employee', 'manager', 'cashier'].includes(updatedUser.role)) {
        const employeeData = {
          employeeCode: employee_code,
          joiningDate: joining_date ? new Date(joining_date) : undefined,
          dateOfBirth: date_of_birth ? new Date(date_of_birth) : undefined,
          address,
          aadharNumber: aadhar_number,
          panNumber: pan_number,
          baseSalary: base_salary,
          bankAccountNumber: bank_account_number,
          bankName: bank_name,
          bankIfsc: bank_ifsc,
          emergencyContactName: emergency_contact_name,
          emergencyContactPhone: emergency_contact_phone,
          isActive: is_active,
        };

        // Remove undefined values
        Object.keys(employeeData).forEach(key => {
          if (employeeData[key] === undefined) delete employeeData[key];
        });

        if (Object.keys(employeeData).length > 0) {
          await tx.employeeDetail.upsert({
            where: { id: userId },
            create: {
              id: userId,
              employeeCode: employee_code || await this.generateEmployeeCode(tx),
              ...employeeData,
            },
            update: employeeData,
          });
        }

        // Sync branch mappings if additional_branches provided
        if (additional_branches !== undefined) {
          const primaryBranchId = updatedUser.branchId;
          await tx.employeeBranch.deleteMany({ where: { userId } });
          if (primaryBranchId) {
            await tx.employeeBranch.create({
              data: { userId, branchId: primaryBranchId, isPrimary: true },
            });
          }
          for (const abId of (additional_branches || [])) {
            if (abId && abId !== primaryBranchId) {
              await tx.employeeBranch.create({
                data: { userId, branchId: abId, isPrimary: false },
              });
            }
          }
        }
      }

      return updatedUser;
    });

    return this.formatUser(user);
  }

  /**
   * Delete user (soft delete by deactivating)
   */
  async deleteUser(userId, requestingUser) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Prevent self-deletion
    if (userId === requestingUser.userId) {
      throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE');
    }

    // Check access
    if (requestingUser.role !== 'owner' && requestingUser.role !== 'developer') {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Get staff performance summary (uses BillItemEmployee junction for accurate split)
   */
  async getStaffPerformance(userId, period = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const [billItemEmployees, user] = await Promise.all([
      prisma.billItemEmployee.findMany({
        where: {
          employeeId: userId,
          billItem: {
            bill: {
              status: 'completed',
              billDate: { gte: startDate },
            },
          },
        },
        include: {
          billItem: {
            include: {
              service: { select: { starPoints: true } },
              employees: { select: { employeeId: true } },
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          employeeDetails: {
            include: {
              attendance: {
                where: {
                  attendanceDate: { gte: startDate },
                },
              },
            },
          },
        },
      }),
    ]);

    let totalStarPoints = 0;
    let totalRevenue = 0;

    for (const bie of billItemEmployees) {
      const item = bie.billItem;
      const totalEmployees = item.employees.length || 1;
      totalStarPoints += (item.service?.starPoints || 0) * item.quantity / totalEmployees;
      totalRevenue += parseFloat(item.totalPrice) / totalEmployees;
    }

    const attendance = user?.employeeDetails?.attendance || [];
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const totalDays = attendance.length;

    return {
      total_services: billItemEmployees.length,
      total_star_points: Math.round(totalStarPoints * 100) / 100,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      present_days: presentDays,
      total_days: totalDays,
      attendance_rate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0,
    };
  }

  /**
   * Format user for response
   */
  formatUser(user) {
    return {
      user_id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.fullName,
      phone: user.phone,
      role: user.role,
      branch_id: user.branchId,
      branch: user.branch ? {
        branch_id: user.branch.id,
        name: user.branch.name,
        code: user.branch.code,
      } : null,
      profile_image: user.profileImage,
      is_active: user.isActive,
      last_login: user.lastLogin,
      created_at: user.createdAt,
      employee_details: user.employeeDetails ? {
        employee_code: user.employeeDetails.employeeCode,
        joining_date: user.employeeDetails.joiningDate,
        date_of_birth: user.employeeDetails.dateOfBirth,
        address: user.employeeDetails.address,
        aadhar_number: user.employeeDetails.aadharNumber,
        pan_number: user.employeeDetails.panNumber,
        base_salary: user.employeeDetails.baseSalary,
        bank_account_number: user.employeeDetails.bankAccountNumber,
        bank_name: user.employeeDetails.bankName,
        bank_ifsc: user.employeeDetails.bankIfsc,
        emergency_contact_name: user.employeeDetails.emergencyContactName,
        emergency_contact_phone: user.employeeDetails.emergencyContactPhone,
        monthly_star_goal: user.employeeDetails.monthlyStarGoal,
      } : null,
      additional_branches: (user.employeeBranches || [])
        .filter(eb => !eb.isPrimary)
        .map(eb => ({
          branch_id: eb.branch.id,
          name: eb.branch.name,
          code: eb.branch.code,
        })),
    };
  }
}

module.exports = new UserService();
