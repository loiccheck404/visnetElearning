const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progressController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Get all student's progress
router.get("/my-progress", progressController.getStudentProgress);

// Get progress for specific course
router.get("/courses/:courseId", progressController.getCourseProgress);

// Mark lesson as complete
router.post(
  "/courses/:courseId/lessons/:lessonId/complete",
  progressController.markLessonComplete
);

// Update time spent on lesson
router.post(
  "/courses/:courseId/lessons/:lessonId/time",
  progressController.updateLessonTime
);

module.exports = router;
