const db = require("../config/database");

// Get all students enrolled in instructor's courses (including past enrollments)
const getInstructorStudents = async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { courseId, includedUnenrolled = "true" } = req.query;

    let query = `
      SELECT 
        e.id as enrollment_id,
        e.student_id,
        e.course_id,
        e.enrolled_at,
        e.progress,
        e.last_accessed_at,
        e.completed_at,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.first_name,
        u.last_name,
        c.title as course_title,
        c.id as course_id,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM student_activities sa 
            WHERE sa.student_id = e.student_id 
            AND sa.course_id = e.course_id 
            AND sa.activity_type = 'course_unenrolled'
          ) THEN true
          ELSE false
        END as is_unenrolled
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
        u.avatar_url,
        u.bio,
        c.title as course_title,
        c.description as course_description
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
        l.title as lesson_title,
        l.duration_minutes,
        l.order_index
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE lp.enrollment_id = $1
      ORDER BY l.order_index ASC
    `;

    const progress = await db.query(progressQuery, [enrollment.rows[0].id]);

    // Get student activities for this course
    const activitiesQuery = `
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
      LIMIT 50
    `;

    const activities = await db.query(activitiesQuery, [studentId, courseId]);

    // Calculate statistics
    const totalLessons = progress.rows.length;
    const completedLessons = progress.rows.filter((p) => p.is_completed).length;
    const totalTimeSpent = progress.rows.reduce(
      (sum, p) => sum + (p.time_spent_seconds || 0),
      0
    );

    res.json({
      status: "SUCCESS",
      data: {
        enrollment: enrollment.rows[0],
        progress: progress.rows,
        activities: activities.rows,
        statistics: {
          totalLessons,
          completedLessons,
          totalTimeSpent,
          completionPercentage:
            totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0,
        },
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

// Get student profile (all courses they're enrolled in from this instructor)
const getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const instructorId = req.user.id;

    // Get student basic info
    const studentQuery = `
      SELECT 
        id,
        first_name,
        last_name,
        email,
        avatar_url,
        bio,
        created_at
      FROM users
      WHERE id = $1 AND role = 'student'
    `;

    const student = await db.query(studentQuery, [studentId]);

    if (student.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Student not found",
      });
    }

    // Get all enrollments for this student in instructor's courses
    const enrollmentsQuery = `
      SELECT 
        e.*,
        c.title as course_title,
        c.thumbnail_url,
        c.level,
        cat.name as category_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE e.student_id = $1 AND c.instructor_id = $2
      ORDER BY e.enrolled_at DESC
    `;

    const enrollments = await db.query(enrollmentsQuery, [
      studentId,
      instructorId,
    ]);

    // Get overall statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT e.course_id) as total_courses,
        AVG(e.progress) as average_progress,
        COUNT(DISTINCT CASE WHEN e.progress = 100 THEN e.course_id END) as completed_courses,
        SUM(lp.time_spent_seconds) as total_time_spent
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN lesson_progress lp ON lp.enrollment_id = e.id
      WHERE e.student_id = $1 AND c.instructor_id = $2
    `;

    const stats = await db.query(statsQuery, [studentId, instructorId]);

    res.json({
      status: "SUCCESS",
      data: {
        student: student.rows[0],
        enrollments: enrollments.rows,
        statistics: stats.rows[0],
      },
    });
  } catch (error) {
    console.error("Get student profile error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch student profile",
    });
  }
};

module.exports = {
  getInstructorStudents,
  getStudentDetails,
  getStudentProfile,
};
