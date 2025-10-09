const db = require("../config/database");

// Get all students enrolled in instructor's courses
const getInstructorStudents = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { courseId } = req.query;

    let query = `
      SELECT 
        e.id as enrollment_id,
        e.student_id,
        e.course_id,
        e.enrolled_at,
        e.progress,
        e.last_accessed_at,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.first_name,
        u.last_name,
        c.title as course_title,
        c.id as course_id
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `;

    const params = [instructorId];

    // Filter by specific course if courseId is provided
    if (courseId) {
      query += ` AND c.id = $2`;
      params.push(courseId);
    }

    query += ` ORDER BY e.enrolled_at DESC`;

    const result = await db.query(query, params);

    res.json({
      status: "SUCCESS",
      data: {
        students: result.rows,
      },
    });
  } catch (error) {
    console.error("Get instructor students error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch students",
    });
  }
};

// Get student details for a specific course
const getStudentDetails = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const instructorId = req.user.id;

    // Verify instructor owns the course
    const courseCheck = await db.query(
      `SELECT id FROM courses WHERE id = $1 AND instructor_id = $2`,
      [courseId, instructorId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({
        status: "ERROR",
        message: "Not authorized to view this student",
      });
    }

    // Get student enrollment details
    const enrollmentQuery = `
      SELECT 
        e.*,
        u.first_name,
        u.last_name,
        u.email,
        c.title as course_title
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = $1 AND e.course_id = $2
    `;

    const enrollment = await db.query(enrollmentQuery, [studentId, courseId]);

    if (enrollment.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Student enrollment not found",
      });
    }

    // Get lesson progress
    const progressQuery = `
      SELECT 
        lp.*,
        l.title as lesson_title
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE lp.enrollment_id = $1
      ORDER BY l.order_index ASC
    `;

    const progress = await db.query(progressQuery, [enrollment.rows[0].id]);

    res.json({
      status: "SUCCESS",
      data: {
        enrollment: enrollment.rows[0],
        progress: progress.rows,
      },
    });
  } catch (error) {
    console.error("Get student details error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch student details",
    });
  }
};

module.exports = {
  getInstructorStudents,
  getStudentDetails,
};
