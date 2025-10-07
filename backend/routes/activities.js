const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Get student's recent activities
router.get("/my-activities", activityController.getStudentActivities);

// Get activities for a specific course
router.get("/courses/:courseId", activityController.getCourseActivities);

// Get activity statistics
router.get("/stats", activityController.getActivityStats);

module.exports = router;
