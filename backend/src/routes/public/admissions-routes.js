const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const admissionsController = require('../../controllers/public/admissions-controller');
const { admissionLimiter } = require('../../middleware/rate-limiters');

const router = express.Router();

// SECURITY: no authenticateToken here on purpose — a prospective family has no
// account yet. That makes this the only unauthenticated write in the app, so:
//   - POST / is the ONLY write, rate limited per address.
//   - There is deliberately no GET /:id and no listing. Submissions are read
//     from /admin/admissions, by an authenticated admin, and nowhere else.
//   - GET /grade-levels returns names only, which the programmes page already
//     shows publicly, and the form cannot be filled in without them.
router.post('/', admissionLimiter, asyncHandler(admissionsController.createApplication));
router.get('/grade-levels', asyncHandler(admissionsController.listGradeLevels));

module.exports = router;
