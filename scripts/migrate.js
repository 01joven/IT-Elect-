const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");
require("dotenv").config();

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function getAppliedMigrations(client) {
  const res = await client.query("select id from migrations order by id asc;");
  return new Set(res.rows.map((r) => r.id));
}

async function applyMigrationFile(client, id, sql) {
  await client.query("begin;");
  try {
    await client.query(sql);
    await client.query("insert into migrations (id) values ($1);", [id]);
    await client.query("commit;");
  } catch (err) {
    await client.query("rollback;");
    throw err;
  }
}

async function main() {
  const databaseUrl = mustGetEnv("DATABASE_URL");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d+_.+\.sql$/.test(f))
      .sort();

    if (files.length === 0) {
      console.log("No migrations found.");
      return;
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping (already applied): ${file}`);
        continue;
      }
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, "utf8");
      console.log(`Applying: ${file}`);
      await applyMigrationFile(client, file, sql);
    }

    console.log("Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

