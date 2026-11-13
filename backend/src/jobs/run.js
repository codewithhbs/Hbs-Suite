import "../config/env.js";
import { JOBS } from "./handlers.js";
import { enqueue, closeQueues } from "../queues/index.js";
import { pool } from "../lib/db.js";

/**
 * Run or queue a background job by hand.
 *   npm run job -- ai.nightly            (runs inline, prints result)
 *   npm run job -- ai.nightly --queue    (hands it to the worker)
 *   npm run job -- list
 */
const [name, ...rest] = process.argv.slice(2);
if (!name || name === "list") {
  console.log(Object.entries(JOBS).map(([n, j]) => `${n.padEnd(32)} ${j.queue.padEnd(12)} ${j.cron || `every ${j.every}ms`}`).join("\n"));
  process.exit(0);
}
const job = JOBS[name];
if (!job) {
  console.error(`Unknown job "${name}". Try: npm run job -- list`);
  process.exit(1);
}
try {
  if (rest.includes("--queue")) {
    const j = await enqueue(job.queue, name, {});
    console.log(`queued ${name} (#${j.id})`);
    await closeQueues();
  } else {
    console.log(JSON.stringify(await job.run({}), null, 2));
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await pool.end().catch(() => {});
}
