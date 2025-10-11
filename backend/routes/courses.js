const express = require("express");
const courseController = require("../controllers/courseController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/categories", courseController.getCategories);
router.get("/", courseController.getAllCourses);
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

router.get("/:id", courseController.getCourseById);

router.get("/pending", async (req, res) => {
  try {
    const courses = await Course.find({ status: "pending" })
      .populate("instructor", "firstName lastName")
      .sort({ createdAt: -1 });
    res.json({ data: courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH approve course
router.patch("/:id/approve", async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    res.json({ data: course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH reject course
router.patch("/:id/reject", async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json({ data: course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
