const customerService = require('../services/customer.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse, sendPaginatedResponse } = require('../utils/response');

exports.createCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.createCustomer(req.body, req.user.id);

  sendResponse(res, 201, customer);
});

exports.getCustomers = catchAsync(async (req, res) => {
  const result = await customerService.getCustomers(req.query);

  sendPaginatedResponse(res, 200, result.customers, result.pagination);
});

exports.getCustomerById = catchAsync(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);

  sendResponse(res, 200, customer);
});

exports.getCustomerHistory = catchAsync(async (req, res) => {
  const result = await customerService.getCustomerHistory(req.params.id, req.query);

  sendPaginatedResponse(res, 200, result, result.pagination);
});

exports.updateCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);

  sendResponse(res, 200, customer);
});

exports.searchCustomers = catchAsync(async (req, res) => {
  const { q, limit } = req.query;

  const customers = await customerService.searchCustomers(q, limit);

  sendResponse(res, 200, customers);
});
