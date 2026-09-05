const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const imagesController = require('../../controllers/shared/images-controller');
const authenticateToken = require('../../middleware/authenticate-token');
const { uploadImage } = require('../../middleware/upload');

const router = express.Router();






router.use(authenticateToken);

router.post('/', uploadImage('image'), asyncHandler(imagesController.createImage));
router.get('/:id', asyncHandler(imagesController.getImageById));
router.delete('/:id', asyncHandler(imagesController.deleteImage));

module.exports = router;
