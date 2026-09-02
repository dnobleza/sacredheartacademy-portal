const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const studentsController = require('../../controllers/admin/students-controller');
const { accountCreationLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', accountCreationLimiter, studentsController.createStudent);
router.get('/', asyncHandler(studentsController.listStudents));
router.get('/:id', asyncHandler(studentsController.getStudentById));
router.put('/:id', studentsController.updateStudent);
router.delete('/:id', studentsController.deleteStudent);

module.exports = router;
