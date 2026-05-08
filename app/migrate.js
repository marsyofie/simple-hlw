const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "helloworld";
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function log(message, extra = {}) {
  console.log(JSON.stringify({ message, timestamp: new Date().toISOString(), ...extra }));
}

async function listMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    log("database ensured", { database: DB_NAME });
  } finally {
    await connection.end();
  }
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedMigrations(connection) {
  const [rows] = await connection.query("SELECT filename FROM schema_migrations ORDER BY filename");
  return new Set(rows.map((row) => row.filename));
}

async function run() {
  await ensureDatabase();

  const files = await listMigrationFiles();
  if (files.length === 0) {
    log("no migration files found", { directory: MIGRATIONS_DIR });
    return;
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    await ensureMigrationsTable(connection);
    const applied = await appliedMigrations(connection);

    for (const file of files) {
      if (applied.has(file)) {
        log("migration skipped", { file });
        continue;
      }

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      log("running migration", { file });
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migrations (filename) VALUES (?)", [file]);
      log("migration applied", { file });
    }

    log("migrations complete", { database: DB_NAME });
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify({
      message: "migration failed",
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(1);
});
