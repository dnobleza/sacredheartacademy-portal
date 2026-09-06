const express = require('express');
const asyncHandler = require('../../utils/async-handler');
const dashboardController = require('../../controllers/students/dashboard-controller');
const academicsController = require('../../controllers/students/academics-controller');

const router = express.Router();




router.get('/dashboard', asyncHandler(dashboardController.getDashboard));




router.get('/profile', asyncHandler(academicsController.getProfile));
router.get('/classes', asyncHandler(academicsController.listClasses));
router.get('/schedule', asyncHandler(academicsController.getSchedule));
router.get('/grades', asyncHandler(academicsController.listGrades));
router.get('/attendance', asyncHandler(academicsController.listAttendance));

module.exports = router;
