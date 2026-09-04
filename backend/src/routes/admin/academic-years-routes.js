const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const academicYearsController = require('../../controllers/admin/academic-years-controller');

const router = express.Router();

// Any admin access level may manage school years; unlike teachers/admins,
// there is no requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', academicYearsController.createAcademicYear);
router.get('/', asyncHandler(academicYearsController.listAcademicYears));
router.get('/:id', asyncHandler(academicYearsController.getAcademicYearById));
router.put('/:id', academicYearsController.updateAcademicYear);
router.delete('/:id', academicYearsController.deleteAcademicYear);

module.exports = router;
