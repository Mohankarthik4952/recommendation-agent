const pool = require("../config/db");

// ============================================================
// GET PURCHASE HISTORY
// ============================================================

const getPurchaseHistoryByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT
      pu.id,
      pu.customer_id,
      pu.product_id,
      p.name,
      p.category,
      p.image_url AS image,
      pu.quantity,
      pu.price,
      pu.purchased_at
    FROM purchases pu
    LEFT JOIN products p
      ON p.id = pu.product_id
    WHERE pu.customer_id = $1
    ORDER BY pu.purchased_at DESC
    `,
    [customerId],
  );

  return result.rows;
};

// ============================================================
// GET BROWSING HISTORY
// ============================================================

const getBrowsingHistoryByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT
      bh.id,
      bh.customer_id,
      bh.product_id,
      p.name,
      p.category,
      p.image_url AS image,
      bh.viewed_at,
      COALESCE(bh.duration_seconds, 0) AS duration_seconds
    FROM browsing_history bh
    LEFT JOIN products p
      ON p.id = bh.product_id
    WHERE bh.customer_id = $1
    ORDER BY bh.viewed_at DESC
    `,
    [customerId],
  );

  return result.rows;
};

// ============================================================
// RECORD PRODUCT VIEW
// ============================================================

const recordProductView = async (customerId, productId, duration = 0) => {
  const durationSeconds = Number.isFinite(Number(duration))
    ? Number(duration)
    : 0;

  // ----------------------------------------------------------
  // 1. Record in browsing_history
  // ----------------------------------------------------------

  const browsingResult = await pool.query(
    `
    INSERT INTO browsing_history
    (
      customer_id,
      product_id,
      viewed_at,
      duration_seconds
    )
    VALUES
    (
      $1,
      $2,
      NOW(),
      $3
    )
    RETURNING
      id,
      customer_id,
      product_id,
      viewed_at,
      duration_seconds
    `,
    [customerId, productId, durationSeconds],
  );

  // ----------------------------------------------------------
  // 2. Record in customer_interactions
  // ----------------------------------------------------------
  // The recommendation engine reads customer_interactions.
  // Therefore every product view must also be recorded there.
  // ----------------------------------------------------------

  await pool.query(
    `
    INSERT INTO customer_interactions
    (
      customer_id,
      product_id,
      timestamp,
      interaction_type
    )
    VALUES
    (
      $1,
      $2,
      NOW(),
      'view'
    )
    `,
    [customerId, productId],
  );

  return browsingResult.rows[0];
};

// ============================================================
// RECORD CUSTOMER INTERACTION
// ============================================================

/**
 * Record a customer interaction for the recommendation engine.
 *
 * Supported interaction types:
 *
 *   view
 *   click
 *   add_to_cart
 *   like
 *
 * Product information is automatically retrieved from the
 * products table and stored along with the interaction.
 */

const recordCustomerInteraction = async (
  customerId,
  productId,
  interactionType,
) => {
  // ----------------------------------------------------------
  // Validate interaction type
  // ----------------------------------------------------------

  const allowedInteractionTypes = ["view", "click", "add_to_cart", "like"];

  if (!allowedInteractionTypes.includes(interactionType)) {
    throw new Error(
      `Invalid interaction type. Supported types: ${allowedInteractionTypes.join(
        ", ",
      )}`,
    );
  }

  // ----------------------------------------------------------
  // Validate product exists
  // ----------------------------------------------------------

  const productResult = await pool.query(
    `
    SELECT
      id,
      category,
      brand,
      price,
      discount,
      rating
    FROM products
    WHERE id = $1
    LIMIT 1
    `,
    [productId],
  );

  if (productResult.rows.length === 0) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const product = productResult.rows[0];

  // ----------------------------------------------------------
  // Insert interaction
  // ----------------------------------------------------------

  const result = await pool.query(
    `
    INSERT INTO customer_interactions
    (
      customer_id,
      product_id,
      timestamp,
      interaction_type,
      price,
      discount,
      rating
    )
    VALUES
    (
      $1,
      $2,
      NOW(),
      $3,
      $4,
      $5,
      $6
    )
    RETURNING
      id,
      customer_id,
      product_id,
      timestamp,
      interaction_type,
      price,
      discount,
      rating
    `,
    [
      customerId,
      productId,
      interactionType,
      product.price,
      product.discount || 0,
      product.rating,
    ],
  );

  return {
    interaction: result.rows[0],
    product: {
      product_id: product.id,
      category: product.category,
      brand: product.brand,
      price: Number(product.price || 0),
      discount: Number(product.discount || 0),
      rating: product.rating !== null ? Number(product.rating) : null,
    },
  };
};

// ============================================================
// GET SAVED ITEMS
// ============================================================

const getSavedProductsByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT
      sp.id,
      sp.customer_id,
      sp.product_id,
      sp.created_at,
      p.name,
      p.category,
      p.brand,
      p.price,
      p.description,
      p.image_url AS image,
      p.stock,
      p.rating
    FROM saved_products sp
    LEFT JOIN products p
      ON p.id = sp.product_id
    WHERE sp.customer_id = $1
    ORDER BY sp.created_at DESC
    `,
    [customerId],
  );

  return result.rows;
};

// ============================================================
// GET SAVED ITEM COUNT
// ============================================================

const getSavedItemCountByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM saved_products
    WHERE customer_id = $1
    `,
    [customerId],
  );

  return Number(result.rows[0]?.count || 0);
};

// ============================================================
// CHECK IF PRODUCT IS SAVED
// ============================================================

const isProductSavedByCustomer = async (customerId, productId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM saved_products
    WHERE customer_id = $1
      AND product_id = $2
    LIMIT 1
    `,
    [customerId, productId],
  );

  return result.rows.length > 0;
};

// ============================================================
// SAVE PRODUCT
// ============================================================

const saveProductForCustomer = async (customerId, productId) => {
  const result = await pool.query(
    `
    INSERT INTO saved_products
    (
      customer_id,
      product_id
    )
    VALUES
    (
      $1,
      $2
    )
    ON CONFLICT (customer_id, product_id)
    DO NOTHING
    RETURNING
      id,
      customer_id,
      product_id,
      created_at
    `,
    [customerId, productId],
  );

  if (result.rows.length > 0) {
    return {
      saved: true,
      item: result.rows[0],
    };
  }

  return {
    saved: true,
    item: null,
  };
};

// ============================================================
// REMOVE SAVED PRODUCT
// ============================================================

const removeSavedProductForCustomer = async (customerId, productId) => {
  const result = await pool.query(
    `
    DELETE FROM saved_products
    WHERE customer_id = $1
      AND product_id = $2
    RETURNING
      id,
      customer_id,
      product_id
    `,
    [customerId, productId],
  );

  return {
    saved: false,
    item: result.rows[0] || null,
  };
};

// ============================================================
// TOGGLE SAVED PRODUCT
// ============================================================

const toggleSavedProduct = async (customerId, productId) => {
  const existing = await isProductSavedByCustomer(customerId, productId);

  if (existing) {
    return removeSavedProductForCustomer(customerId, productId);
  }

  return saveProductForCustomer(customerId, productId);
};

// ============================================================
// GET DASHBOARD STATISTICS
// ============================================================

const getDashboardStatsByCustomer = async (customerId) => {
  const result = await pool.query(
    `
    SELECT

      (
        SELECT COUNT(*)
        FROM browsing_history
        WHERE customer_id = $1
      ) AS products_viewed,

      (
        SELECT COUNT(*)
        FROM saved_products
        WHERE customer_id = $1
      ) AS saved_items,

      (
        SELECT COALESCE(SUM(quantity), 0)
        FROM purchases
        WHERE customer_id = $1
      ) AS purchases
    `,
    [customerId],
  );

  const row = result.rows[0];

  return {
    products_viewed: Number(row.products_viewed || 0),

    saved_items: Number(row.saved_items || 0),

    purchases: Number(row.purchases || 0),
  };
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Purchase history
  getPurchaseHistoryByCustomer,

  // Browsing history
  getBrowsingHistoryByCustomer,

  // Product view
  recordProductView,

  // Customer interaction
  recordCustomerInteraction,

  // Saved products
  getSavedProductsByCustomer,
  getSavedItemCountByCustomer,
  isProductSavedByCustomer,
  saveProductForCustomer,
  removeSavedProductForCustomer,
  toggleSavedProduct,

  // Dashboard
  getDashboardStatsByCustomer,
};
