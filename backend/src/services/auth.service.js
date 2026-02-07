const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const jwtConfig = require('../config/jwt');
const AppError = require('../utils/AppError');

class AuthService {
  async login(username, password) {
    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
      },
      tokens,
    };
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
    };

    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      jwtConfig.refreshSecret,
      {
        expiresIn: jwtConfig.refreshExpiresIn,
      }
    );

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpiresIn(jwtConfig.expiresIn);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      token_type: 'Bearer',
    };
  }

  parseExpiresIn(expiry) {
    if (typeof expiry === 'number') return expiry;

    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
      }

      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
      };

      const accessToken = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
      });

      return {
        access_token: accessToken,
        expires_in: this.parseExpiresIn(jwtConfig.expiresIn),
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
      }
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Define permissions based on role
    const permissions = this.getPermissionsByRole(user.role);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch,
      profileImage: user.profileImage,
      permissions,
    };
  }

  getPermissionsByRole(role) {
    const permissionMap = {
      owner: [
        'branches.*', 'users.*', 'customers.*', 'bills.*', 'services.*',
        'packages.*', 'products.*', 'inventory.*', 'employees.*',
        'reports.*', 'settings.*',
      ],
      developer: [
        'branches.*', 'users.*', 'customers.*', 'bills.*', 'services.*',
        'packages.*', 'products.*', 'inventory.*', 'employees.*',
        'reports.*', 'settings.*', 'system.*',
      ],
      manager: [
        'customers.*', 'bills.*', 'services.view', 'packages.view',
        'products.*', 'inventory.*', 'employees.view', 'reports.view',
      ],
      cashier: [
        'customers.view', 'customers.create', 'bills.view', 'bills.create',
        'services.view', 'packages.view', 'products.view',
      ],
      employee: [
        'bills.view_own', 'services.view', 'attendance.own',
      ],
      vendor: [
        'products.view', 'inventory.view',
      ],
    };

    return permissionMap[role] || [];
  }
}

module.exports = new AuthService();
