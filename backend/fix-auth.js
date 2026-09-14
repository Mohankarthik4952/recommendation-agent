const bcrypt = require("bcryptjs");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Mohan%404952@localhost:5432/retail_recommendation_v2",
  ssl: false,
});

const ensureCustomer = async ({
  id,
  name,
  email,
  password,
  age,
  gender,
  location,
}) => {
  const passwordHash = bcrypt.hashSync(password, 10);

  const row = (
    await client.query(
      `
        INSERT INTO customers
          (id, name, email, password_hash, age, gender, location, loyalty_score, previous_purchase_count, avg_purchase_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0)
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          age = EXCLUDED.age,
          gender = EXCLUDED.gender,
          location = EXCLUDED.location
        RETURNING id, email, password_hash
      `,
      [id, name, email, passwordHash, age, gender, location],
    )
  ).rows[0];

  const valid = bcrypt.compareSync(password, row.password_hash);

  console.log(`${email}: ${valid ? "password matches" : "password mismatch"}`);

  return row;
};

(async () => {
  try {
    await client.connect();

    await ensureCustomer({
      id: "CUST001",
      name: "Karthik",
      email: "karthik@example.com",
      password: "demo123",
      age: 22,
      gender: "Male",
      location: "Bengaluru, India",
    });

    await client.end();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
})();
