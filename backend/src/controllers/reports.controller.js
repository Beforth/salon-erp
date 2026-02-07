const reportsService = require('../services/reports.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/response');

exports.getDailySales = catchAsync(async (req, res) => {
  const report = await reportsService.getDailySales({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, report);
});

exports.getMonthlyRevenue = catchAsync(async (req, res) => {
  const report = await reportsService.getMonthlyRevenue({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, report);
});

exports.getCustomerAnalytics = catchAsync(async (req, res) => {
  const report = await reportsService.getCustomerAnalytics({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, report);
});

exports.getEmployeePerformance = catchAsync(async (req, res) => {
  const report = await reportsService.getEmployeePerformance({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, report);
});

exports.getServiceAnalytics = catchAsync(async (req, res) => {
  const report = await reportsService.getServiceAnalytics({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, report);
});

exports.getInventoryReport = catchAsync(async (req, res) => {
  const report = await reportsService.getInventoryReport(req.query);
  sendResponse(res, 200, report);
});

exports.getDashboardStats = catchAsync(async (req, res) => {
  const stats = await reportsService.getDashboardStats({
    ...req.query,
    userRole: req.user.role,
    userBranchId: req.user.branchId,
  });
  sendResponse(res, 200, stats);
});
