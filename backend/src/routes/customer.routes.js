const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCustomerSchema,
  updateCustomerSchema,
  getCustomersSchema,
  getCustomerByIdSchema,
} = require('../validators/customer.validator');

// All routes require authentication
router.use(authenticate);

// Search customers (before :id route)
router.get('/search', customerController.searchCustomers);

// CRUD operations
router.post(
  '/',
  authorize('owner', 'manager', 'cashier', 'developer'),
  validate(createCustomerSchema),
  customerController.createCustomer
);

router.get(
  '/',
  validate(getCustomersSchema),
  customerController.getCustomers
);

router.get(
  '/:id',
  validate(getCustomerByIdSchema),
  customerController.getCustomerById
);

router.get(
  '/:id/history',
  validate(getCustomerByIdSchema),
  customerController.getCustomerHistory
);

router.put(
  '/:id',
  authorize('owner', 'manager', 'developer'),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

module.exports = router;
