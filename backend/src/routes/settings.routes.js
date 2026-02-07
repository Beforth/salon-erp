const express = require('express');
const router = express.Router();
const settingsService = require('../services/settings.service');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Get all settings
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const publicOnly = !['owner', 'developer', 'manager'].includes(req.user.role);
    const settings = await settingsService.getSettings(publicOnly);
    res.json({ data: settings });
  })
);

// Get single setting
router.get(
  '/:key',
  authenticate,
  asyncHandler(async (req, res) => {
    const setting = await settingsService.getSetting(req.params.key);
    if (!setting) {
      return res.status(404).json({
        error: { message: 'Setting not found', code: 'NOT_FOUND' },
      });
    }
    res.json({ data: setting });
  })
);

// Update settings (bulk)
router.put(
  '/',
  authenticate,
  authorize('owner', 'developer'),
  asyncHandler(async (req, res) => {
    const settings = await settingsService.updateSettings(req.body, req.user.userId);
    res.json({ data: settings });
  })
);

// Update single setting
router.put(
  '/:key',
  authenticate,
  authorize('owner', 'developer'),
  asyncHandler(async (req, res) => {
    const { value } = req.body;
    const setting = await settingsService.updateSetting(req.params.key, value, req.user.userId);
    res.json({ data: setting });
  })
);

// Reset settings to defaults
router.post(
  '/reset',
  authenticate,
  authorize('owner', 'developer'),
  asyncHandler(async (req, res) => {
    const settings = await settingsService.resetSettings(req.user.userId);
    res.json({ data: settings, message: 'Settings reset to defaults' });
  })
);

// Get branch features
router.get(
  '/branch/:branchId/features',
  authenticate,
  authorize('owner', 'developer', 'manager'),
  asyncHandler(async (req, res) => {
    const features = await settingsService.getBranchFeatures(req.params.branchId);
    res.json({ data: features });
  })
);

// Update branch feature
router.put(
  '/branch/:branchId/features/:featureId',
  authenticate,
  authorize('owner', 'developer'),
  asyncHandler(async (req, res) => {
    const { is_enabled } = req.body;
    const feature = await settingsService.updateBranchFeature(
      req.params.branchId,
      req.params.featureId,
      is_enabled
    );
    res.json({ data: feature });
  })
);

module.exports = router;
