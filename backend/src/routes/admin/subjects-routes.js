const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const subjectsController = require('../../controllers/admin/subjects-controller');

const router = express.Router();

// Any admin access level may manage subjects; unlike admin accounts, there is
// no requireMinAccessLevel gate here.
router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', subjectsController.createSubject);
router.get('/', asyncHandler(subjectsController.listSubjects));
router.get('/:id', asyncHandler(subjectsController.getSubjectById));
router.put('/:id', subjectsController.updateSubject);
router.delete('/:id', subjectsController.deleteSubject);

module.exports = router;
