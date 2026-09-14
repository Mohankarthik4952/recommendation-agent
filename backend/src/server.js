require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Check PostgreSQL connection before starting the server
    await pool.query("SELECT NOW()");

    console.log("PostgreSQL connection successful");

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("======================================");
      console.log("Personalized Retail Recommendation");
      console.log("======================================");
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Backend running on port ${PORT}`);
      console.log(`Server address: http://0.0.0.0:${PORT}`);
      console.log("======================================");
    });

    // Graceful shutdown for Render
    const gracefulShutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log("HTTP server closed.");

        try {
          await pool.end();
          console.log("PostgreSQL connection pool closed.");
        } catch (error) {
          console.error("Error closing PostgreSQL pool:", error.message);
        }

        process.exit(0);
      });

      // Force shutdown if graceful shutdown takes too long
      setTimeout(() => {
        console.error("Forced shutdown.");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);

    process.exit(1);
  }
};

startServer();
