const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createServiceCategorySchema,
  createServiceSchema,
  updateServiceSchema,
  getServicesSchema,
  createPackageSchema,
  updatePackageSchema,
} = require('../validators/service.validator');

// All routes require authentication
router.use(authenticate);

// Service Categories
router.get('/categories', serviceController.getCategories);
router.post(
  '/categories',
  authorize('owner', 'manager', 'developer'),
  validate(createServiceCategorySchema),
  serviceController.createCategory
);

// Services
router.get('/', validate(getServicesSchema), serviceController.getServices);
router.get('/:id', serviceController.getServiceById);
router.post(
  '/',
  authorize('owner', 'manager', 'developer'),
  validate(createServiceSchema),
  serviceController.createService
);
router.put(
  '/:id',
  authorize('owner', 'manager', 'developer'),
  validate(updateServiceSchema),
  serviceController.updateService
);

module.exports = router;
