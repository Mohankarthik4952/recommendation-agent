const {
  getPurchaseHistoryByCustomer,
  getBrowsingHistoryByCustomer,
  recordProductView,
  recordCustomerInteraction,
  getSavedProductsByCustomer,
  getSavedItemCountByCustomer,
  isProductSavedByCustomer,
  toggleSavedProduct,
  getDashboardStatsByCustomer,
} = require("../services/historyService");

// ============================================================
// GET PURCHASE HISTORY
// ============================================================

const getPurchaseHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this purchase history",
      });
    }

    const purchases = await getPurchaseHistoryByCustomer(customerId);

    return res.status(200).json({
      success: true,
      customerId,
      count: purchases.length,
      purchases,
    });
  } catch (error) {
    console.error("Get purchase history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase history",
    });
  }
};

// ============================================================
// GET BROWSING HISTORY
// ============================================================

const getBrowsingHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this browsing history",
      });
    }

    const browsingHistory = await getBrowsingHistoryByCustomer(customerId);

    return res.status(200).json({
      success: true,
      customerId,
      count: browsingHistory.length,
      history: browsingHistory,
      browsingHistory,
    });
  } catch (error) {
    console.error("Get browsing history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch browsing history",
    });
  }
};

// ============================================================
// RECORD PRODUCT VIEW
// ============================================================

const recordView = async (req, res) => {
  try {
    const { productId, duration } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const durationSeconds =
      duration === undefined || duration === null ? 0 : Number(duration);

    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be a valid non-negative number",
      });
    }

    const view = await recordProductView(
      req.customerId,
      productId,
      durationSeconds,
    );

    return res.status(201).json({
      success: true,
      message: "Product view recorded",
      view,
    });
  } catch (error) {
    console.error("Record product view error:", error);

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to record product view",
    });
  }
};

// ============================================================
// RECORD CUSTOMER INTERACTION
// ============================================================

/**
 * Records customer behavior used by the recommendation engine.
 *
 * Supported interaction types:
 *
 * - click
 * - add_to_cart
 * - like
 *
 * The customer ID is taken from the authenticated JWT.
 *
 * Example request:
 *
 * POST /api/history/interaction
 *
 * {
 *   "productId": "P105",
 *   "interactionType": "add_to_cart"
 * }
 */

const recordInteraction = async (req, res) => {
  try {
    const { productId, interactionType } = req.body;

    // ----------------------------------------------------------
    // Validate product ID
    // ----------------------------------------------------------

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // ----------------------------------------------------------
    // Validate interaction type
    // ----------------------------------------------------------

    if (!interactionType) {
      return res.status(400).json({
        success: false,
        message: "Interaction type is required",
      });
    }

    const allowedInteractionTypes = ["click", "add_to_cart", "like"];

    if (!allowedInteractionTypes.includes(interactionType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid interaction type. Supported types: click, add_to_cart, like",
      });
    }

    // ----------------------------------------------------------
    // Record interaction
    // ----------------------------------------------------------

    const result = await recordCustomerInteraction(
      req.customerId,
      productId,
      interactionType,
    );

    return res.status(201).json({
      success: true,
      message: "Customer interaction recorded",
      customerId: req.customerId,
      productId,
      interactionType,
      interaction: result.interaction,
      product: result.product,
    });
  } catch (error) {
    console.error("Record customer interaction error:", error);

    // --------------------------------------------------------
    // Product not found
    // --------------------------------------------------------

    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // --------------------------------------------------------
    // Invalid interaction type
    // --------------------------------------------------------

    if (error.message?.startsWith("Invalid interaction type")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // --------------------------------------------------------
    // Database / server error
    // --------------------------------------------------------

    return res.status(500).json({
      success: false,
      message: "Failed to record customer interaction",
    });
  }
};

// ============================================================
// GET DASHBOARD STATS
// ============================================================

const getDashboardStats = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access dashboard statistics",
      });
    }

    const stats = await getDashboardStatsByCustomer(customerId);

    return res.status(200).json({
      success: true,
      customerId,
      stats,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

// ============================================================
// GET SAVED PRODUCTS
// ============================================================

const getSavedProducts = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access saved products",
      });
    }

    const products = await getSavedProductsByCustomer(customerId);

    return res.status(200).json({
      success: true,
      customerId,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get saved products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved products",
    });
  }
};

// ============================================================
// GET SAVED STATUS
// ============================================================

const getSavedStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    const saved = await isProductSavedByCustomer(req.customerId, productId);

    return res.status(200).json({
      success: true,
      productId,
      saved,
    });
  } catch (error) {
    console.error("Get saved status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check saved status",
    });
  }
};

// ============================================================
// TOGGLE SAVED PRODUCT
// ============================================================

const toggleSaved = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const result = await toggleSavedProduct(req.customerId, productId);

    const savedCount = await getSavedItemCountByCustomer(req.customerId);

    return res.status(200).json({
      success: true,
      productId,
      saved: result.saved,
      item: result.item,
      saved_items: savedCount,
    });
  } catch (error) {
    console.error("Toggle saved product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update saved product",
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getPurchaseHistory,
  getBrowsingHistory,
  recordView,
  recordInteraction,
  getDashboardStats,
  getSavedProducts,
  getSavedStatus,
  toggleSaved,
};
