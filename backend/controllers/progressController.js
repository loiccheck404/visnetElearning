const db = require("../config/database");

// Get student's progress for a specific course
const getCourseProgress = async (req, res) => {
  try {
    const studentId = req.user.userId;
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

    // Get all lessons for the course
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

// Mark lesson as complete
const markLessonComplete = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId, lessonId } = req.params;
    const { timeSpent } = req.body; // in seconds

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
    await db.query(progressQuery, [enrollmentId, lessonId, timeSpent || 0]);

    // Update enrollment progress percentage
    const updateProgressQuery = `
      WITH progress_calc AS (
        SELECT 
          COUNT(*) FILTER (WHERE lp.is_completed = true) * 100.0 / COUNT(*) as progress_pct
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.enrollment_id = $1
        WHERE l.course_id = $2
      )
      UPDATE enrollments
      SET progress = (SELECT progress_pct FROM progress_calc),
          last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING progress
    `;
    const result = await db.query(updateProgressQuery, [
      enrollmentId,
      courseId,
    ]);

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
    const studentId = req.user.userId;
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

// Get all student's enrolled courses with progress
const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const query = `
      SELECT 
        c.id, c.title, c.thumbnail_url, c.level,
        cat.name as category_name,
        u.first_name || ' ' || u.last_name as instructor_name,
        e.progress, e.enrolled_at, e.last_accessed_at,
        COUNT(l.id) as total_lessons,
        COUNT(lp.id) FILTER (WHERE lp.is_completed = true) as completed_lessons
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

    res.json({
      status: "SUCCESS",
      data: {
        courses: result.rows,
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

module.exports = {
  getCourseProgress,
  markLessonComplete,
  updateLessonTime,
  getStudentProgress,
};
