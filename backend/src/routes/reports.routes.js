const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Dashboard stats (all roles can view their relevant stats)
router.get('/dashboard', reportsController.getDashboardStats);

// Reports (managers and above)
router.get(
  '/daily-sales',
  authorize('owner', 'developer', 'manager', 'cashier'),
  reportsController.getDailySales
);

router.get(
  '/monthly-revenue',
  authorize('owner', 'developer', 'manager'),
  reportsController.getMonthlyRevenue
);

router.get(
  '/customers',
  authorize('owner', 'developer', 'manager'),
  reportsController.getCustomerAnalytics
);

router.get(
  '/employees',
  authorize('owner', 'developer', 'manager'),
  reportsController.getEmployeePerformance
);

router.get(
  '/services',
  authorize('owner', 'developer', 'manager'),
  reportsController.getServiceAnalytics
);

router.get(
  '/inventory',
  authorize('owner', 'developer', 'manager'),
  reportsController.getInventoryReport
);

module.exports = router;
