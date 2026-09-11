const express = require("express");

const {
  getRecommendations,
} = require("../controllers/recommendationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/recommendations/:customerId
 *
 * Authentication required.
 */
router.get("/:customerId", authenticateToken, getRecommendations);

module.exports = router;
