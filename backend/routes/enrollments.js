const express = require("express");
const router = express.Router();
const enrollmentController = require("../controllers/enrollmentController");
const { authenticate } = require("../middleware/auth");

// All routes require authentication
router.use(authenticate);

// Get my enrollments
router.get("/my-courses", enrollmentController.getMyEnrollments);

// Check enrollment status
router.get("/check/:courseId", enrollmentController.checkEnrollment);

// Enroll in a course
router.post("/:courseId", enrollmentController.enrollInCourse);

// Unenroll from a course
router.delete("/:courseId", enrollmentController.unenrollFromCourse);

module.exports = router;
