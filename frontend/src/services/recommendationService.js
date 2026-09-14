import api from "./api";

// ============================================================
// RECOMMENDATION SERVICE
// ============================================================

/**
 * Get personalized recommendations for a customer
 *
 * Actual API endpoint:
 * GET /api/recommendations/:customerId
 */
export const getRecommendations = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/recommendations/${encodeURIComponent(customerId)}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load recommendations for ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// ALIAS
// ============================================================

export const fetchRecommendations = getRecommendations;
