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
        timeout: 30000,
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
//
// ML gives category/brand information.
// We map that recommendation to an ACTUAL product in the
// PostgreSQL products table.
//
// Priority:
// 1. Exact category + brand
// 2. Same category
// 3. Same brand
// 4. Any available product
// ============================================================

const findBestProduct = async (category, brand, excludeProductIds = []) => {
  const excludedIds =
    excludeProductIds.length > 0 ? excludeProductIds.map(String) : null;

  // ----------------------------------------------------------
  // 1. EXACT CATEGORY + BRAND
  // ----------------------------------------------------------

  if (category && brand) {
    const exactResult = await pool.query(
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
        rating DESC NULLS LAST,
        discount DESC NULLS LAST,
        price ASC,
        created_at DESC
      LIMIT 1
      `,
      [String(category).trim(), String(brand).trim(), excludedIds],
    );

    if (exactResult.rows.length > 0) {
      return exactResult.rows[0];
    }
  }

  // ----------------------------------------------------------
  // 2. SAME CATEGORY
  // ----------------------------------------------------------

  if (category) {
    const categoryResult = await pool.query(
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
        AND stock > 0
        AND (
          $2::text[] IS NULL
          OR id <> ALL($2::text[])
        )
      ORDER BY
        rating DESC NULLS LAST,
        discount DESC NULLS LAST,
        price ASC,
        created_at DESC
      LIMIT 1
      `,
      [String(category).trim(), excludedIds],
    );

    if (categoryResult.rows.length > 0) {
      return categoryResult.rows[0];
    }
  }

  // ----------------------------------------------------------
  // 3. SAME BRAND
  // ----------------------------------------------------------

  if (brand) {
    const brandResult = await pool.query(
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
      WHERE LOWER(brand) = LOWER($1)
        AND stock > 0
        AND (
          $2::text[] IS NULL
          OR id <> ALL($2::text[])
        )
      ORDER BY
        rating DESC NULLS LAST,
        discount DESC NULLS LAST,
        price ASC,
        created_at DESC
      LIMIT 1
      `,
      [String(brand).trim(), excludedIds],
    );

    if (brandResult.rows.length > 0) {
      return brandResult.rows[0];
    }
  }

  // ----------------------------------------------------------
  // 4. FINAL FALLBACK
  // ----------------------------------------------------------

  const fallbackResult = await pool.query(
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
    WHERE stock > 0
      AND (
        $1::text[] IS NULL
        OR id <> ALL($1::text[])
      )
    ORDER BY
      rating DESC NULLS LAST,
      discount DESC NULLS LAST,
      price ASC,
      created_at DESC
    LIMIT 1
    `,
    [excludedIds],
  );

  return fallbackResult.rows[0] || null;
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
// GET LATEST CUSTOMER INTERACTION TIME
//
// IMPORTANT:
// This includes:
// - view
// - click
// - add_to_cart
// - like
//
// This is what makes recommendations refresh after the user
// actually interacts with products.
// ============================================================

const getLatestInteractionAt = async (customerId) => {
  const result = await pool.query(
    `
    SELECT MAX(timestamp) AS latest_interaction_at
    FROM customer_interactions
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return result.rows[0]?.latest_interaction_at || null;
};

// ============================================================
// GET LATEST BROWSING TIME
// ============================================================

const getLatestBrowsingAt = async (customerId) => {
  const result = await pool.query(
    `
    SELECT MAX(viewed_at) AS latest_browsing_at
    FROM browsing_history
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return result.rows[0]?.latest_browsing_at || null;
};

// ============================================================
// GET LATEST PURCHASE TIME
// ============================================================

const getLatestPurchaseAt = async (customerId) => {
  const result = await pool.query(
    `
    SELECT MAX(purchased_at) AS latest_purchase_at
    FROM purchases
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return result.rows[0]?.latest_purchase_at || null;
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
//
// Recommendations are refreshed when:
// 1. No recommendation exists.
// 2. New customer interaction exists.
// 3. New browsing event exists.
// 4. New purchase exists.
// 5. New recommendation feedback exists.
//
// This is the critical fix.
// ============================================================

const recommendationsNeedRefresh = async (customerId) => {
  const latestRecommendation =
    await getLatestRecommendationCreatedAt(customerId);

  // ----------------------------------------------------------
  // No recommendations at all
  // ----------------------------------------------------------

  if (!latestRecommendation) {
    console.log(
      `[RECOMMENDATION] No existing recommendations for ${customerId}. Generating...`,
    );

    return true;
  }

  const [latestInteraction, latestBrowsing, latestPurchase, latestFeedback] =
    await Promise.all([
      getLatestInteractionAt(customerId),
      getLatestBrowsingAt(customerId),
      getLatestPurchaseAt(customerId),
      getLatestFeedbackCreatedAt(customerId),
    ]);

  const recommendationTime = new Date(latestRecommendation).getTime();

  const activityTimes = [
    latestInteraction,
    latestBrowsing,
    latestPurchase,
    latestFeedback,
  ]
    .filter(Boolean)
    .map((date) => new Date(date).getTime());

  // ----------------------------------------------------------
  // No customer activity after recommendation generation
  // ----------------------------------------------------------

  if (activityTimes.length === 0) {
    return false;
  }

  // ----------------------------------------------------------
  // Find the most recent customer activity
  // ----------------------------------------------------------

  const latestActivity = Math.max(...activityTimes);

  // ----------------------------------------------------------
  // New activity after recommendation generation
  // ----------------------------------------------------------

  if (latestActivity > recommendationTime) {
    console.log(
      `[RECOMMENDATION] New customer activity detected for ${customerId}.`,
    );

    console.log(
      `[RECOMMENDATION] Recommendation time: ${new Date(
        recommendationTime,
      ).toISOString()}`,
    );

    console.log(
      `[RECOMMENDATION] Latest activity time: ${new Date(
        latestActivity,
      ).toISOString()}`,
    );

    return true;
  }

  return false;
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
    console.log(
      `[RECOMMENDATION] ML returned no recommendations for ${customerId}`,
    );

    return [];
  }

  const rows = [];
  const usedProductIds = new Set();

  // ----------------------------------------------------------
  // Convert ML recommendations into real website products
  // ----------------------------------------------------------

  for (const recommendation of mlRecommendations) {
    const product = await findBestProduct(
      recommendation.category,
      recommendation.brand,
      Array.from(usedProductIds),
    );

    if (!product) {
      console.warn(
        `[RECOMMENDATION] No available product found for category=${recommendation.category}, brand=${recommendation.brand}`,
      );

      continue;
    }

    const productId = String(product.id);

    if (usedProductIds.has(productId)) {
      continue;
    }

    usedProductIds.add(productId);

    // --------------------------------------------------------
    // ML score
    // --------------------------------------------------------

    const score = Number(
      recommendation.final_score ??
        recommendation.affinity_score ??
        recommendation.score ??
        recommendation.cold_start_score ??
        0,
    );

    // --------------------------------------------------------
    // Explanation
    // --------------------------------------------------------

    const explanation =
      recommendation.explanation ||
      recommendation.reason ||
      (recommendation.recommendation_type === "cold_start"
        ? `Recommended ${product.name} because it is highly rated and currently available.`
        : `Recommended ${product.name} because it matches your recent shopping behavior.`);

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
  // DO NOT DELETE OLD RECOMMENDATIONS.
  //
  // recommendation_feedback references recommendations.
  // Deleting old recommendations can delete their feedback
  // through the FK cascade.
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

  console.log(
    `[RECOMMENDATION] Saved ${result.rows.length} recommendations for ${customerId}`,
  );

  return result.rows;
};

// ============================================================
// GENERATE FRESH RECOMMENDATIONS
// ============================================================

const generateRecommendationsForCustomer = async (customerId) => {
  console.log(
    `[RECOMMENDATION] Requesting fresh recommendations from ML for ${customerId}`,
  );

  const mlResponse = await fetchRecommendationsFromMl(customerId);

  const recommendations = mlResponse?.recommendations || [];

  const modelVersion = mlResponse?.model_version || DEFAULT_MODEL_VERSION;

  console.log(
    `[RECOMMENDATION] ML returned ${recommendations.length} recommendations`,
  );

  console.log(
    `[RECOMMENDATION] Type: ${mlResponse?.recommendation_type || "unknown"}`,
  );

  const saved = await saveRecommendationsForCustomer(
    customerId,
    recommendations,
    modelVersion,
  );

  return saved;
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

    INNER JOIN products p
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
//
// Every time the frontend requests recommendations:
// 1. Check latest recommendation timestamp.
// 2. Check latest user activity.
// 3. If user has interacted after recommendation generation,
//    call ML again.
// 4. Save a new recommendation batch.
// 5. Return the newest batch.
//
// This means the recommendation list can evolve as the user
// browses and shops.
// ============================================================

const getOrRefreshRecommendations = async (customerId) => {
  try {
    const needsRefresh = await recommendationsNeedRefresh(customerId);

    if (needsRefresh) {
      console.log(
        `[RECOMMENDATION] Refreshing recommendations for ${customerId}`,
      );

      const generated = await generateRecommendationsForCustomer(customerId);

      if (generated.length > 0) {
        console.log(
          `[RECOMMENDATION] New recommendation batch generated for ${customerId}`,
        );

        return getRecommendationsByCustomer(customerId);
      }

      console.warn(
        `[RECOMMENDATION] ML did not generate recommendations for ${customerId}`,
      );
    }

    return getRecommendationsByCustomer(customerId);
  } catch (error) {
    console.error(
      `[RECOMMENDATION] Failed to get/refresh recommendations for ${customerId}:`,
      error.response?.data || error.message || error,
    );

    throw error;
  }
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
  // Validate recommendation ownership
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
  // Save feedback
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

  console.log(
    `[RECOMMENDATION] Feedback saved: customer=${customerId}, product=${productId}, action=${action}`,
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

  // Exported for testing/debugging if needed.
  recommendationsNeedRefresh,
};
