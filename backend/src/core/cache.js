import { redis, redisReady } from "../config/redis.js";

/**
 * Read-through Redis cache. Falls straight through to `fn` when Redis is down,
 * so caching can never break a request.
 *   const stats = await cached(`stats:${tenantId}`, 30, () => dashboardStats(tenantId));
 */
export async function cached(key, ttlSeconds, fn) {
  const k = `cache:${key}`;
  if (redisReady()) {
    try {
      const hit = await redis().get(k);
      if (hit) return JSON.parse(hit);
    } catch {}
  }
  const value = await fn();
  if (redisReady() && value !== undefined) {
    redis().set(k, JSON.stringify(value), "EX", ttlSeconds).catch(() => {});
  }
  return value;
}

/** Drop cache keys by prefix, e.g. invalidate(`stats:${tenantId}`). */
export async function invalidate(prefix) {
  if (!redisReady()) return;
  const r = redis();
  let cursor = "0";
  do {
    const [next, keys] = await r.scan(cursor, "MATCH", `cache:${prefix}*`, "COUNT", 200);
    cursor = next;
    if (keys.length) await r.del(...keys);
  } while (cursor !== "0");
}
