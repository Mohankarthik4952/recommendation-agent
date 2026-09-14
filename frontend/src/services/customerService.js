import api from "./api";

// ============================================================
// CUSTOMER SERVICE
// ============================================================

/**
 * Get customer by ID
 *
 * Actual API endpoint:
 * GET /api/customers/:customerId
 */
export const getCustomer = async (customerId) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  try {
    const response = await api.get(
      `/customers/${encodeURIComponent(customerId)}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load customer ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// UPDATE CUSTOMER
// ============================================================

/**
 * Update customer
 *
 * Actual API endpoint:
 * PUT /api/customers/:customerId
 */
export const updateCustomer = async (customerId, customerData) => {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  if (!customerData || typeof customerData !== "object") {
    throw new Error("Customer data is required");
  }

  try {
    const response = await api.put(
      `/customers/${encodeURIComponent(customerId)}`,
      customerData,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to update customer ${customerId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// ALIASES
// ============================================================

export const fetchCustomer = getCustomer;
export const editCustomer = updateCustomer;
