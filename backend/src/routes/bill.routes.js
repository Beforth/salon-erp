const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createBillSchema,
  updateBillSchema,
  getBillsSchema,
  getBillByIdSchema,
} = require('../validators/bill.validator');

// All routes require authentication
router.use(authenticate);

// CRUD operations
router.post(
  '/',
  authorize('owner', 'manager', 'cashier', 'developer'),
  validate(createBillSchema),
  billController.createBill
);

router.get(
  '/',
  validate(getBillsSchema),
  billController.getBills
);

router.get(
  '/:id',
  validate(getBillByIdSchema),
  billController.getBillById
);

router.put(
  '/:id',
  authorize('owner', 'manager', 'developer'),
  validate(updateBillSchema),
  billController.updateBill
);

router.delete(
  '/:id',
  authorize('owner', 'manager', 'developer'),
  validate(getBillByIdSchema),
  billController.cancelBill
);

module.exports = router;
