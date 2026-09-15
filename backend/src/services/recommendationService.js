const axios = require("axios");

const pool = require("../config/db");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// ============================================================
// FETCH RECOMMENDATIONS FROM ML SERVICE
// ============================================================

const fetchRecommendationsFromMl = async (customerId) => {
  try {
    const response = await axios.get(
      `${ML_SERVICE_URL}/recommend/${encodeURIComponent(customerId)}`,
      {
        params: {
          top_k: 5,
        },
        timeout: 20000,
      },
    );

    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return {
        recommendations: [],
      };
    }

    throw error;
  }
};

// ============================================================
// FIND BEST REAL PRODUCT
// ============================================================

const findBestProduct = async (category, brand) => {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      description,
      category,
      brand,
      price,
      discount,
      rating,
      image_url AS image,
      stock,
      season
    FROM products
    WHERE LOWER(category) = LOWER($1)
      AND LOWER(brand) = LOWER($2)
      AND stock > 0
    ORDER BY
      discount DESC NULLS LAST,
      rating DESC NULLS LAST,
      price ASC,
      created_at DESC
    LIMIT 1
    `,
    [String(category || "").trim(), String(brand || "").trim()],
  );

  return result.rows[0] || null;
};

// ============================================================
// SAVE RECOMMENDATIONS
// ============================================================

const saveRecommendationsForCustomer = async (
  customerId,
  mlRecommendations,
) => {
  if (!Array.isArray(mlRecommendations) || mlRecommendations.length === 0) {
    return [];
  }

  // ----------------------------------------------------------
  // Remove previous recommendations
  // ----------------------------------------------------------

  await pool.query(
    `
    DELETE FROM recommendations
    WHERE customer_id = $1
    `,
    [customerId],
  );

  const rows = [];

  // Prevent duplicate products.
  const usedProductIds = new Set();

  // ----------------------------------------------------------
  // Convert ML recommendations into real products
  // ----------------------------------------------------------

  for (const recommendation of mlRecommendations) {
    const product = await findBestProduct(
      recommendation.category,
      recommendation.brand,
    );

    if (!product) {
      continue;
    }

    // Don't insert the same product twice.
    if (usedProductIds.has(product.id)) {
      continue;
    }

    usedProductIds.add(product.id);

    const score = Number(
      recommendation.final_score ?? recommendation.affinity_score ?? 0,
    );

    const explanation =
      recommendation.explanation ||
      `Recommended ${product.name} because it matches your preferences.`;

    rows.push({
      customer_id: customerId,
      product_id: product.id,
      score: Math.max(0, Math.min(score, 1)),
      reason: explanation,
    });

    // Keep the recommendation list at a maximum of 5.
    if (rows.length >= 5) {
      break;
    }
  }

  if (rows.length === 0) {
    return [];
  }

  // ----------------------------------------------------------
  // Insert recommendations
  // ----------------------------------------------------------

  const query = `
    INSERT INTO recommendations
    (
      customer_id,
      product_id,
      score,
      reason,
      created_at
    )
    VALUES
    ${rows
      .map(
        (_, index) =>
          `(
            $${index * 4 + 1},
            $${index * 4 + 2},
            $${index * 4 + 3},
            $${index * 4 + 4},
            NOW()
          )`,
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

// ============================================================
// GENERATE RECOMMENDATIONS
// ============================================================

const generateRecommendationsForCustomer = async (customerId) => {
  const mlResponse = await fetchRecommendationsFromMl(customerId);

  const recommendations = mlResponse?.recommendations || [];

  const saved = await saveRecommendationsForCustomer(
    customerId,
    recommendations,
  );

  return saved;
};

// ============================================================
// GET SAVED RECOMMENDATIONS
// ============================================================

const getRecommendationsByCustomer = async (customerId) => {
  const result = await pool.query(
    `
      SELECT
        r.id,
        r.customer_id,
        r.product_id,
        r.score,
        r.reason,
        r.created_at,

        p.name,
        p.description,
        p.category,
        p.brand,
        p.price,
        p.discount,
        p.rating,
        p.image_url AS image,
        p.stock,
        p.season

      FROM recommendations r

      LEFT JOIN products p
        ON p.id = r.product_id

      WHERE r.customer_id = $1

      ORDER BY
        r.score DESC,
        r.created_at DESC
      `,
    [customerId],
  );

  return result.rows;
};

module.exports = {
  getRecommendationsByCustomer,
  generateRecommendationsForCustomer,
};
