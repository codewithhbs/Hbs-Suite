/**
 * Cleans duplicate clients (left by failed / repeated Google connects).
 *   npm run fix:duplicates                 dry run, every workspace
 *   npm run fix:duplicates -- --apply      apply
 *   npm run fix:duplicates -- --tenant=7   one workspace
 *
 * Same Google listing on several clients -> keep the one with most posts/tasks
 * (then oldest); empty copies deleted, copies with work UNLINKED (history kept).
 * Same name + city, unlinked and empty -> deleted.
 */
import "dotenv/config";
import { query, pool } from "../src/lib/db.js";
import { findDuplicateClients, removeDuplicateClients } from "../src/lib/repo/duplicates.js";

const apply = process.argv.includes("--apply");
const only = Number((process.argv.find((a) => a.startsWith("--tenant=")) || "").split("=")[1]) || null;
const tenants = only ? [{ id: only, name: `#${only}` }] : await query("SELECT id, name FROM tenants ORDER BY id");

let removed = 0;
let unlinked = 0;
for (const t of tenants) {
  const r = apply ? await removeDuplicateClients(t.id) : await findDuplicateClients(t.id);
  if (!r.groups.length) continue;
  const rm = r.groups.reduce((n, g) => n + g.remove.length, 0);
  const ul = r.groups.reduce((n, g) => n + g.unlink.length, 0);
  removed += rm;
  unlinked += ul;
  console.log(`\n${t.name} (tenant ${t.id}): ${rm} to delete, ${ul} to unlink${apply ? " - DONE" : ""}`);
  for (const g of r.groups) {
    const what = g.type === "same_listing" ? `same Google listing ${g.location}` : "same name + city";
    console.log(
      `  - ${g.business_name}${g.city ? `, ${g.city}` : ""} (${what}): keep #${g.keep.join(", #")}` +
        (g.remove.length ? ` | delete #${g.remove.join(", #")}` : "") +
        (g.unlink.length ? ` | unlink #${g.unlink.join(", #")} (has posts/tasks)` : ""),
    );
  }
}
console.log(`\n${removed} to delete, ${unlinked} to unlink - ${apply ? "applied. Now run: npm run db:migrate" : "dry run. Add --apply to do it."}`);
await pool.end();