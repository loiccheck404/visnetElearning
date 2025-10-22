const db = require("../config/database");

// Get all published courses with filters
const getAllCourses = async (req, res) => {
  try {
    const { category, level, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, 
             cat.name as category_name,
             u.first_name || ' ' || u.last_name as instructor_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'published'
    `;
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND c.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (level) {
      query += ` AND c.level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (search) {
      query += ` AND (c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM courses WHERE status = 'published'`;
    const countResult = await db.query(countQuery);

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
    console.error("Get courses error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch courses",
    });
  }
};

// Get course by ID or slug
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is numeric
    const isNumeric = /^\d+$/.test(id);

    const query = `
      SELECT c.*, 
             cat.name as category_name,
             cat.slug as category_slug,
             u.first_name || ' ' || u.last_name as instructor_name,
             u.email as instructor_email
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE ${isNumeric ? "c.id = $1" : "c.slug = $1"}
    `;

    const result = await db.query(query, [isNumeric ? parseInt(id) : id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found",
      });
    }

    // Get lessons for this course
    const lessonsQuery = `
      SELECT id, title, description, duration_minutes, order_index, is_preview
      FROM lessons
      WHERE course_id = $1
      ORDER BY order_index ASC
    `;
    const lessons = await db.query(lessonsQuery, [result.rows[0].id]);

    res.json({
      status: "SUCCESS",
      data: {
        course: result.rows[0],
        lessons: lessons.rows,
      },
    });
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch course",
    });
  }
};

// Create new course (instructor only)
const createCourse = async (req, res) => {
  try {
    console.log("\n========== CREATE COURSE START ==========");
    console.log("Request body:", req.body);
    console.log("User:", req.user);

    const {
      title,
      description,
      short_description,
      category_id,
      level,
      language,
      price,
      thumbnail_url,
    } = req.body;

    // Validation
    if (!title || !description || !category_id || !level || !language) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        status: "ERROR",
        message:
          "Missing required fields: title, description, category_id, level, language",
      });
    }

    const instructorId = req.user.id;
    console.log("Instructor ID:", instructorId);

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    console.log("Generated slug:", slug);

    // Check if slug already exists
    const slugCheck = await db.query(`SELECT id FROM courses WHERE slug = $1`, [
      slug,
    ]);

    if (slugCheck.rows.length > 0) {
      console.log("Slug already exists:", slug);
      return res.status(400).json({
        status: "ERROR",
        message: `A course with similar title already exists. Please use a different title.`,
      });
    }

    // For instructors, set status to 'pending' (awaiting admin approval)
    // For admins, set status to 'published' directly
    const status = req.user.role === "admin" ? "published" : "pending";
    console.log("Course status will be:", status);

    const result = await db.query(
      `INSERT INTO courses (
        title, slug, description, short_description, instructor_id, 
        category_id, level, language, price, thumbnail_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        title,
        slug,
        description,
        short_description || "",
        instructorId,
        category_id,
        level,
        language,
        price || 0,
        thumbnail_url || null,
        status,
      ]
    );

    console.log("Course created successfully:", result.rows[0]);

    // Log activity - FIXED: Only use columns that exist
    try {
      await db.query(
        `INSERT INTO student_activities (student_id, activity_type, course_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          instructorId,
          status === "pending"
            ? "course_submitted_for_approval"
            : "course_created",
          result.rows[0].id,
        ]
      );
      console.log("Activity logged successfully");
    } catch (activityError) {
      // Don't fail course creation if activity logging fails
      console.warn(
        "Failed to log activity (non-critical):",
        activityError.message
      );
    }

    console.log("========== CREATE COURSE END ==========\n");

    res.status(201).json({
      status: "SUCCESS",
      message:
        status === "pending"
          ? "Course created and submitted for admin approval"
          : "Course created and published successfully",
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Error creating course:", error);
    console.error("Error stack:", error.stack);
    console.log("========== CREATE COURSE ERROR ==========\n");

    res.status(500).json({
      status: "ERROR",
      message: error.message || "Failed to create course",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Update course (instructor only - own courses)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    const updates = req.body;

    // Check if course belongs to instructor
    const checkQuery = `SELECT id FROM courses WHERE id = $1 AND instructor_id = $2`;
    const checkResult = await db.query(checkQuery, [id, instructorId]);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        status: "ERROR",
        message: "Not authorized to update this course",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "short_description",
      "category_id",
      "level",
      "language",
      "price",
      "thumbnail_url",
    ];
    const setFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (setFields.length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "No valid fields to update",
      });
    }

    setFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE courses 
      SET ${setFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    res.json({
      status: "SUCCESS",
      message: "Course updated successfully",
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to update course",
    });
  }
};

// Publish Course - Now submits for approval instead of publishing directly
const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if course exists and user has permission
    const courseCheck = await db.query("SELECT * FROM courses WHERE id = $1", [
      id,
    ]);

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found",
      });
    }

    const course = courseCheck.rows[0];

    // Only course instructor or admin can publish
    if (course.instructor_id !== userId && userRole !== "admin") {
      return res.status(403).json({
        status: "ERROR",
        message: "You don't have permission to publish this course",
      });
    }

    // If instructor, set to 'pending' for approval
    // If admin, publish directly
    const newStatus = userRole === "admin" ? "published" : "pending";
    const message =
      userRole === "admin"
        ? "Course published successfully"
        : "Course submitted for approval";

    const result = await db.query(
      `UPDATE courses 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [newStatus, id]
    );

    // Log activity - FIXED: Only use columns that exist
    try {
      await db.query(
        `INSERT INTO student_activities (student_id, activity_type, course_id, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          userId,
          newStatus === "published"
            ? "course_published"
            : "course_submitted_for_approval",
          id,
        ]
      );
    } catch (activityError) {
      console.warn("Failed to log publish activity:", activityError.message);
    }

    res.json({
      status: "SUCCESS",
      message,
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Error publishing course:", error);
    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const courseIdNum = parseInt(id);
    const instructorId = req.user.id;

    if (isNaN(courseIdNum)) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid course ID" });
    }

    console.log(`\n========== DELETE COURSE START ==========`);
    console.log(`Course ID: ${courseIdNum}, Instructor ID: ${instructorId}`);

    // Check if course exists and belongs to instructor
    const checkCourse = await db.query(
      `SELECT id, title FROM courses WHERE id = $1 AND instructor_id = $2`,
      [courseIdNum, instructorId]
    );

    if (checkCourse.rows.length === 0) {
      console.log(`Course not found or not authorized: ${courseIdNum}`);
      return res.status(404).json({
        status: "ERROR",
        message: "Course not found or not authorized",
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

    console.log(`Course deleted successfully: ${courseIdNum}`);
    console.log(`========== DELETE COURSE END ==========\n`);

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

// Get instructor's courses
const getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id;

    const query = `
      SELECT c.*, cat.name as category_name,
             COUNT(DISTINCT e.id) as student_count
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.instructor_id = $1
      GROUP BY c.id, cat.name
      ORDER BY c.created_at DESC
    `;

    const result = await db.query(query, [instructorId]);

    res.json({
      status: "SUCCESS",
      data: { courses: result.rows },
    });
  } catch (error) {
    console.error("Get instructor courses error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch courses",
    });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM categories ORDER BY name ASC`);

    res.json({
      status: "SUCCESS",
      data: { categories: result.rows },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch categories",
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  publishCourse,
  deleteCourse,
  getInstructorCourses,
  getCategories,
};
