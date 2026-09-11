import api from "./api";

// ============================================================
// GET PURCHASE HISTORY
// ============================================================

export const getPurchaseHistory = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await api.get(
    `/history/${encodeURIComponent(customerId)}/purchases`,
  );

  return response.data;
};

// ============================================================
// GET BROWSING HISTORY
// ============================================================

export const getBrowsingHistory = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await api.get(
    `/history/${encodeURIComponent(customerId)}/browsing`,
  );

  return response.data;
};

// ============================================================
// RECORD PRODUCT VIEW
// ============================================================

export const recordProductView = async ({ productId, duration = null }) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  const response = await api.post("/history/view", {
    productId,
    duration,
  });

  return response.data;
};
