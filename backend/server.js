const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
require("dotenv").config();
const progressRoutes = require("./routes/progress");
const enrollmentRoutes = require("./routes/enrollments");

const app = express();
const PORT = process.env.PORT || 3000;
const courseRoutes = require("./routes/courses");
const activityRoutes = require("./routes/activities");
const studentRoutes = require("./routes/students");
const path = require("path");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");

// Basic middleware
app.use(helmet());
app.use(compression());
const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:3000",
  process.env.FRONTEND_URL || "",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Visnet E-Learning API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Database test route
app.get("/api/db-test", async (req, res) => {
  try {
    const db = require("./config/database");
    const result = await db.query(
      "SELECT NOW() as current_time, version() as postgres_version"
    );

    res.json({
      status: "OK",
      message: "Database connected successfully",
      timestamp: result.rows[0].current_time,
      database_version: result.rows[0].postgres_version,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// API Routes - All registered separately
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Basic error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({
    status: "ERROR",
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// 404 handler - MUST BE LAST
app.use("*", (req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/db-test`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});
