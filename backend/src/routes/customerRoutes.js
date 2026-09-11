const express = require("express");

const {
  getCustomer,
  updateCustomerProfile,
} = require("../controllers/customerController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// GET CUSTOMER
// ============================================================

router.get("/:id", authenticateToken, getCustomer);

// ============================================================
// UPDATE CUSTOMER
// ============================================================

router.put("/:id", authenticateToken, updateCustomerProfile);

module.exports = router;
