const express = require("express");
const db = require("../config/database");
const router = express.Router();

// GET platform statistics
router.get("/stats", async (req, res) => {
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
});

// GET recent activities - INCLUDES user registration
router.get("/activities", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(
      `
      SELECT 
        sa.id,
        sa.activity_type as type,
        CASE 
          WHEN sa.activity_type = 'course_enrolled' THEN 'Student enrolled in course'
          WHEN sa.activity_type = 'lesson_completed' THEN 'Lesson completed'
          WHEN sa.activity_type = 'course_completed' THEN 'Course completed'
          WHEN sa.activity_type = 'course_unenrolled' THEN 'Student unenrolled'
          WHEN sa.activity_type = 'lesson_started' THEN 'Lesson started'
          WHEN sa.activity_type = 'quiz_started' THEN 'Quiz started'
          WHEN sa.activity_type = 'quiz_completed' THEN 'Quiz completed'
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
      LIMIT $1
    `,
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
      data: {
        activities: activities,
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// GET audit logs - FIXED VERSION
router.get("/audit-logs", async (req, res) => {
  try {
    console.log("\n========== AUDIT LOGS ENDPOINT ==========");
    const limit = parseInt(req.query.limit) || 50;
    console.log("Request limit:", limit);

    // Query from public schema explicitly
    console.log("Querying public.audit_logs...");
    const result = await db.query(
      `SELECT 
        id,
        created_at as timestamp,
        action,
        user_id,
        email,
        details,
        ip_address
      FROM public.audit_logs
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );

    console.log("Query successful!");
    console.log("Rows returned:", result.rows.length);

    if (result.rows.length > 0) {
      console.log("First row:", JSON.stringify(result.rows[0]));
    }

    const logs = result.rows.map((row) => ({
      id: row.id,
      timestamp: formatAuditTimestamp(row.timestamp),
      action: row.action,
      user: row.email || "System",
      details: row.details || "",
      ip_address: row.ip_address || "N/A",
    }));

    console.log("Mapped logs count:", logs.length);
    console.log("========== END AUDIT LOGS ==========\n");

    res.json({
      status: "SUCCESS",
      data: {
        logs: logs,
      },
    });
  } catch (error) {
    console.error("\n========== ERROR IN AUDIT LOGS ==========");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    console.error("========== END ERROR ==========\n");
    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  }
});

// DELETE user - HARD DELETE
router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid user ID" });
    }

    // Hard delete: Remove user completely
    const deleteResult = await db.query(
      `DELETE FROM users WHERE id = $1 RETURNING id`,
      [userIdNum]
    );

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    // Log the action
    await logAuditAction(
      "system",
      "user_deleted",
      `User ID ${userIdNum} permanently deleted`
    );

    res.json({
      status: "SUCCESS",
      message: "User permanently deleted",
      data: { userId: deleteResult.rows[0].id },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// DELETE course - HARD DELETE
router.delete("/courses/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const courseIdNum = parseInt(courseId);

    if (isNaN(courseIdNum)) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid course ID" });
    }

    // Hard delete: Remove course completely
    const deleteResult = await db.query(
      `DELETE FROM courses WHERE id = $1 RETURNING id, title`,
      [courseIdNum]
    );

    if (deleteResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Course not found" });
    }

    // Log the action
    await logAuditAction(
      "system",
      "course_deleted",
      `Course "${deleteResult.rows[0].title}" (ID ${courseIdNum}) permanently deleted`
    );

    res.json({
      status: "SUCCESS",
      message: "Course permanently deleted",
      data: { courseId: deleteResult.rows[0].id },
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// Helper function to log audit actions
async function logAuditAction(
  email,
  action,
  details,
  ip_address = "127.0.0.1"
) {
  try {
    await db.query(
      `INSERT INTO public.audit_logs (email, action, details, ip_address) 
       VALUES ($1, $2, $3, $4)`,
      [email, action, details, ip_address]
    );
  } catch (error) {
    console.error("Error logging audit action:", error);
  }
}

// Helper function to format relative time
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

// Helper function to format audit log timestamp (full datetime)
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

module.exports = router;
