const {
  getPurchaseHistoryByCustomer,
  getBrowsingHistoryByCustomer,
  recordProductView,
} = require("../services/historyService");

// ============================================================
// GET PURCHASE HISTORY
// ============================================================

const getPurchaseHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    // --------------------------------------------------------
    // Security check
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Security check
    // --------------------------------------------------------

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

    const view = await recordProductView(
      req.customerId,
      productId,
      duration ?? null,
    );

    return res.status(201).json({
      success: true,
      message: "Product view recorded",
      view,
    });
  } catch (error) {
    console.error("Record product view error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record product view",
    });
  }
};

module.exports = {
  getPurchaseHistory,
  getBrowsingHistory,
  recordView,
};
