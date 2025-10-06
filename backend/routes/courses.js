const express = require("express");
const courseController = require("../controllers/courseController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", courseController.getAllCourses);
router.get("/categories", courseController.getCategories);
router.get("/:id", courseController.getCourseById);

// Instructor routes
router.post(
  "/",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.createCourse
);

router.get(
  "/instructor/my-courses",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.getInstructorCourses
);

router.put(
  "/:id",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.updateCourse
);

router.put(
  "/:id/publish",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.publishCourse
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.deleteCourse
);

// Add this route

module.exports = router;
