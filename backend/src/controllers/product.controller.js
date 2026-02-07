const productService = require('../services/product.service');
const catchAsync = require('../utils/catchAsync');
const { sendResponse, sendPaginatedResponse } = require('../utils/response');

exports.createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendResponse(res, 201, product);
});

exports.getProducts = catchAsync(async (req, res) => {
  const result = await productService.getProducts(req.query);
  sendPaginatedResponse(res, 200, result.products, result.pagination);
});

exports.getProductById = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  sendResponse(res, 200, product);
});

exports.updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  sendResponse(res, 200, product);
});

exports.deleteProduct = catchAsync(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  sendResponse(res, 200, result);
});

exports.getProductCategories = catchAsync(async (req, res) => {
  const categories = await productService.getProductCategories();
  sendResponse(res, 200, categories);
});

exports.getLowStockProducts = catchAsync(async (req, res) => {
  const products = await productService.getLowStockProducts();
  sendResponse(res, 200, products);
});
