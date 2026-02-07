const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const billRoutes = require('./bill.routes');
const serviceRoutes = require('./service.routes');
const packageRoutes = require('./package.routes');
const branchRoutes = require('./branch.routes');
const productRoutes = require('./product.routes');
const inventoryRoutes = require('./inventory.routes');
const importRoutes = require('./import.routes');
const reportsRoutes = require('./reports.routes');
const userRoutes = require('./user.routes');
const settingsRoutes = require('./settings.routes');
const cashRoutes = require('./cash.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/bills', billRoutes);
router.use('/services', serviceRoutes);
router.use('/packages', packageRoutes);
router.use('/branches', branchRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/import', importRoutes);
router.use('/reports', reportsRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/cash', cashRoutes);

module.exports = router;
