import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { pool } from "./lib/db.js";
import { redis } from "./config/redis.js";

/**
 * HTTP API process. Background work (cron, mail, AI runs) lives in the
 * worker process: `npm run worker` (see src/workers/index.js).
 */
async function boot() {
  try {
    const { hydrateEnvFromIntegrations } = await import("./lib/integrations/store.js");
    await hydrateEnvFromIntegrations({ fresh: true });
  } catch (err) {
    console.error("[boot] integration settings not loaded:", err.message);
  }
  redis(); // warm the shared connection (cache + rate limit)

  const app = createApp();
  const server = http.createServer(app);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 0; // long AI runs / SSE are allowed; Nginx enforces its own limits
  server.listen(env.PORT, env.HOST, () => console.log(`[api] listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`));

  // refresh admin-managed integration keys every 5 min (was done by the scheduler)
  setInterval(() => import("./lib/integrations/store.js").then((m) => m.hydrateEnvFromIntegrations({ fresh: true })).catch(() => {}), 5 * 60 * 1000).unref();

  const shutdown = (sig) => {
    console.log(`[api] ${sig} - closing`);
    server.close(async () => {
      await pool.end().catch(() => {});
      await redis().quit().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

boot();
