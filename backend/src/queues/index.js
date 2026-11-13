import { Queue } from "bullmq";
import { bullConnection } from "../config/redis.js";
import { env } from "../config/env.js";

/**
 * BullMQ queues. Split by workload so a slow AI run never delays mail:
 *   mail        - drain email_queue (fast, frequent)
 *   ai          - nightly AI generation (long, CPU/network heavy)
 *   publishing  - calendar auto-post + auto-publish (time sensitive)
 *   maintenance - billing, housekeeping, cleanup, health, reviews, listings
 */
export const QUEUES = ["mail", "ai", "publishing", "maintenance"];

const cache = new Map();
export function queue(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      new Queue(name, {
        connection: bullConnection(),
        prefix: env.QUEUE_PREFIX,
        defaultJobOptions: { removeOnComplete: { count: 200, age: 86400 }, removeOnFail: { count: 500, age: 7 * 86400 }, attempts: 1 },
      }),
    );
  }
  return cache.get(name);
}

/** Fire a job now (e.g. from an admin button or the CLI). */
export const enqueue = (queueName, jobName, data = {}, opts = {}) => queue(queueName).add(jobName, data, opts);

export async function closeQueues() {
  await Promise.all([...cache.values()].map((q) => q.close().catch(() => {})));
}
