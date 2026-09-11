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
      bh.duration_seconds
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

const recordProductView = async (customerId, productId, duration = null) => {
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
      ($1, $2, NOW(), $3)
    RETURNING
      id,
      customer_id,
      product_id,
      viewed_at,
      duration_seconds
    `,
    [customerId, productId, duration],
  );

  return result.rows[0];
};

module.exports = {
  getPurchaseHistoryByCustomer,
  getBrowsingHistoryByCustomer,
  recordProductView,
};
