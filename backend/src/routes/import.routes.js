const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/import.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Upload CSV and get preview
router.post(
  '/upload',
  authorize('owner', 'developer', 'manager'),
  upload.single('file'),
  importController.uploadCSV
);

// Validate import data
router.post(
  '/validate',
  authorize('owner', 'developer', 'manager'),
  importController.validateImport
);

// Import bills
router.post(
  '/bills',
  authorize('owner', 'developer', 'manager'),
  importController.importBills
);

module.exports = router;
