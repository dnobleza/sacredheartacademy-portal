const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const asyncHandler = require('../../utils/async-handler');
const parentsController = require('../../controllers/admin/parents-controller');
const { accountCreationLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.post('/', accountCreationLimiter, parentsController.createParent);
router.get('/', asyncHandler(parentsController.listParents));
router.get('/:id', asyncHandler(parentsController.getParentById));
router.put('/:id', parentsController.updateParent);
router.delete('/:id', parentsController.deleteParent);

router.get('/:id/children', asyncHandler(parentsController.listChildren));
router.post('/:id/children', parentsController.linkChild);
router.delete('/:id/children/:studentId', asyncHandler(parentsController.unlinkChild));

module.exports = router;
