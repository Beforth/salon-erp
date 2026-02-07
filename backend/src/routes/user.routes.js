const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Get all users/staff
router.get(
  '/',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const result = await userService.getUsers(req.query, req.user);
    res.json(result);
  })
);

// Get user by ID
router.get(
  '/:id',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id, req.user);
    res.json({ data: user });
  })
);

// Get user performance
router.get(
  '/:id/performance',
  authenticate,
  asyncHandler(async (req, res) => {
    const period = parseInt(req.query.period) || 30;
    const performance = await userService.getStaffPerformance(req.params.id, period);
    res.json({ data: performance });
  })
);

// Create new user
router.post(
  '/',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body, req.user);
    res.status(201).json({ data: user });
  })
);

// Update user
router.put(
  '/:id',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req.user);
    res.json({ data: user });
  })
);

// Delete user (deactivate)
router.delete(
  '/:id',
  authenticate,
  authorize('owner', 'developer'),
  asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.params.id, req.user);
    res.json(result);
  })
);

module.exports = router;
