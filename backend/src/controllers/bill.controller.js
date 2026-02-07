const billService = require('../services/bill.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse, sendPaginatedResponse } = require('../utils/response');

exports.createBill = catchAsync(async (req, res) => {
  const bill = await billService.createBill(req.body, req.user.id);

  sendResponse(res, 201, bill);
});

exports.getBills = catchAsync(async (req, res) => {
  const result = await billService.getBills({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });

  sendPaginatedResponse(res, 200, result.bills, result.pagination);
});

exports.getBillById = catchAsync(async (req, res) => {
  const bill = await billService.getBillById(req.params.id, {
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });

  sendResponse(res, 200, bill);
});

exports.updateBill = catchAsync(async (req, res) => {
  const bill = await billService.updateBill(req.params.id, req.body, {
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });

  sendResponse(res, 200, bill);
});

exports.cancelBill = catchAsync(async (req, res) => {
  await billService.cancelBill(req.params.id, {
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });

  res.status(204).send();
});
