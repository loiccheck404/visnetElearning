const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { authenticate, requireRole } = require("../middleware/auth");

// All routes require authentication and instructor role
router.use(authenticate);
router.use(requireRole(["instructor", "admin"]));

// Get all students enrolled in instructor's courses
router.get("/", studentController.getInstructorStudents);

// Get specific student details for a course
router.get("/:studentId/course/:courseId", studentController.getStudentDetails);

module.exports = router;
