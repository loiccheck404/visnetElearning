const jwt = require("jsonwebtoken");
const db = require("../config/database");

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      status: "ERROR",
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await db.query(
      "SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "ERROR",
        message: "Invalid token",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        status: "ERROR",
        message: "Account is deactivated",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      status: "ERROR",
      message: "Invalid or expired token",
    });
  }
};

// Check user roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "ERROR",
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "ERROR",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "ERROR",
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Normalize the user object to always use 'id'
    req.user = {
      id: decoded.userId, // Map userId to id
      email: decoded.email,
      role: decoded.role,
    };
    console.log("Authenticated user:", req.user); // Debug log
    next();
  } catch (error) {
    return res.status(401).json({
      status: "ERROR",
      message: "Invalid or expired token",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "ERROR",
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "ERROR",
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  authenticate,
  authorize,
};
