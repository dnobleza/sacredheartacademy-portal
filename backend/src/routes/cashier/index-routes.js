const express = require('express');
const authenticateToken = require('../../middleware/authenticate-token');
const authorizeRoles = require('../../middleware/authorize-roles');
const requireAccessLevelId = require('../../middleware/require-access-level-id');
const { ACCESS_LEVEL_IDS } = require('../../utils/access-levels');
const asyncHandler = require('../../utils/async-handler');
const dashboardController = require('../../controllers/cashier/dashboard-controller');
const paymentsController = require('../../controllers/cashier/payments-controller');
const sessionsController = require('../../controllers/cashier/sessions-controller');
const reportsController = require('../../controllers/cashier/reports-controller');
const declarationsController = require('../../controllers/shared/declarations-controller');

const router = express.Router();




router.use(
  authenticateToken,
  authorizeRoles('admin'),
  requireAccessLevelId(ACCESS_LEVEL_IDS.CASHIER),
);

router.get('/dashboard', asyncHandler(dashboardController.getDashboard));
router.get('/students/search', asyncHandler(dashboardController.searchStudents));
router.get('/students/:id/account', asyncHandler(dashboardController.getStudentAccount));
router.get('/outstanding', asyncHandler(dashboardController.listOutstanding));

router.get('/payments', asyncHandler(paymentsController.listPayments));
router.get('/payments/:id', asyncHandler(paymentsController.getPaymentById));
router.post('/payments', asyncHandler(paymentsController.createPayment));

router.get('/declarations', asyncHandler(declarationsController.listDeclarations));
router.post('/declarations/:id/confirm', asyncHandler(declarationsController.confirmDeclaration));
router.post('/declarations/:id/reject', asyncHandler(declarationsController.rejectDeclaration));

router.get('/sessions', asyncHandler(sessionsController.listSessions));
router.get('/sessions/current', asyncHandler(sessionsController.getCurrentSession));
router.post('/sessions/open', asyncHandler(sessionsController.openSession));
router.post('/sessions/close', asyncHandler(sessionsController.closeSession));

router.get('/reports/daily', asyncHandler(reportsController.dailyReport));
router.get('/reports/monthly', asyncHandler(reportsController.monthlyReport));
router.get('/reports/summary', asyncHandler(reportsController.collectionSummary));

module.exports = router;
