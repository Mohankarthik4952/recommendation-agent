import api from "./api";

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

export const getCustomer = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await api.get(
    `/customers/${encodeURIComponent(customerId)}`,
  );

  return response.data;
};

// ============================================================
// UPDATE CUSTOMER
// ============================================================

export const updateCustomer = async (customerId, customerData) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const response = await api.put(
    `/customers/${encodeURIComponent(customerId)}`,
    customerData,
  );

  return response.data;
};
