const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const client = new Client({
  connectionString:
    "postgresql://postgres:Mohan%404952@localhost:5432/retail_recommendation_v2",
  ssl: false,
});

(async () => {
  await client.connect();

  const demoHash = bcrypt.hashSync("demo123", 10);
  const mlHash = bcrypt.hashSync("password123", 10);

  await client.query(
    "UPDATE customers SET password_hash = $1 WHERE email = $2",
    [demoHash, "karthik@example.com"],
  );

  await client.query(
    "UPDATE customers SET password_hash = $1 WHERE email = $2",
    [mlHash, "mltest@example.com"],
  );

  const rows = await client.query(
    "SELECT id, email, password_hash FROM customers WHERE email IN ('karthik@example.com', 'mltest@example.com') ORDER BY email",
  );

  console.log(JSON.stringify(rows.rows, null, 2));
  console.log(
    "demo-valid",
    bcrypt.compareSync("demo123", rows.rows[0].password_hash),
  );
  console.log(
    "ml-valid",
    bcrypt.compareSync("password123", rows.rows[1].password_hash),
  );

  await client.end();
})().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
