const express = require("express");

const { login, register, getMe } = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/login", login);

router.post("/register", register);

// Protected route
router.get("/me", authenticateToken, getMe);

module.exports = router;
