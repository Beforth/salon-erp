const importService = require('../services/import.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/response');
const AppError = require('../utils/AppError');

exports.uploadCSV = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const records = await importService.parseCSV(req.file.buffer);

  // Get column headers
  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  sendResponse(res, 200, {
    total_records: records.length,
    headers,
    preview: records.slice(0, 5),
  });
});

exports.validateImport = catchAsync(async (req, res) => {
  const { records, field_mapping } = req.body;

  const validation = await importService.validateImportData(records, field_mapping);

  sendResponse(res, 200, validation);
});

exports.importBills = catchAsync(async (req, res) => {
  const branchId = req.body.branch_id || req.user.branchId;

  if (!branchId) {
    throw new AppError('Branch ID is required', 400, 'BRANCH_REQUIRED');
  }

  const result = await importService.importBills(req.body, req.user.id, branchId);

  sendResponse(res, 200, result);
});
