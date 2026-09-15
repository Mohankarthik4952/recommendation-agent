const express = require("express");

const {
  getRecommendations,
  submitRecommendationFeedback,
} = require("../controllers/recommendationController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * GET /api/recommendations/:customerId
 *
 * Authentication required.
 */
router.get("/:customerId", authenticateToken, getRecommendations);

/**
 * POST /api/recommendations/feedback
 *
 * Authentication required.
 */
router.post("/feedback", authenticateToken, submitRecommendationFeedback);

module.exports = router;
