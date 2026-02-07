const inventoryService = require('../services/inventory.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse, sendPaginatedResponse } = require('../utils/response');

exports.getInventory = catchAsync(async (req, res) => {
  const result = await inventoryService.getInventory(req.query);
  sendPaginatedResponse(res, 200, result.inventory, result.pagination);
});

exports.adjustStock = catchAsync(async (req, res) => {
  const result = await inventoryService.adjustStock(req.body, req.user.id);
  sendResponse(res, 200, result);
});

exports.createStockTransfer = catchAsync(async (req, res) => {
  const transfer = await inventoryService.createStockTransfer(req.body, req.user.id);
  sendResponse(res, 201, transfer);
});

exports.approveStockTransfer = catchAsync(async (req, res) => {
  const result = await inventoryService.approveStockTransfer(req.params.id, req.user.id);
  sendResponse(res, 200, result);
});

exports.getStockTransfers = catchAsync(async (req, res) => {
  const result = await inventoryService.getStockTransfers(req.query);
  sendPaginatedResponse(res, 200, result.transfers, result.pagination);
});

exports.getLocations = catchAsync(async (req, res) => {
  const locations = await inventoryService.getLocations();
  sendResponse(res, 200, locations);
});
