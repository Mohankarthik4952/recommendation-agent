const express = require("express");

const {
  getPurchaseHistory,
  getBrowsingHistory,
  recordView,
  recordInteraction,
  getDashboardStats,
  getSavedProducts,
  getSavedStatus,
  toggleSaved,
} = require("../controllers/historyController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// DASHBOARD STATS
// ============================================================

router.get("/:customerId/stats", authenticateToken, getDashboardStats);

// ============================================================
// PURCHASE HISTORY
// ============================================================

router.get("/:customerId/purchases", authenticateToken, getPurchaseHistory);

// ============================================================
// BROWSING HISTORY
// ============================================================

router.get("/:customerId/browsing", authenticateToken, getBrowsingHistory);

// ============================================================
// SAVED PRODUCTS
// ============================================================

router.get("/:customerId/saved", authenticateToken, getSavedProducts);

// ============================================================
// CHECK SAVED STATUS
// ============================================================

router.get("/saved/status/:productId", authenticateToken, getSavedStatus);

// ============================================================
// TOGGLE SAVE
// ============================================================

router.post("/saved/toggle", authenticateToken, toggleSaved);

// ============================================================
// RECORD PRODUCT VIEW
// ============================================================

router.post("/view", authenticateToken, recordView);

// ============================================================
// RECORD CUSTOMER INTERACTION
// ============================================================
// Used for recommendation signals such as:
// - click
// - add_to_cart
// - like
//
// The customer ID comes from the JWT:
// req.customerId
// ============================================================

router.post("/interaction", authenticateToken, recordInteraction);

module.exports = router;
