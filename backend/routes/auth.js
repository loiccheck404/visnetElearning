const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2-50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be 2-50 characters"),
  body("role")
    .optional()
    .isIn(["student", "instructor", "admin"])
    .withMessage("Role must be student, instructor, or admin"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const profileUpdateValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be 2-50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be 2-50 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),
  body("phone")
    .optional()
    .trim()
    .custom((value) => {
      // Allow empty or valid phone format
      if (!value || value === "") return true;
      // Simple regex for international phone numbers
      if (/^\+?[0-9\s\-()]{7,20}$/.test(value)) return true;
      throw new Error("Invalid phone number format");
    }),
  body("dateOfBirth")
    .optional()
    .custom((value) => {
      if (!value || value === "") return true;
      if (new Date(value).toString() !== "Invalid Date") return true;
      throw new Error("Invalid date format");
    }),
];

// Public routes
router.post("/register", registerValidation, authController.register);
router.post("/login", loginValidation, authController.login);

// Protected routes
router.get("/profile", authenticateToken, authController.getProfile);
router.put(
  "/profile",
  authenticateToken,
  profileUpdateValidation,
  authController.updateProfile
);

module.exports = router;
