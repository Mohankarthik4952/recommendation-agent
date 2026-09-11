const express = require("express");

const {
  getPurchaseHistory,
  getBrowsingHistory,
  recordView,
} = require("../controllers/historyController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// PURCHASE HISTORY
// ============================================================

router.get("/:customerId/purchases", authenticateToken, getPurchaseHistory);

// ============================================================
// BROWSING HISTORY
// ============================================================

router.get("/:customerId/browsing", authenticateToken, getBrowsingHistory);

// ============================================================
// RECORD PRODUCT VIEW
// ============================================================

router.post("/view", authenticateToken, recordView);

module.exports = router;
