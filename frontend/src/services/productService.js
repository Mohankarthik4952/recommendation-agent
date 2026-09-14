import api from "./api";

// ============================================================
// PRODUCT SERVICE
// ============================================================

/**
 * Get all products
 *
 * Actual API endpoint:
 * GET /api/products
 */
export const getProducts = async () => {
  try {
    const response = await api.get("/products");

    return response.data;
  } catch (error) {
    console.error(
      "Failed to load products:",
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

/**
 * Get product by ID
 *
 * Actual API endpoint:
 * GET /api/products/:id
 */
export const getProductById = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  try {
    const response = await api.get(
      `/products/${encodeURIComponent(productId)}`,
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to load product ${productId}:`,
      error.response?.data?.message || error.message,
    );

    throw error;
  }
};

// ============================================================
// OPTIONAL ALIASES
// ============================================================

export const fetchProducts = getProducts;
export const fetchProductById = getProductById;
