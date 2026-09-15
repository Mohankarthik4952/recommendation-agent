const axios = require("axios");

const pool = require("../config/db");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const DEFAULT_MODEL_VERSION = "random-forest-v1";

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
    console.error(
      "ML recommendation service error:",
      error.response?.data || error.message,
    );

    if (error?.response?.status === 404) {
      return {
        recommendations: [],
      };
    }

    throw error;
  }
};

// ============================================================
// FIND BEST AVAILABLE PRODUCT
// ============================================================

const findBestProduct = async (category, brand, excludeProductIds = []) => {
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
      AND (
        $3::text[] IS NULL
        OR id <> ALL($3::text[])
      )
    ORDER BY
      discount DESC NULLS LAST,
      rating DESC NULLS LAST,
      price ASC,
      created_at DESC
    LIMIT 1
    `,
    [
      String(category || "").trim(),
      String(brand || "").trim(),
      excludeProductIds.length > 0 ? excludeProductIds.map(String) : null,
    ],
  );

  return result.rows[0] || null;
};

// ============================================================
// GET LATEST RECOMMENDATION TIME
// ============================================================

const getLatestRecommendationCreatedAt = async (customerId) => {
  const result = await pool.query(
    `
    SELECT MAX(created_at) AS latest_created_at
    FROM recommendations
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return result.rows[0]?.latest_created_at || null;
};

// ============================================================
// GET LATEST FEEDBACK TIME
// ============================================================

const getLatestFeedbackCreatedAt = async (customerId) => {
  const result = await pool.query(
    `
    SELECT MAX(created_at) AS latest_feedback_at
    FROM recommendation_feedback
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return result.rows[0]?.latest_feedback_at || null;
};

// ============================================================
// CHECK WHETHER RECOMMENDATIONS NEED REFRESHING
// ============================================================

const recommendationsNeedRefresh = async (customerId) => {
  const latestRecommendation =
    await getLatestRecommendationCreatedAt(customerId);

  const latestFeedback = await getLatestFeedbackCreatedAt(customerId);

  // No recommendations yet.
  if (!latestRecommendation) {
    return true;
  }

  // No feedback yet.
  if (!latestFeedback) {
    return false;
  }

  // New feedback exists after the latest recommendation.
  return (
    new Date(latestFeedback).getTime() >
    new Date(latestRecommendation).getTime()
  );
};

// ============================================================
// SAVE A NEW RECOMMENDATION BATCH
// ============================================================

const saveRecommendationsForCustomer = async (
  customerId,
  mlRecommendations,
  modelVersion = DEFAULT_MODEL_VERSION,
) => {
  if (!Array.isArray(mlRecommendations) || mlRecommendations.length === 0) {
    return [];
  }

  const rows = [];
  const usedProductIds = new Set();

  for (const recommendation of mlRecommendations) {
    const product = await findBestProduct(
      recommendation.category,
      recommendation.brand,
      Array.from(usedProductIds),
    );

    if (!product) {
      continue;
    }

    if (usedProductIds.has(String(product.id))) {
      continue;
    }

    usedProductIds.add(String(product.id));

    const score = Number(
      recommendation.final_score ??
        recommendation.affinity_score ??
        recommendation.score ??
        0,
    );

    const explanation =
      recommendation.explanation ||
      `Recommended ${product.name} because it matches your preferences.`;

    rows.push({
      customer_id: customerId,
      product_id: product.id,
      score: Math.max(0, Math.min(score, 1)),
      reason: explanation,
      model_version: recommendation.model_version || modelVersion,
    });

    if (rows.length >= 5) {
      break;
    }
  }

  if (rows.length === 0) {
    return [];
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // All rows in this INSERT receive the same PostgreSQL NOW()
  // timestamp. This creates one recommendation generation batch.
  //
  // Old recommendations are NOT deleted.
  // Therefore recommendation_feedback remains intact.
  // ----------------------------------------------------------

  const query = `
    INSERT INTO recommendations
    (
      customer_id,
      product_id,
      score,
      reason,
      model_version,
      created_at
    )
    VALUES
    ${rows
      .map(
        (_, index) =>
          `(
            $${index * 5 + 1},
            $${index * 5 + 2},
            $${index * 5 + 3},
            $${index * 5 + 4},
            $${index * 5 + 5},
            NOW()
          )`,
      )
      .join(", ")}
    RETURNING
      id,
      customer_id,
      product_id,
      score,
      reason,
      model_version,
      created_at
  `;

  const values = rows.flatMap((row) => [
    row.customer_id,
    row.product_id,
    row.score,
    row.reason,
    row.model_version,
  ]);

  const result = await pool.query(query, values);

  return result.rows;
};

// ============================================================
// GENERATE FRESH RECOMMENDATIONS
// ============================================================

const generateRecommendationsForCustomer = async (customerId) => {
  const mlResponse = await fetchRecommendationsFromMl(customerId);

  const recommendations = mlResponse?.recommendations || [];

  const modelVersion = mlResponse?.model_version || DEFAULT_MODEL_VERSION;

  return saveRecommendationsForCustomer(
    customerId,
    recommendations,
    modelVersion,
  );
};

// ============================================================
// GET ONLY THE LATEST RECOMMENDATION BATCH
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
      r.model_version,
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

      AND r.created_at = (
        SELECT MAX(r2.created_at)
        FROM recommendations r2
        WHERE r2.customer_id = $1
      )

      AND p.stock > 0

    ORDER BY
      r.score DESC,
      r.created_at DESC
    `,
    [customerId],
  );

  return result.rows;
};

// ============================================================
// GET RECOMMENDATIONS WITH AUTOMATIC REFRESH
// ============================================================

const getOrRefreshRecommendations = async (customerId) => {
  const needsRefresh = await recommendationsNeedRefresh(customerId);

  if (needsRefresh) {
    const generated = await generateRecommendationsForCustomer(customerId);

    if (generated.length > 0) {
      return getRecommendationsByCustomer(customerId);
    }
  }

  return getRecommendationsByCustomer(customerId);
};

// ============================================================
// SAVE RECOMMENDATION FEEDBACK
// ============================================================

const saveRecommendationFeedback = async ({
  customerId,
  recommendationId,
  productId,
  feedback,
}) => {
  const action = feedback === "helpful" ? "helpful" : "not_helpful";

  // ----------------------------------------------------------
  // Validate recommendation ownership.
  // ----------------------------------------------------------

  if (recommendationId) {
    const recommendationResult = await pool.query(
      `
        SELECT
          id,
          customer_id,
          product_id
        FROM recommendations
        WHERE id = $1
          AND customer_id = $2
        LIMIT 1
        `,
      [recommendationId, customerId],
    );

    if (recommendationResult.rows.length === 0) {
      throw new Error("Recommendation does not belong to this customer");
    }

    if (String(recommendationResult.rows[0].product_id) !== String(productId)) {
      throw new Error("Product does not match the recommendation");
    }
  }

  // ----------------------------------------------------------
  // Save feedback.
  // ----------------------------------------------------------

  const result = await pool.query(
    `
    INSERT INTO recommendation_feedback
    (
      customer_id,
      recommendation_id,
      product_id,
      action,
      created_at
    )
    VALUES
    ($1, $2, $3, $4, NOW())

    RETURNING
      id,
      customer_id,
      recommendation_id,
      product_id,
      action,
      created_at
    `,
    [customerId, recommendationId, productId, action],
  );

  return result.rows[0];
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getRecommendationsByCustomer,

  getOrRefreshRecommendations,

  generateRecommendationsForCustomer,

  saveRecommendationsForCustomer,

  saveRecommendationFeedback,
};
