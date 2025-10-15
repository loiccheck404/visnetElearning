const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profiles/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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
      if (!value || value === "") return true;
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

// Profile picture upload route
/*
router.post(
  "/profile/picture",
  authenticateToken,
  upload.single("profilePicture"),
  (req, res) => {
    // Inline handler since uploadProfilePicture might not be exported yet
    if (!req.file) {
      return res.status(400).json({
        status: "ERROR",
        message: "No file uploaded",
      });
    }

    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

    res.json({
      status: "SUCCESS",
      message: "Profile picture uploaded successfully",
      data: {
        profilePictureUrl: profilePictureUrl,
      },
    });
  }
);
*/

module.exports = router;
