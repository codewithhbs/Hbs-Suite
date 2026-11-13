/**
 * Loads every module once - catches broken imports / syntax after edits.
 *   npm run check
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("src");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const skip = /(server|workers[\\/]index|jobs[\\/]run)\.js$/;
let bad = 0;
for (const f of walk(root).filter((f) => f.endsWith(".js") && !skip.test(f))) {
  try {
    await import(pathToFileURL(f).href);
  } catch (err) {
    bad++;
    console.error("✗", path.relative(root, f), "-", err.message.split("\n")[0]);
  }
}
console.log(bad ? `${bad} file(s) failed` : "all modules load");
process.exit(bad ? 1 : 0);
