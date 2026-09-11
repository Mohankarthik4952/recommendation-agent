import api from "./api";

/**
 * Get personalized recommendations
 *
 * GET /api/recommendations/:customerId
 */
export const getRecommendations = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await api.get(
    `/recommendations/${encodeURIComponent(customerId)}`,
  );

  return response.data;
};
