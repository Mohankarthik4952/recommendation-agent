const pool = require("../config/db");

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

const getCustomerById = async (customerId) => {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      email,
      age,
      gender,
      location,
      loyalty_score,
      previous_purchase_count,
      avg_purchase_value,
      created_at
    FROM customers
    WHERE id = $1
    `,
    [customerId],
  );

  return result.rows[0];
};

// ============================================================
// UPDATE CUSTOMER
// ============================================================

const updateCustomer = async (customerId, customerData) => {
  const {
    name,
    age,
    gender,
    location,
    loyalty_score,
    previous_purchase_count,
    avg_purchase_value,
  } = customerData;

  const result = await pool.query(
    `
    UPDATE customers
    SET
      name = COALESCE($1, name),
      age = COALESCE($2, age),
      gender = COALESCE($3, gender),
      location = COALESCE($4, location),
      loyalty_score = COALESCE($5, loyalty_score),
      previous_purchase_count = COALESCE($6, previous_purchase_count),
      avg_purchase_value = COALESCE($7, avg_purchase_value)
    WHERE id = $8
    RETURNING
      id,
      name,
      email,
      age,
      gender,
      location,
      loyalty_score,
      previous_purchase_count,
      avg_purchase_value,
      created_at
    `,
    [
      name ?? null,
      age ?? null,
      gender ?? null,
      location ?? null,
      loyalty_score ?? null,
      previous_purchase_count ?? null,
      avg_purchase_value ?? null,
      customerId,
    ],
  );

  return result.rows[0];
};

module.exports = {
  getCustomerById,
  updateCustomer,
};
