const axios = require("axios");

const pool = require("../config/db");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const findProductByCategoryAndBrand = async (category, brand) => {
  const result = await pool.query(
    `
    SELECT id, name, category, brand, price, stock
    FROM products
    WHERE LOWER(category) = LOWER($1)
      AND LOWER(brand) = LOWER($2)
      AND stock > 0
    ORDER BY price ASC, created_at DESC
    LIMIT 1
    `,
    [String(category || "").trim(), String(brand || "").trim()],
  );

  return result.rows[0];
};

const fetchRecommendationsFromMl = async (customerId) => {
  const response = await axios.get(
    `${ML_SERVICE_URL}/recommend/${encodeURIComponent(customerId)}`,
    {
      params: { top_k: 5 },
      timeout: 20000,
    },
  );

  return response.data;
};

const saveRecommendationsForCustomer = async (
  customerId,
  mlRecommendations,
) => {
  if (!Array.isArray(mlRecommendations) || mlRecommendations.length === 0) {
    return [];
  }

  await pool.query(
    `
    DELETE FROM recommendations
    WHERE customer_id = $1
    `,
    [customerId],
  );

  const rows = [];

  for (const recommendation of mlRecommendations) {
    const product = await findProductByCategoryAndBrand(
      recommendation.category,
      recommendation.brand,
    );

    if (!product) {
      continue;
    }

    rows.push({
      customer_id: customerId,
      product_id: product.id,
      score: Number(
        recommendation.final_score ?? recommendation.affinity_score ?? 0,
      ),
      reason:
        recommendation.explanation ||
        `${recommendation.category} / ${recommendation.brand}`,
    });
  }

  if (rows.length === 0) {
    return [];
  }

  const query = `
    INSERT INTO recommendations (customer_id, product_id, score, reason, created_at)
    VALUES ${rows
      .map(
        (_, index) =>
          `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, NOW())`,
      )
      .join(", ")}
  `;

  const values = rows.flatMap((row) => [
    row.customer_id,
    row.product_id,
    row.score,
    row.reason,
  ]);

  await pool.query(query, values);

  return rows;
};

const generateRecommendationsForCustomer = async (customerId) => {
  const mlResponse = await fetchRecommendationsFromMl(customerId);

  const recommendations = mlResponse?.recommendations || [];

  const saved = await saveRecommendationsForCustomer(
    customerId,
    recommendations,
  );

  if (saved.length === 0) {
    return [];
  }

  return saved;
};

/**
 * Get recommendations for a customer.
 */
const getRecommendationsByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.customer_id,
      r.product_id,
      r.score,
      r.reason,
      r.created_at
    FROM recommendations r
    WHERE r.customer_id = $1
    ORDER BY r.score DESC, r.created_at DESC
    `,
    [customerId],
  );

  return result.rows;
};

module.exports = {
  getRecommendationsByCustomer,
  generateRecommendationsForCustomer,
};
