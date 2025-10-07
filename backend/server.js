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

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: "http://localhost:4200",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Visnet E-Learning API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use("/api/activities", activityRoutes);

app.use("/api/progress", progressRoutes);

app.use("/api/enrollments", enrollmentRoutes);

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

// Authentication routes - FIXED: Only register once with error handling
try {
  const authRoutes = require("./routes/auth");
  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  console.log("✅ Auth routes loaded successfully");
} catch (error) {
  console.error("❌ Failed to load auth routes:", error.message);
  console.error("Stack:", error.stack);
}

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
  console.log(`🗃️  Database test: http://localhost:${PORT}/api/db-test`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
});
