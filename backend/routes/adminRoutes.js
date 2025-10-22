const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// Apply authentication and admin check to all routes
// FIXED: Use authenticate and authorize (not authenticateToken and requireAdmin)
router.use(authenticate);
router.use(authorize("admin"));

// === EXISTING ROUTES ===
router.get("/stats", adminController.getPlatformStats);
router.get("/activities", adminController.getRecentActivities);
router.get("/audit-logs", adminController.getAuditLogs);
router.delete("/users/:id", adminController.deleteUser);

// === NEW COURSE MANAGEMENT ROUTES ===
// Get ALL courses for admin (including pending, draft, published)
router.get("/courses", adminController.getAllCoursesForAdmin);

// Approve a pending course (change status to 'published')
router.patch("/courses/:id/approve", adminController.approveCourse);

// Reject a pending course (return to draft with reason)
router.patch("/courses/:id/reject", adminController.rejectCourse);

// Delete a course (admin can delete any course)
router.delete("/courses/:id", adminController.deleteCourse);

module.exports = router;
