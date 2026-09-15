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
  const result = await pool.query(
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
    [
      customerId,
      productId,
      Number.isFinite(Number(duration)) ? Number(duration) : 0,
    ],
  );

  return result.rows[0];
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
  getPurchaseHistoryByCustomer,
  getBrowsingHistoryByCustomer,
  recordProductView,

  getSavedProductsByCustomer,
  getSavedItemCountByCustomer,
  isProductSavedByCustomer,
  saveProductForCustomer,
  removeSavedProductForCustomer,
  toggleSavedProduct,

  getDashboardStatsByCustomer,
};
