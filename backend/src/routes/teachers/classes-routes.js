const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const classesController = require('../../controllers/teachers/classes-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('teacher'));

router.get('/', asyncHandler(classesController.listClasses));
router.get('/sections/:sectionId/students', asyncHandler(classesController.getSectionRoster));

module.exports = router;
