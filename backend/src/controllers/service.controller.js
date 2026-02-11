const serviceService = require('../services/service.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/response');

// Service Categories
exports.createCategory = catchAsync(async (req, res) => {
  const category = await serviceService.createCategory(req.body);
  sendResponse(res, 201, category);
});

exports.getCategories = catchAsync(async (req, res) => {
  const categories = await serviceService.getCategories(req.query);
  sendResponse(res, 200, categories);
});

// Services
exports.createService = catchAsync(async (req, res) => {
  const service = await serviceService.createService(req.body);
  sendResponse(res, 201, service);
});

exports.getServices = catchAsync(async (req, res) => {
  const services = await serviceService.getServices(req.query);
  sendResponse(res, 200, services);
});

exports.getServiceById = catchAsync(async (req, res) => {
  const service = await serviceService.getServiceById(req.params.id);
  sendResponse(res, 200, service);
});

exports.updateService = catchAsync(async (req, res) => {
  const service = await serviceService.updateService(req.params.id, req.body);
  sendResponse(res, 200, service);
});

// Package Categories
exports.createPackageCategory = catchAsync(async (req, res) => {
  const category = await serviceService.createPackageCategory(req.body);
  sendResponse(res, 201, category);
});

exports.getPackageCategories = catchAsync(async (req, res) => {
  const categories = await serviceService.getPackageCategories();
  sendResponse(res, 200, categories);
});

// Packages
exports.createPackage = catchAsync(async (req, res) => {
  const pkg = await serviceService.createPackage(req.body);
  sendResponse(res, 201, pkg);
});

exports.getPackages = catchAsync(async (req, res) => {
  const packages = await serviceService.getPackages(req.query);
  sendResponse(res, 200, packages);
});

exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await serviceService.getPackageById(req.params.id);
  sendResponse(res, 200, pkg);
});

exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await serviceService.updatePackage(req.params.id, req.body);
  sendResponse(res, 200, pkg);
});
