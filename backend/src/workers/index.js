import "../config/env.js";
import { Worker } from "bullmq";
import { bullConnection } from "../config/redis.js";
import { env } from "../config/env.js";
import { QUEUES, queue, closeQueues } from "../queues/index.js";
import { JOBS } from "../jobs/handlers.js";
import { pool } from "../lib/db.js";

/**
 * Worker process (replaces scripts/scheduler.js + scripts/mailWorker.js):
 *   - registers every repeatable job with BullMQ (idempotent upsert, so
 *     running several worker instances never fires a cron twice)
 *   - consumes the queues with per-queue concurrency
 * Run: npm run worker   (PM2: hbs-worker)
 */
const TZ = process.env.TZ || "Asia/Kolkata";
const CONCURRENCY = {
  mail: Number(process.env.MAIL_CONCURRENCY || 2),
  ai: Number(process.env.AI_WORKER_CONCURRENCY || 1),
  publishing: Number(process.env.PUBLISH_CONCURRENCY || 1),
  maintenance: Number(process.env.MAINTENANCE_CONCURRENCY || 2),
};
const log = (...a) => console.log(`[worker ${new Date().toISOString()}]`, ...a);

async function registerSchedules() {
  const disabled = new Set(String(process.env.DISABLED_JOBS || "").split(",").map((s) => s.trim()).filter(Boolean));
  for (const [name, job] of Object.entries(JOBS)) {
    const q = queue(job.queue);
    if (disabled.has(name)) {
      await q.removeJobScheduler(name).catch(() => {});
      continue;
    }
    const repeat = job.every ? { every: job.every } : { pattern: job.cron, tz: TZ };
    await q.upsertJobScheduler(name, repeat, { name, data: {}, opts: { removeOnComplete: { count: 50 }, removeOnFail: { count: 200 } } });
  }
  log("schedules registered:", Object.keys(JOBS).filter((n) => !disabled.has(n)).join(", "));
}

async function main() {
  try {
    const { hydrateEnvFromIntegrations } = await import("../lib/integrations/store.js");
    await hydrateEnvFromIntegrations({ fresh: true });
  } catch (err) {
    log("integration settings not loaded:", err.message);
  }
  await registerSchedules();

  const workers = QUEUES.map((name) => {
    const w = new Worker(
      name,
      async (job) => {
        const def = JOBS[job.name];
        if (!def) throw new Error(`Unknown job ${job.name}`);
        return def.run(job.data || {});
      },
      {
        connection: bullConnection(),
        prefix: env.QUEUE_PREFIX,
        concurrency: CONCURRENCY[name] || 1,
        // AI runs can take many minutes - keep the lock alive
        lockDuration: name === "ai" ? 15 * 60 * 1000 : 5 * 60 * 1000,
      },
    );
    w.on("completed", (job, r) => {
      if (job.name === "mail.drain" && !(r?.sent || r?.failed)) return;
      if (job.name === "maintenance.heartbeat") return;
      log(`${job.name} done`, JSON.stringify(r ?? {}).slice(0, 300));
    });
    w.on("failed", (job, err) => log(`${job?.name} FAILED:`, err?.message));
    w.on("error", (err) => log(`[${name}] worker error:`, err.message));
    return w;
  });
  log(`started: ${QUEUES.map((q) => `${q}x${CONCURRENCY[q]}`).join(", ")}`);

  const shutdown = async () => {
    log("shutting down");
    await Promise.all(workers.map((w) => w.close().catch(() => {})));
    await closeQueues();
    await pool.end().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
