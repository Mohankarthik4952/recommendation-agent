import api from "./api";

// ============================================================
// HISTORY SERVICE
// ============================================================

/**
 * Get purchase history
 *
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
 * POST /api/history/view
 *
 * The authenticated customer is taken from the JWT.
 */
export const recordProductView = async ({ productId, duration = 0 }) => {
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
// DASHBOARD STATISTICS
// ============================================================

/**
 * Get dashboard statistics for a customer
 *
 * GET /api/history/:customerId/stats
 *
 * Returns:
 * {
 *   products_viewed: number,
 *   saved_items: number,
 *   purchases: number
 * }
 */
export const getDashboardStats = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/history/${encodeURIComponent(customerId)}/stats`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load dashboard stats for ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// SAVED / LIKED PRODUCTS
// ============================================================

/**
 * Get all saved products for a customer
 *
 * GET /api/history/:customerId/saved
 */
export const getSavedProducts = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/history/${encodeURIComponent(customerId)}/saved`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load saved products for ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

/**
 * Check whether a product is saved/liked
 *
 * GET /api/history/saved/status/:productId
 *
 * Customer ID is taken from the authenticated JWT.
 */
export const getSavedProductStatus = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.get(
      `/history/saved/status/${encodeURIComponent(productId)}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to check saved status for ${productId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

/**
 * Save or unsave a product
 *
 * POST /api/history/saved/toggle
 *
 * If the product is already saved:
 *   -> it will be removed
 *
 * If the product is not saved:
 *   -> it will be saved
 */
export const toggleSavedProduct = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.post("/history/saved/toggle", {
      productId,
    });

    return response.data;
  } catch (error) {
    console.error(
      `Failed to toggle saved product ${productId}:`,
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

export const fetchDashboardStats = getDashboardStats;

export const fetchSavedProducts = getSavedProducts;
