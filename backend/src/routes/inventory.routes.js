const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Locations
router.get('/locations', inventoryController.getLocations);

// Inventory
router.get('/', inventoryController.getInventory);
router.post('/adjust', authorize('owner', 'developer', 'manager'), inventoryController.adjustStock);

// Stock transfers
router.get('/transfers', inventoryController.getStockTransfers);
router.post('/transfers', authorize('owner', 'developer', 'manager'), inventoryController.createStockTransfer);
router.post('/transfers/:id/approve', authorize('owner', 'developer', 'manager'), inventoryController.approveStockTransfer);

module.exports = router;
