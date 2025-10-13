const express = require("express");
const { body } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// GET all users (admin)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    const result = await db.query(
      `SELECT 
        id,
        first_name as "firstName",
        last_name as "lastName",
        email,
        role,
        is_active as "isActive",
        created_at as "createdAt"
      FROM users
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2`,
      [limitNum, offsetNum]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// GET single user
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        id,
        first_name as "firstName",
        last_name as "lastName",
        email,
        role,
        is_active as "isActive",
        created_at as "createdAt"
      FROM users
      WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// UPDATE user
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, bio, phone, dateOfBirth } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           email = COALESCE($4, email),
           bio = COALESCE($5, bio),
           phone = COALESCE($6, phone),
           date_of_birth = COALESCE($7, date_of_birth),
           updated_at = NOW()
       WHERE id = $1 AND is_active = true
       RETURNING id, first_name, last_name, email, role`,
      [id, firstName, lastName, email, bio, phone, dateOfBirth]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    res.json({
      status: "SUCCESS",
      message: "User updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

// DELETE user - HARD DELETE (completely remove from database)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userIdNum = parseInt(id);

    if (isNaN(userIdNum)) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Invalid user ID" });
    }

    console.log(`\n========== DELETE USER START ==========`);
    console.log(`User ID: ${userIdNum}`);

    // HARD DELETE: First check if user exists
    const checkUser = await db.query(
      `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
      [userIdNum]
    );

    if (checkUser.rows.length === 0) {
      console.log(`User not found: ${userIdNum}`);
      return res
        .status(404)
        .json({ status: "ERROR", message: "User not found" });
    }

    const deletedUser = checkUser.rows[0];
    console.log(
      `Found user to delete: ${deletedUser.first_name} ${deletedUser.last_name}`
    );

    // Delete all related records first (if needed)
    // Delete enrollments
    await db.query(`DELETE FROM enrollments WHERE student_id = $1`, [
      userIdNum,
    ]);
    console.log(`Deleted enrollments for user ${userIdNum}`);

    // Delete student activities
    await db.query(`DELETE FROM student_activities WHERE student_id = $1`, [
      userIdNum,
    ]);
    console.log(`Deleted student activities for user ${userIdNum}`);

    // Finally, delete the user
    const deleteResult = await db.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, first_name, last_name, email`,
      [userIdNum]
    );

    console.log(`User deleted successfully: ${userIdNum}`);
    console.log(`========== DELETE USER END ==========\n`);

    // Log to audit logs
    try {
      await db.query(
        `INSERT INTO public.audit_logs (email, action, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          deletedUser.email,
          "user_deleted",
          `User "${deletedUser.first_name} ${deletedUser.last_name}" (ID: ${userIdNum}) permanently deleted`,
          req.ip || "127.0.0.1",
        ]
      );
      console.log(`Audit log created for user deletion`);
    } catch (auditError) {
      console.error("Error logging to audit logs:", auditError);
      // Don't fail the delete if audit logging fails
    }

    res.json({
      status: "SUCCESS",
      message: "User permanently deleted",
      data: { userId: deleteResult.rows[0].id },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

module.exports = router;
