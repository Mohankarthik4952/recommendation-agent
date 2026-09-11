require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT NOW()");

    console.log("PostgreSQL connection successful");

    app.listen(PORT, () => {
      console.log("======================================");
      console.log("Personalized Retail Recommendation");
      console.log(`Backend running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
      console.log("======================================");
    });
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);

    process.exit(1);
  }
};

startServer();
