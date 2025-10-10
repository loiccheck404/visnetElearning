const db = require("../config/database");

// Log a new activity
const logActivity = async (
  studentId,
  courseId,
  activityType,
  lessonId = null,
  metadata = null
) => {
  try {
    const query = `
      INSERT INTO student_activities (student_id, course_id, activity_type, lesson_id, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await db.query(query, [
      studentId,
      courseId,
      activityType,
      lessonId,
      metadata,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error logging activity:", error);
    throw error;
  }
};

// Get student's recent activities
const getStudentActivities = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        sa.id,
        sa.activity_type,
        sa.created_at,
        sa.metadata,
        c.title as course_title,
        c.id as course_id,
        l.title as lesson_title
      FROM student_activities sa
      JOIN courses c ON sa.course_id = c.id
      LEFT JOIN lessons l ON sa.lesson_id = l.id
      WHERE sa.student_id = $1
      ORDER BY sa.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [studentId, limit]);

    res.json({
      status: "SUCCESS",
      data: {
        activities: result.rows,
      },
    });
  } catch (error) {
    console.error("Get student activities error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch activities",
    });
  }
};

// Get course-specific activities
const getCourseActivities = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;
    const { limit = 20 } = req.query;

    const query = `
      SELECT 
        sa.id,
        sa.activity_type,
        sa.created_at,
        sa.metadata,
        l.title as lesson_title
      FROM student_activities sa
      LEFT JOIN lessons l ON sa.lesson_id = l.id
      WHERE sa.student_id = $1 AND sa.course_id = $2
      ORDER BY sa.created_at DESC
      LIMIT $3
    `;

    const result = await db.query(query, [studentId, courseId, limit]);

    res.json({
      status: "SUCCESS",
      data: {
        activities: result.rows,
      },
    });
  } catch (error) {
    console.error("Get course activities error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch course activities",
    });
  }
};

// Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { period = "30" } = req.query; // days

    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        DATE(created_at) as activity_date
      FROM student_activities
      WHERE student_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
      GROUP BY activity_type, DATE(created_at)
      ORDER BY activity_date DESC
    `;

    const result = await db.query(query, [studentId]);

    res.json({
      status: "SUCCESS",
      data: {
        statistics: result.rows,
      },
    });
  } catch (error) {
    console.error("Get activity stats error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch activity statistics",
    });
  }
};

// Get instructor activities (enrollments, questions, completions, unenrollments in their courses)
const getInstructorActivities = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { limit = 20 } = req.query;

    const query = `
      SELECT 
        sa.id,
        sa.activity_type,
        sa.created_at,
        c.title as course_title,
        c.id as course_id,
        u.first_name || ' ' || u.last_name as student_name,
        u.id as student_id
      FROM student_activities sa
      JOIN courses c ON sa.course_id = c.id
      JOIN users u ON sa.student_id = u.id
      WHERE c.instructor_id = $1
        AND sa.activity_type IN (
          'course_enrolled', 
          'lesson_completed', 
          'course_completed', 
          'quiz_completed',
          'course_unenrolled',
          'quiz_started',
          'lesson_started'
        )
      ORDER BY sa.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [instructorId, limit]);

    res.json({
      status: "SUCCESS",
      data: {
        activities: result.rows,
      },
    });
  } catch (error) {
    console.error("Get instructor activities error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch activities",
    });
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "ERROR",
        message: "No file uploaded",
      });
    }

    const userId = req.user.id;
    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user's avatar_url in database
    const result = await db.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING avatar_url`,
      [profilePictureUrl, userId]
    );

    res.json({
      status: "SUCCESS",
      message: "Profile picture uploaded successfully",
      data: {
        profilePictureUrl: result.rows[0].avatar_url,
      },
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to upload profile picture",
    });
  }
};

module.exports = {
  logActivity,
  getStudentActivities,
  getCourseActivities,
  getActivityStats,
  getInstructorActivities,
  uploadProfilePicture,
};
