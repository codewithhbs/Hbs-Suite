import IORedis from "ioredis";
import { env } from "./env.js";

let shared = null;

/** Shared connection for cache / rate-limit. */
export function redis() {
  if (!shared) {
    shared = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: 2, enableOfflineQueue: true });
    shared.on("error", (e) => console.warn("[redis]", e.message));
  }
  return shared;
}

/** BullMQ needs maxRetriesPerRequest: null and its own connections. */
export const bullConnection = () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const redisReady = () => shared?.status === "ready";
