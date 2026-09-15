const { Pool } = require("pg");

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,

      // Render PostgreSQL internal connection
      // does not require SSL in this setup.
      ssl: false,
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || "retail_recommendation_v2",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    };

// ============================================================
// CONNECTION POOL
// ============================================================

const pool = new Pool(config);

// ============================================================
// DATABASE CONNECTION TEST
// ============================================================

pool.on("connect", () => {
  console.log("PostgreSQL database connected");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

// ============================================================
// EXPORT
// ============================================================

module.exports = pool;
