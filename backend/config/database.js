const { Pool } = require("pg");
require("dotenv").config();

// Use DATABASE_URL if available (Vercel/production), otherwise use individual env vars (local development)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL from Neon
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  // Development: Use individual environment variables
  poolConfig = {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "visnet_elearning_dev",
    user: process.env.DB_USER || "visnet_user",
    password: process.env.DB_PASSWORD || "visnet_password_2024",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

// Test connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
