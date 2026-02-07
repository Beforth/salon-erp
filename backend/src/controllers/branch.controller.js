const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/response');
const AppError = require('../utils/AppError');

exports.getBranches = catchAsync(async (req, res) => {
  const { is_active } = req.query;

  const where = {};
  if (is_active !== undefined) {
    where.isActive = is_active === 'true';
  }

  const branches = await prisma.branch.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  sendResponse(res, 200, branches.map((b) => ({
    branch_id: b.id,
    name: b.name,
    code: b.code,
    address: b.address,
    phone: b.phone,
    email: b.email,
    city: b.city,
    state: b.state,
    pincode: b.pincode,
    is_active: b.isActive,
  })));
});

exports.getBranchById = catchAsync(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
    include: {
      _count: {
        select: {
          users: true,
          bills: true,
          chairs: true,
        },
      },
    },
  });

  if (!branch) {
    throw new AppError('Branch not found', 404, 'NOT_FOUND');
  }

  sendResponse(res, 200, {
    branch_id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    city: branch.city,
    state: branch.state,
    pincode: branch.pincode,
    is_active: branch.isActive,
    stats: {
      users_count: branch._count.users,
      bills_count: branch._count.bills,
      chairs_count: branch._count.chairs,
    },
  });
});

exports.createBranch = catchAsync(async (req, res) => {
  const { name, code, address, phone, email, city, state, pincode } = req.body;

  const branch = await prisma.branch.create({
    data: {
      name,
      code,
      address,
      phone,
      email,
      city,
      state,
      pincode,
    },
  });

  sendResponse(res, 201, {
    branch_id: branch.id,
    name: branch.name,
    code: branch.code,
    is_active: branch.isActive,
  });
});

exports.updateBranch = catchAsync(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
  });

  if (!branch) {
    throw new AppError('Branch not found', 404, 'NOT_FOUND');
  }

  const { name, address, phone, email, city, state, pincode, is_active } = req.body;

  const updated = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(pincode !== undefined && { pincode }),
      ...(is_active !== undefined && { isActive: is_active }),
    },
  });

  sendResponse(res, 200, {
    branch_id: updated.id,
    name: updated.name,
    code: updated.code,
    is_active: updated.isActive,
  });
});

exports.getBranchEmployees = catchAsync(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
  });

  if (!branch) {
    throw new AppError('Branch not found', 404, 'NOT_FOUND');
  }

  const employees = await prisma.user.findMany({
    where: {
      branchId: req.params.id,
      role: 'employee',
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      employeeDetails: {
        select: {
          employeeCode: true,
        },
      },
    },
    orderBy: { fullName: 'asc' },
  });

  sendResponse(res, 200, employees.map((e) => ({
    employee_id: e.id,
    full_name: e.fullName,
    username: e.username,
    employee_code: e.employeeDetails?.employeeCode,
  })));
});

exports.getBranchChairs = catchAsync(async (req, res) => {
  const branch = await prisma.branch.findUnique({
    where: { id: req.params.id },
  });

  if (!branch) {
    throw new AppError('Branch not found', 404, 'NOT_FOUND');
  }

  const chairs = await prisma.chair.findMany({
    where: {
      branchId: req.params.id,
      isActive: true,
    },
    orderBy: { chairNumber: 'asc' },
  });

  sendResponse(res, 200, chairs.map((c) => ({
    chair_id: c.id,
    chair_number: c.chairNumber,
    chair_name: c.chairName,
  })));
});
