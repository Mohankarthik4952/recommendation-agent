const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const findCustomerByEmail = async (email) => {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      email,
      password_hash,
      age,
      gender,
      location,
      loyalty_score,
      previous_purchase_count,
      avg_purchase_value,
      created_at
    FROM customers
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email],
  );

  return result.rows[0];
};

const findCustomerById = async (customerId) => {
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
    LIMIT 1
    `,
    [customerId],
  );

  return result.rows[0];
};

const createCustomer = async ({
  id,
  name,
  email,
  password,
  age,
  gender,
  location,
}) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
    INSERT INTO customers
    (
      id,
      name,
      email,
      password_hash,
      age,
      gender,
      location,
      loyalty_score,
      previous_purchase_count,
      avg_purchase_value
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0)
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
      id,
      name,
      email,
      passwordHash,
      age || null,
      gender || null,
      location || null,
    ],
  );

  return result.rows[0];
};

const verifyPassword = async (password, passwordHash) => {
  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  findCustomerByEmail,
  findCustomerById,
  createCustomer,
  verifyPassword,
};
