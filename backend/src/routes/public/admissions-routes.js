const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const admissionsController = require('../../controllers/public/admissions-controller');
const { admissionLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();








router.post('/', admissionLimiter, asyncHandler(admissionsController.createApplication));
router.get('/grade-levels', asyncHandler(admissionsController.listGradeLevels));

module.exports = router;
