const db = require("../config/database");

// Enroll in a course
const enrollInCourse = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    // Check if already enrolled
    const checkQuery = `
      SELECT id FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const existing = await db.query(checkQuery, [studentId, courseId]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Already enrolled in this course",
      });
    }

    // Check if course exists and is published
    const courseQuery = `
      SELECT id, status FROM courses WHERE id = $1 AND status = 'published'
    `;
    const course = await db.query(courseQuery, [courseId]);

    if (course.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found or not available",
      });
    }

    // Create enrollment
    const enrollQuery = `
      INSERT INTO enrollments (student_id, course_id, progress, enrolled_at, last_accessed_at)
      VALUES ($1, $2, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(enrollQuery, [studentId, courseId]);

    // Update enrollment count
    await db.query(
      `UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1`,
      [courseId]
    );

    res.json({
      status: "SUCCESS",
      message: "Successfully enrolled in course",
      data: { enrollment: result.rows[0] },
    });
  } catch (error) {
    console.error("Enroll error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to enroll in course",
    });
  }
};

// Unenroll from a course
const unenrollFromCourse = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    const deleteQuery = `
      DELETE FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
      RETURNING id
    `;
    const result = await db.query(deleteQuery, [studentId, courseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Enrollment not found",
      });
    }

    // Update enrollment count
    await db.query(
      `UPDATE courses SET enrollment_count = enrollment_count - 1 WHERE id = $1`,
      [courseId]
    );

    res.json({
      status: "SUCCESS",
      message: "Successfully unenrolled from course",
    });
  } catch (error) {
    console.error("Unenroll error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to unenroll from course",
    });
  }
};

// Get student's enrolled courses
const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const query = `
      SELECT 
        c.*,
        cat.name as category_name,
        u.first_name || ' ' || u.last_name as instructor_name,
        e.progress, e.enrolled_at, e.last_accessed_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE e.student_id = $1
      ORDER BY e.last_accessed_at DESC
    `;

    const result = await db.query(query, [studentId]);

    res.json({
      status: "SUCCESS",
      data: { courses: result.rows },
    });
  } catch (error) {
    console.error("Get enrollments error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch enrollments",
    });
  }
};

// Check if enrolled in a course
const checkEnrollment = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.params;

    const query = `
      SELECT id FROM enrollments 
      WHERE student_id = $1 AND course_id = $2
    `;
    const result = await db.query(query, [studentId, courseId]);

    res.json({
      status: "SUCCESS",
      data: { isEnrolled: result.rows.length > 0 },
    });
  } catch (error) {
    console.error("Check enrollment error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to check enrollment",
    });
  }
};

module.exports = {
  enrollInCourse,
  unenrollFromCourse,
  getMyEnrollments,
  checkEnrollment,
};
