const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const imagesController = require('../../controllers/shared/images-controller');
const authenticateToken = require('../../middleware/authenticate-token');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();

// No authorizeRoles here on purpose, same reasoning as messages-routes.js:
// every role (admin, teacher, student, parent) needs to be able to upload
// and view a picture once their portals exist, so this is not role-gated.
// Per-image write access (delete) is enforced inside the controller instead
// — uploader or admin only.
router.use(authenticateToken);

router.post('/', uploadImage('image'), asyncHandler(imagesController.createImage));
router.get('/:id', asyncHandler(imagesController.getImageById));
router.delete('/:id', asyncHandler(imagesController.deleteImage));

module.exports = router;
