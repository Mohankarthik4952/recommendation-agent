const express = require("express");
const cors = require("cors");

// ============================================================
// ROUTE IMPORTS
// ============================================================

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const historyRoutes = require("./routes/historyRoutes");

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Personalized Retail Recommendation API is running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// AUTHENTICATION
// ============================================================

// POST /api/auth/login
// POST /api/auth/register
// GET  /api/auth/me
app.use("/api/auth", authRoutes);

// ============================================================
// PRODUCTS
// ============================================================

// GET /api/products
// GET /api/products/:id
app.use("/api/products", productRoutes);

// ============================================================
// RECOMMENDATIONS
// ============================================================

// GET /api/recommendations/:customerId
app.use("/api/recommendations", recommendationRoutes);

// ============================================================
// CUSTOMERS
// ============================================================

// GET /api/customers/:id
app.use("/api/customers", customerRoutes);

// ============================================================
// HISTORY
// ============================================================

// GET  /api/history/:id/purchases
// GET  /api/history/:id/browsing
// POST /api/history/view
app.use("/api/history", historyRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("======================================");
  console.error("SERVER ERROR");
  console.error("======================================");
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
