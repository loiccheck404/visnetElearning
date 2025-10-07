const db = require("../config/database");

// Helper function to log activity
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
    `;
    await db.query(query, [
      studentId,
      courseId,
      activityType,
      lessonId,
      metadata,
    ]);
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};

// Get student's progress for all courses with learning time
const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all enrolled courses with progress and time spent
    const query = `
      SELECT 
        c.id, c.title, c.thumbnail_url, c.level,
        cat.name as category_name,
        u.first_name || ' ' || u.last_name as instructor_name,
        e.progress, e.enrolled_at, e.last_accessed_at,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT lp.id) FILTER (WHERE lp.is_completed = true) as completed_lessons,
        COALESCE(SUM(lp.time_spent_seconds), 0) as total_time_seconds
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = e.id
      WHERE e.student_id = $1
      GROUP BY c.id, cat.name, u.first_name, u.last_name, e.id
      ORDER BY e.last_accessed_at DESC
    `;

    const result = await db.query(query, [studentId]);

    // Calculate total learning time across all courses
    const totalTimeSeconds = result.rows.reduce(
      (sum, course) => sum + parseInt(course.total_time_seconds || 0),
      0
    );
    const totalHours = Math.floor(totalTimeSeconds / 3600);
    const totalMinutes = Math.floor((totalTimeSeconds % 3600) / 60);

    res.json({
      status: "SUCCESS",
      data: {
        courses: result.rows,
        totalLearningTime: {
          seconds: totalTimeSeconds,
          formatted:
            totalHours > 0
              ? `${totalHours}h ${totalMinutes}m`
              : `${totalMinutes}m`,
        },
      },
    });
  } catch (error) {
    console.error("Get student progress error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch progress",
    });
  }
};

// Get progress for specific course
const getCourseProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    // Get enrollment
    const enrollmentQuery = `
      SELECT id, progress, enrolled_at, last_accessed_at
      FROM enrollments
      WHERE student_id = $1 AND course_id = $2
    `;
    const enrollment = await db.query(enrollmentQuery, [studentId, courseId]);

    if (enrollment.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Not enrolled in this course",
      });
    }

    // Get all lessons for the course with progress
    const lessonsQuery = `
      SELECT l.id, l.title, l.duration_minutes, l.order_index,
             lp.is_completed, lp.completed_at, lp.time_spent_seconds
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id 
        AND lp.enrollment_id = $1
      WHERE l.course_id = $2
      ORDER BY l.order_index
    `;
    const lessons = await db.query(lessonsQuery, [
      enrollment.rows[0].id,
      courseId,
    ]);

    res.json({
      status: "SUCCESS",
      data: {
        enrollment: enrollment.rows[0],
        lessons: lessons.rows,
        totalLessons: lessons.rows.length,
        completedLessons: lessons.rows.filter((l) => l.is_completed).length,
      },
    });
  } catch (error) {
    console.error("Get course progress error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch progress",
    });
  }
};

// Mark lesson as complete with activity logging
const markLessonComplete = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId, lessonId } = req.params;
    const { timeSpent = 0 } = req.body; // in seconds

    // Get enrollment ID
    const enrollmentQuery = `
      SELECT id FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const enrollment = await db.query(enrollmentQuery, [studentId, courseId]);

    if (enrollment.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Not enrolled in this course",
      });
    }

    const enrollmentId = enrollment.rows[0].id;

    // Insert or update lesson progress
    const progressQuery = `
      INSERT INTO lesson_progress (enrollment_id, lesson_id, is_completed, completed_at, time_spent_seconds)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (enrollment_id, lesson_id) 
      DO UPDATE SET 
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        time_spent_seconds = lesson_progress.time_spent_seconds + $3
      RETURNING *
    `;
    await db.query(progressQuery, [enrollmentId, lessonId, timeSpent]);

    // Log activity
    await logActivity(studentId, courseId, "lesson_completed", lessonId, {
      time_spent_seconds: timeSpent,
    });

    // Update enrollment progress percentage
    const updateProgressQuery = `
      WITH progress_calc AS (
        SELECT 
          COUNT(*) FILTER (WHERE lp.is_completed = true) * 100.0 / NULLIF(COUNT(*), 0) as progress_pct
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = $1
        WHERE l.course_id = $2
      )
      UPDATE enrollments
      SET progress = COALESCE((SELECT progress_pct FROM progress_calc), 0),
          last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING progress
    `;
    const result = await db.query(updateProgressQuery, [
      enrollmentId,
      courseId,
    ]);

    // Check if course is now complete (100% progress)
    if (result.rows[0].progress >= 100) {
      await logActivity(studentId, courseId, "course_completed", null, {
        completion_date: new Date().toISOString(),
      });

      // Update enrollment completion date
      await db.query(
        `UPDATE enrollments SET completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [enrollmentId]
      );
    }

    res.json({
      status: "SUCCESS",
      message: "Lesson marked as complete",
      data: {
        progress: result.rows[0].progress,
      },
    });
  } catch (error) {
    console.error("Mark lesson complete error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to update progress",
    });
  }
};

// Update time spent on a lesson (without marking complete)
const updateLessonTime = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId, lessonId } = req.params;
    const { timeSpent } = req.body;

    const enrollmentQuery = `
      SELECT id FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const enrollment = await db.query(enrollmentQuery, [studentId, courseId]);

    if (enrollment.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Not enrolled in this course",
      });
    }

    const enrollmentId = enrollment.rows[0].id;

    // Check if this is the first time accessing this lesson
    const checkExisting = await db.query(
      `SELECT id FROM lesson_progress WHERE enrollment_id = $1 AND lesson_id = $2`,
      [enrollmentId, lessonId]
    );

    if (checkExisting.rows.length === 0) {
      // First time - log lesson started activity
      await logActivity(studentId, courseId, "lesson_started", lessonId);
    }

    const updateQuery = `
      INSERT INTO lesson_progress (enrollment_id, lesson_id, time_spent_seconds)
      VALUES ($1, $2, $3)
      ON CONFLICT (enrollment_id, lesson_id) 
      DO UPDATE SET time_spent_seconds = lesson_progress.time_spent_seconds + $3
      RETURNING *
    `;
    await db.query(updateQuery, [enrollmentId, lessonId, timeSpent]);

    // Update last accessed time
    await db.query(
      `UPDATE enrollments SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [enrollmentId]
    );

    res.json({
      status: "SUCCESS",
      message: "Time updated",
    });
  } catch (error) {
    console.error("Update lesson time error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to update time",
    });
  }
};

module.exports = {
  getCourseProgress,
  markLessonComplete,
  updateLessonTime,
  getStudentProgress,
};
