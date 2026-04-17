const fs = require("fs/promises");
const path = require("path");
const { getPool, closePool, isDatabaseConfigured } = require("../config/database");

const migrationsDir = path.resolve(__dirname, "../db/migrations");

async function ensureMigrationsTable() {
  const pool = getPool();
  await pool.query(`
    create table if not exists schema_migrations (
      id bigserial primary key,
      filename text not null unique,
      applied_at timestamptz not null default now()
    )
  `);
}

async function getAppliedMigrations() {
  const pool = getPool();
  const result = await pool.query("select filename from schema_migrations order by filename asc");
  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(filename) {
  const pool = getPool();
  const filePath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(filePath, "utf8");
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migrations (filename) values ($1)", [filename]);
    await client.query("commit");
    console.log(`Applied migration ${filename}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set. Add it before running migrations.");
  }

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const filename of pending) {
    await applyMigration(filename);
  }
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });