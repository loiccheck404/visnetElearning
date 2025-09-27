const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const db = require("../config/database");

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign({ userId, email, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// User registration
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "ERROR",
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { email, password, firstName, lastName, role = "student" } = req.body;

    // Check if user already exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Email already registered",
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName, role, true] // Set is_verified=true for development
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    res.status(201).json({
      status: "SUCCESS",
      message: "User registered successfully",
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Registration failed",
    });
  }
};

// User login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "ERROR",
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const result = await db.query(
      "SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "ERROR",
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        status: "ERROR",
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        status: "ERROR",
        message: "Invalid email or password",
      });
    }

    // Update last login
    await db.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    res.json({
      status: "SUCCESS",
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Login failed",
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, avatar_url, bio, 
       phone, date_of_birth, created_at, last_login 
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    res.json({
      status: "SUCCESS",
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          phone: user.phone,
          dateOfBirth: user.date_of_birth,
          createdAt: user.created_at,
          lastLogin: user.last_login,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to retrieve profile",
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "ERROR",
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { firstName, lastName, bio, phone, dateOfBirth } = req.body;

    const result = await db.query(
      `UPDATE users SET 
       first_name = $1, last_name = $2, bio = $3, 
       phone = $4, date_of_birth = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING id, email, first_name, last_name, role, bio, phone, date_of_birth`,
      [firstName, lastName, bio, phone, dateOfBirth, userId]
    );

    const user = result.rows[0];

    res.json({
      status: "SUCCESS",
      message: "Profile updated successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          bio: user.bio,
          phone: user.phone,
          dateOfBirth: user.date_of_birth,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to update profile",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
};
