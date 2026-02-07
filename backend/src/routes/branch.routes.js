const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branch.controller');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', branchController.getBranches);
router.get('/:id', branchController.getBranchById);
router.get('/:id/employees', branchController.getBranchEmployees);
router.get('/:id/chairs', branchController.getBranchChairs);
router.post('/', authorize('owner', 'developer'), branchController.createBranch);
router.put('/:id', authorize('owner', 'developer'), branchController.updateBranch);

module.exports = router;
