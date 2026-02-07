const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createPackageSchema,
  updatePackageSchema,
} = require('../validators/service.validator');

// All routes require authentication
router.use(authenticate);

// Packages
router.get('/', serviceController.getPackages);
router.get('/:id', serviceController.getPackageById);
router.post(
  '/',
  authorize('owner', 'manager', 'developer'),
  validate(createPackageSchema),
  serviceController.createPackage
);
router.put(
  '/:id',
  authorize('owner', 'manager', 'developer'),
  validate(updatePackageSchema),
  serviceController.updatePackage
);

module.exports = router;
