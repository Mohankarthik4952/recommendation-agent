const pool = require("../config/db");

const getAllProducts = async () => {
  const result = await pool.query(`
    SELECT
      id,
      name,
      description,
      category,
      brand,
      price,
      discount,
      rating,
      image_url,
      image_url AS image,
      stock,
      season
    FROM products
    ORDER BY created_at DESC
  `);

  return result.rows;
};

const getProductById = async (id) => {
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
      image_url,
      image_url AS image,
      stock,
      season
    FROM products
    WHERE id = $1
    `,
    [id],
  );

  return result.rows[0];
};

module.exports = {
  getAllProducts,
  getProductById,
};
