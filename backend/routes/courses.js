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

// Approve course (admin only) - Improved with notification
router.patch(
  "/:id/approve",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const db = require("../config/database");
      const { id } = req.params;
      const { feedback } = req.body; // Optional approval message

      // Get course details
      const courseResult = await db.query(
        `SELECT c.*, u.email as instructor_email, u.first_name, u.last_name
         FROM courses c
         JOIN users u ON c.instructor_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          status: "ERROR",
          message: "Course not found",
        });
      }

      const course = courseResult.rows[0];

      // Update course status to published
      await db.query(
        `UPDATE courses 
         SET status = 'published', 
             published_at = NOW(),
             updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      // Log approval activity
      await db.query(
        `INSERT INTO student_activities (
          student_id, activity_type, activity_data, course_id
        ) VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          "course_approved",
          JSON.stringify({
            title: course.title,
            approved_by: `${req.user.firstName} ${req.user.lastName}`,
            feedback: feedback || "Course approved",
          }),
          id,
        ]
      );

      // Create notification for instructor
      await db.query(
        `INSERT INTO student_activities (
          student_id, activity_type, activity_data, course_id
        ) VALUES ($1, $2, $3, $4)`,
        [
          course.instructor_id,
          "course_status_notification",
          JSON.stringify({
            title: course.title,
            status: "approved",
            message:
              feedback ||
              `Your course "${course.title}" has been approved and is now published!`,
          }),
          id,
        ]
      );

      res.json({
        status: "SUCCESS",
        message: "Course approved and published",
        data: {
          courseId: id,
          status: "published",
        },
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

// Reject course (admin only) - Returns to draft for revision
router.patch(
  "/:id/reject",
  authenticateToken,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const db = require("../config/database");
      const { id } = req.params;
      const { reason } = req.body; // Rejection reason (required)

      if (!reason) {
        return res.status(400).json({
          status: "ERROR",
          message: "Rejection reason is required",
        });
      }

      // Get course details
      const courseResult = await db.query(
        `SELECT c.*, u.email as instructor_email, u.first_name, u.last_name
         FROM courses c
         JOIN users u ON c.instructor_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          status: "ERROR",
          message: "Course not found",
        });
      }

      const course = courseResult.rows[0];

      // Set status back to 'draft' so instructor can revise
      await db.query(
        `UPDATE courses 
         SET status = 'draft', 
             updated_at = NOW() 
         WHERE id = $1`,
        [id]
      );

      // Log rejection activity
      await db.query(
        `INSERT INTO student_activities (
          student_id, activity_type, activity_data, course_id
        ) VALUES ($1, $2, $3, $4)`,
        [
          req.user.id,
          "course_rejected",
          JSON.stringify({
            title: course.title,
            rejected_by: `${req.user.firstName} ${req.user.lastName}`,
            reason: reason,
          }),
          id,
        ]
      );

      // Create notification for instructor
      await db.query(
        `INSERT INTO student_activities (
          student_id, activity_type, activity_data, course_id
        ) VALUES ($1, $2, $3, $4)`,
        [
          course.instructor_id,
          "course_status_notification",
          JSON.stringify({
            title: course.title,
            status: "rejected",
            message: `Your course "${course.title}" needs revision. Reason: ${reason}`,
          }),
          id,
        ]
      );

      res.json({
        status: "SUCCESS",
        message: "Course returned to draft for revision",
        data: {
          courseId: id,
          status: "draft",
          reason: reason,
        },
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
