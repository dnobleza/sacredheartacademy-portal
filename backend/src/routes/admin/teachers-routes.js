const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const teachersController = require('../../controllers/admin/teachers-controller');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', teachersController.createTeacher);
router.get('/', asyncHandler(teachersController.listTeachers));
router.get('/:id', asyncHandler(teachersController.getTeacherById));
router.put('/:id', teachersController.updateTeacher);

module.exports = router;
