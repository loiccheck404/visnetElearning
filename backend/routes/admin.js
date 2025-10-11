const express = require("express");
const db = require("../config/database");
const router = express.Router();

// GET platform statistics
router.get("/stats", async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as "totalUsers",
        (SELECT COUNT(*) FROM courses) as "totalCourses",
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as "totalInstructors",
        (SELECT COUNT(*) FROM users WHERE role = 'student') as "totalStudents"
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

// GET recent activities
router.get("/activities", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const result = await db.query(
      `
      SELECT id, type, action, "createdAt" FROM activities 
      ORDER BY "createdAt" DESC 
      LIMIT $1
    `,
      [limit]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

module.exports = router;
