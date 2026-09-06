const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const admissionsController = require('../../controllers/public/admissions-controller');
const { admissionLimiter, admissionLookupLimiter } = require('../../middleware/rate-limiters');
const { uploadDocuments } = require('../../middleware/upload');
const { DOCUMENT_TYPES } = require('../../validations/admission-validation');

const router = express.Router();




router.post(
  '/',
  admissionLimiter,
  uploadDocuments(DOCUMENT_TYPES),
  asyncHandler(admissionsController.createApplication),
);




router.get('/status', admissionLookupLimiter, asyncHandler(admissionsController.getApplicationStatus));




router.post(
  '/:reference/resubmit',
  admissionLimiter,
  uploadDocuments(DOCUMENT_TYPES),
  asyncHandler(admissionsController.resubmitApplication),
);

router.get('/academic-years', asyncHandler(admissionsController.listAcademicYears));
router.get('/grade-levels', asyncHandler(admissionsController.listGradeLevels));

module.exports = router;
