const express = require("express");
const courseController = require("../controllers/courseController");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/categories", courseController.getCategories);
router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);

// Instructor routes (create course)
router.post(
  "/",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.createCourse
);

// Get instructor's courses
router.get(
  "/instructor/my-courses",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.getInstructorCourses
);

// Update course
router.put(
  "/:id",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.updateCourse
);

// Publish course
router.put(
  "/:id/publish",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.publishCourse
);

// Approve course (admin only)
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const db = require("../config/database");
      const { id } = req.params;

      const result = await db.query(
        `UPDATE courses SET status = 'published', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "ERROR",
          message: "Course not found",
        });
      }

      res.json({
        status: "SUCCESS",
        message: "Course approved",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error approving course:", error);
      res.status(500).json({
        status: "ERROR",
        message: error.message,
      });
    }
  }
);

// Reject course (admin only)
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const db = require("../config/database");
      const { id } = req.params;

      const result = await db.query(
        `UPDATE courses SET status = 'archived', updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "ERROR",
          message: "Course not found",
        });
      }

      res.json({
        status: "SUCCESS",
        message: "Course rejected",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error rejecting course:", error);
      res.status(500).json({
        status: "ERROR",
        message: error.message,
      });
    }
  }
);

// Delete course
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["instructor", "admin"]),
  courseController.deleteCourse
);

module.exports = router;
