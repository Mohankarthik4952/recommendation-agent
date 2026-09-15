import api from "./api";

// ============================================================
// RECOMMENDATION SERVICE
// ============================================================

/**
 * Get personalized recommendations for a customer.
 *
 * API:
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
// RECOMMENDATION FEEDBACK
// ============================================================

/**
 * Submit feedback for a recommendation.
 *
 * feedback:
 *   "helpful"
 *   "not_helpful"
 *
 * API:
 * POST /api/recommendations/feedback
 */
export const submitRecommendationFeedback = async ({
  recommendationId = null,
  productId,
  feedback,
}) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  if (feedback !== "helpful" && feedback !== "not_helpful") {
    throw new Error("Invalid recommendation feedback");
  }

  try {
    const response = await api.post("/recommendations/feedback", {
      recommendationId,
      productId,
      feedback,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Failed to submit recommendation feedback:",
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// ALIASES
// ============================================================

export const fetchRecommendations = getRecommendations;

export const sendRecommendationFeedback = submitRecommendationFeedback;
