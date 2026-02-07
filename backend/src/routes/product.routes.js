const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Product categories
router.get('/categories', productController.getProductCategories);

// Low stock products
router.get('/low-stock', productController.getLowStockProducts);

// Product CRUD
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', authorize('owner', 'developer', 'manager'), productController.createProduct);
router.put('/:id', authorize('owner', 'developer', 'manager'), productController.updateProduct);
router.delete('/:id', authorize('owner', 'developer'), productController.deleteProduct);

module.exports = router;
