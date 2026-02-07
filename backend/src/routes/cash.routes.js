const express = require('express');
const router = express.Router();
const cashService = require('../services/cash.service');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Get daily cash summary
router.get(
  '/summary',
  authenticate,
  authorize('owner', 'developer', 'manager', 'cashier'),
  asyncHandler(async (req, res) => {
    const { date, branch_id } = req.query;
    const branchId = branch_id || req.user.branchId;
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!branchId) {
      return res.status(400).json({
        error: { message: 'Branch ID is required', code: 'MISSING_BRANCH' },
      });
    }

    const summary = await cashService.getDailyCashSummary(targetDate, branchId, req.user.userId);
    res.json({ data: summary });
  })
);

// Record cash count (reconciliation)
router.post(
  '/reconcile',
  authenticate,
  authorize('owner', 'developer', 'manager', 'cashier'),
  asyncHandler(async (req, res) => {
    const result = await cashService.recordCashCount(req.body, req.user.userId);
    res.status(201).json({ data: result });
  })
);

// Add cash source
router.post(
  '/sources',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const result = await cashService.addCashSource(req.body, req.user.userId);
    res.status(201).json({ data: result });
  })
);

// Record bank deposit
router.post(
  '/deposits',
  authenticate,
  authorize('owner', 'developer', 'manager', 'cashier'),
  asyncHandler(async (req, res) => {
    const result = await cashService.recordBankDeposit(req.body, req.user.userId);
    res.status(201).json({ data: result });
  })
);

// Get cash history
router.get(
  '/history',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const { branch_id, start_date, end_date } = req.query;
    const branchId = branch_id || req.user.branchId;

    if (!branchId) {
      return res.status(400).json({
        error: { message: 'Branch ID is required', code: 'MISSING_BRANCH' },
      });
    }

    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const history = await cashService.getCashHistory(branchId, startDate, endDate);
    res.json({ data: history });
  })
);

module.exports = router;
