import api from "./api";

/**
 * Get all products
 *
 * GET /api/products
 */
export const getProducts = async () => {
  const response = await api.get("/products");

  return response.data;
};

/**
 * Get product by ID
 *
 * GET /api/products/:id
 */
export const getProductById = async (productId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  const response = await api.get(`/products/${encodeURIComponent(productId)}`);

  return response.data;
};
