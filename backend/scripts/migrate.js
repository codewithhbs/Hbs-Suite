/**
 * Applies db/migrations/*.sql in name order, once each (tracked in schema_migrations).
 * Statements run one by one; "already exists" errors (duplicate index/column) are skipped,
 * so it is safe on MySQL 8 and MariaDB alike.
 *   npm run db:migrate
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const SKIP = new Set(["ER_DUP_KEYNAME", "ER_DUP_FIELDNAME", "ER_TABLE_EXISTS_ERROR", "ER_CANT_DROP_FIELD_OR_KEY"]);
const dir = path.resolve("db/migrations");
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "gmb_ai",
});
await conn.query("CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");
const [done] = await conn.query("SELECT name FROM schema_migrations");
const applied = new Set(done.map((r) => r.name));
const pending = [];

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/^\s*--.*$/gm, "");
  const statements = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter(Boolean);
  console.log(`> ${file} (${statements.length} statements)`);
  let blocked = false;
  for (const st of statements) {
    try {
      await conn.query(st);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        // existing data violates a new unique index - leave the migration pending
        console.warn(`  ! ${err.message}\n    Clean the data first (npm run fix:duplicates -- --apply), then run db:migrate again.`);
        blocked = true;
        continue;
      }
      if (!SKIP.has(err.code)) throw new Error(`${file}: ${err.message}\n${st}`);
      console.log(`  skip (${err.code})`);
    }
  }
  if (blocked) {
    pending.push(file);
    continue;
  }
  await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
}
console.log(pending.length ? `${pending.length} migration(s) still pending: ${pending.join(", ")}` : "migrations up to date");
await conn.end();