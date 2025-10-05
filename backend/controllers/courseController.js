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
    const instructorId = req.user.id;
    const {
      title,
      description,
      short_description,
      category_id,
      level,
      language,
      price,
    } = req.body;

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const query = `
      INSERT INTO courses (
        title, slug, description, short_description, instructor_id, 
        category_id, level, language, price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published')
      RETURNING *
    `;

    const result = await db.query(query, [
      title,
      slug,
      description,
      short_description,
      instructorId,
      category_id,
      level,
      language,
      price || 0,
    ]);

    res.status(201).json({
      status: "SUCCESS",
      message: "Course created successfully",
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to create course",
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

// Publish course
const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;

    const query = `
      UPDATE courses 
      SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND instructor_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, instructorId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: "ERROR",
        message: "Not authorized or course not found",
      });
    }

    res.json({
      status: "SUCCESS",
      message: "Course published successfully",
      data: { course: result.rows[0] },
    });
  } catch (error) {
    console.error("Publish course error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to publish course",
    });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;

    const query = `DELETE FROM courses WHERE id = $1 AND instructor_id = $2 RETURNING id`;
    const result = await db.query(query, [id, instructorId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: "ERROR",
        message: "Not authorized or course not found",
      });
    }

    res.json({
      status: "SUCCESS",
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
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
      SELECT c.*, cat.name as category_name
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE c.instructor_id = $1
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
    const result = await db.query(`
      SELECT * FROM categories ORDER BY name ASC
    `);

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
