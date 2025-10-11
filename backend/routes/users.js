const express = require("express");
const db = require("../config/database");
const router = express.Router();

// GET all users with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const role = req.query.role;

    let query =
      "SELECT id, firstName, lastName, email, role, createdAt FROM users";
    let countQuery = "SELECT COUNT(*) as total FROM users";
    const params = [];

    if (role) {
      query += " WHERE role = $1";
      countQuery += " WHERE role = $1";
      params.push(role);
    }

    query += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`;
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, role ? [role] : []),
    ]);

    res.json({
      status: "SUCCESS",
      data: users.rows,
      total: countResult.rows[0].total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// GET single user by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, firstName, lastName, email, role, createdAt, updatedAt FROM users WHERE id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// GET user statistics (admin only)
router.get("/stats/overview", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as totalUsers,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as totalStudents,
        SUM(CASE WHEN role = 'instructor' THEN 1 ELSE 0 END) as totalInstructors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as totalAdmins
      FROM users
    `);

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

module.exports = router;
