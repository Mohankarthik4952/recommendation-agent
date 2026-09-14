import api from "./api";

// ============================================================
// HISTORY SERVICE
// ============================================================

/**
 * Get purchase history
 *
 * Actual API endpoint:
 * GET /api/history/:customerId/purchases
 */
export const getPurchaseHistory = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/history/${encodeURIComponent(customerId)}/purchases`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load purchase history for ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

/**
 * Get browsing history
 *
 * Actual API endpoint:
 * GET /api/history/:customerId/browsing
 */
export const getBrowsingHistory = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/history/${encodeURIComponent(customerId)}/browsing`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load browsing history for ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

/**
 * Record product view
 *
 * Actual API endpoint:
 * POST /api/history/view
 */
export const recordProductView = async ({ productId, duration = null }) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.post("/history/view", {
      productId,
      duration,
    });

    return response.data;
  } catch (error) {
    console.error(
      `Failed to record product view for ${productId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// ALIASES
// ============================================================

export const fetchPurchaseHistory = getPurchaseHistory;
export const fetchBrowsingHistory = getBrowsingHistory;
