const { Pool } = require("pg");

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

let pool;

function getPool() {
  if (pool) return pool;
  const connectionString = mustGetEnv("DATABASE_URL");
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  return pool;
}

module.exports = { getPool };

