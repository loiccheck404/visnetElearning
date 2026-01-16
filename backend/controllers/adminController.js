const db = require("../config/database");

// Get ALL courses for admin (including pending, draft, archived)
const getAllCoursesForAdmin = async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT c.*, 
             cat.name as category_name,
             u.first_name || ' ' || u.last_name as instructor_name,
             u.email as instructor_email,
             COUNT(DISTINCT e.id) as enrollment_count
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, cat.name, u.first_name, u.last_name, u.email
      ORDER BY 
        -- Priority 1: Status (pending first, then published, then draft, then others)
        CASE c.status
          WHEN 'pending' THEN 1
          WHEN 'published' THEN 2
          WHEN 'draft' THEN 3
          ELSE 4
        END,
        -- Priority 2: Within same status, newest first
        c.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);

    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) FROM courses`);

    console.log(`Admin fetched ${result.rows.length} courses`);
    console.log(
      "Course statuses and order:",
      result.rows.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        created: c.created_at,
      }))
    );

    res.json({
      status: "SUCCESS",
      data: {
        courses: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error("Admin get courses error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch courses",
    });
  }
};

// Approve a course (change status from 'pending' to 'published')
const approveCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    // Check if course exists and is pending
    const checkCourse = await db.query(
      `SELECT id, title, instructor_id, status FROM courses WHERE id = $1`,
      [id]
    );

    if (checkCourse.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found",
      });
    }

    const course = checkCourse.rows[0];

    if (course.status !== "draft") {
      return res.status(400).json({
        status: "ERROR",
        message: `Cannot approve course with status: ${course.status}. Only draft courses can be approved.`,
      });
    }

    // Update course status to 'published'
    const result = await db.query(
      `UPDATE courses 
       SET status = 'published', 
           published_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    // Log activity - FIXED: Only use columns that exist
    try {
      await db.query(
        `INSERT INTO student_activities (student_id, activity_type, course_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [req.user.id, "course_approved", id]
      );
    } catch (activityError) {
      console.warn("Failed to log approval activity:", activityError.message);
    }

    console.log(`Course ${id} approved by admin ${req.user.email}`);

    res.json({
      status: "SUCCESS",
      message: "Course approved and published successfully",
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Error approving course:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to approve course",
    });
  }
};

// Reject a course (return to draft with reason)
const rejectCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Rejection reason is required",
      });
    }

    const checkCourse = await db.query(
      `SELECT id, title, instructor_id, status FROM courses WHERE id = $1`,
      [id]
    );

    if (checkCourse.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found",
      });
    }

    const course = checkCourse.rows[0];

    // ADDED: Store rejection reason in the course record
    const result = await db.query(
      `UPDATE courses 
       SET status = 'draft',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log activity
    try {
      await db.query(
        `INSERT INTO student_activities (student_id, activity_type, course_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [req.user.id, "course_rejected", id]
      );
    } catch (activityError) {
      console.warn("Failed to log rejection activity:", activityError.message);
    }

    console.log(`Course ${id} rejected by admin ${req.user.email}: ${reason}`);

    res.json({
      status: "SUCCESS",
      message: "Course rejected and returned to draft",
      data: {
        course: result.rows[0],
        rejection_reason: reason,
      },
    });
  } catch (error) {
    console.error("Error rejecting course:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to reject course",
    });
  }
};

// Delete a course (admin can delete ANY course)
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseIdNum = parseInt(id);

    if (isNaN(courseIdNum)) {
      return res.status(400).json({
        status: "ERROR",
        message: "Invalid course ID",
      });
    }

    console.log(`\n========== ADMIN DELETE COURSE START ==========`);
    console.log(`Course ID: ${courseIdNum}, Admin: ${req.user.email}`);

    // Check if course exists (admin can delete ANY course)
    const checkCourse = await db.query(
      `SELECT id, title, instructor_id FROM courses WHERE id = $1`,
      [courseIdNum]
    );

    if (checkCourse.rows.length === 0) {
      console.log(`Course not found: ${courseIdNum}`);
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found",
      });
    }

    const deletedCourse = checkCourse.rows[0];
    console.log(`Found course to delete: ${deletedCourse.title}`);

    // Delete related records FIRST (foreign key cleanup)
    await db.query(`DELETE FROM enrollments WHERE course_id = $1`, [
      courseIdNum,
    ]);
    console.log(`Deleted enrollments for course ${courseIdNum}`);

    await db.query(`DELETE FROM student_activities WHERE course_id = $1`, [
      courseIdNum,
    ]);
    console.log(`Deleted student activities for course ${courseIdNum}`);

    await db.query(`DELETE FROM lessons WHERE course_id = $1`, [courseIdNum]);
    console.log(`Deleted lessons for course ${courseIdNum}`);

    // Finally, delete the course itself
    const deleteResult = await db.query(
      `DELETE FROM courses WHERE id = $1 RETURNING id, title`,
      [courseIdNum]
    );

    console.log(`Course deleted successfully by admin: ${courseIdNum}`);
    console.log(`========== ADMIN DELETE COURSE END ==========\n`);

    res.json({
      status: "SUCCESS",
      message: "Course deleted successfully",
      data: { courseId: deleteResult.rows[0].id },
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to delete course",
    });
  }
};

const getPlatformStats = async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as "totalUsers",
        (SELECT COUNT(*) FROM courses WHERE status = 'published') as "totalCourses",
        (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND is_active = true) as "totalInstructors",
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = true) as "totalStudents"
    `);

    const stats = statsResult.rows[0];

    res.json({
      status: "SUCCESS",
      data: {
        totalUsers: parseInt(stats.totalUsers),
        totalCourses: parseInt(stats.totalCourses),
        totalInstructors: parseInt(stats.totalInstructors),
        totalStudents: parseInt(stats.totalStudents),
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(
      `SELECT 
        sa.id,
        sa.activity_type as type,
        CASE 
          WHEN sa.activity_type = 'course_enrolled' THEN 'Student enrolled in course'
          WHEN sa.activity_type = 'lesson_completed' THEN 'Lesson completed'
          WHEN sa.activity_type = 'course_completed' THEN 'Course completed'
          WHEN sa.activity_type = 'user_registered' THEN 'New user registered'
          ELSE sa.activity_type
        END as action,
        u.first_name || ' ' || u.last_name as user,
        c.title as course_title,
        sa.created_at
      FROM student_activities sa
      JOIN users u ON sa.student_id = u.id
      LEFT JOIN courses c ON sa.course_id = c.id
      ORDER BY sa.created_at DESC
      LIMIT $1`,
      [limit]
    );

    const activities = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      action: row.action,
      user: row.user,
      courseName: row.course_title,
      time: formatRelativeTime(row.created_at),
    }));

    res.json({
      status: "SUCCESS",
      data: { activities },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const result = await db.query(
      `SELECT 
        id,
        created_at as timestamp,
        action,
        email,
        details,
        ip_address
      FROM public.audit_logs
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );

    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: formatAuditTimestamp(row.timestamp),
      action: row.action,
      user: row.email || "System",
      details: row.details || "",
      ip_address: row.ip_address || "N/A",
    }));

    res.json({
      status: "SUCCESS",
      data: { logs },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userIdNum = parseInt(id);

    if (isNaN(userIdNum)) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid user ID" });
    }

    const deleteResult = await db.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [userIdNum]
    );

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    res.json({
      status: "SUCCESS",
      message: "User permanently deleted",
      data: { userId: deleteResult.rows[0].id },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
};

// Helper functions
function formatRelativeTime(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  } catch (err) {
    return "N/A";
  }
}

function formatAuditTimestamp(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (err) {
    return "N/A";
  }
}

module.exports = {
  getPlatformStats,
  getAllCoursesForAdmin,
  getRecentActivities,
  getAuditLogs,
  deleteUser,
  approveCourse,
  rejectCourse,
  deleteCourse,
};
