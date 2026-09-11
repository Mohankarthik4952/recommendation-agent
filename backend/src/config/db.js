const { Pool } = require("pg");

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "retail_recommendation",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool(config);

pool.on("connect", () => {
  console.log("PostgreSQL database connected");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;
