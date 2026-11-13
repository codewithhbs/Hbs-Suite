import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env, isProd } from "./config/env.js";
import { redis } from "./config/redis.js";
import { requestContext } from "./core/requestContext.js";
import { errorHandler, notFoundHandler } from "./core/http/errors.js";
import { registerModules } from "./modules/index.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
  app.set("etag", false);

  app.use(
    helmet({
      contentSecurityPolicy: false, // JSON API; the SPA sets its own CSP
      crossOriginResourcePolicy: { policy: "cross-origin" }, // media/QR images used by the SPA
      frameguard: { action: "sameorigin" },
      hsts: isProd ? { maxAge: 63072000, includeSubDomains: true } : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.use(
    cors({
      origin(origin, cb) {
        // same-origin / server-to-server (no Origin) and whitelisted SPA origins
        if (!origin || env.CORS_ORIGINS.includes(origin.replace(/\/$/, ""))) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      exposedHeaders: ["Content-Disposition", "Retry-After"],
    }),
  );

  // never gzip Server-Sent Events (notification stream)
  app.use(compression({ filter: (req, res) => !String(res.getHeader("Content-Type") || "").includes("text/event-stream") && compression.filter(req, res) }));
  app.use(cookieParser());
  app.use(requestContext);

  app.get("/healthz", (_req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

  // Global API flood guard (per IP, shared across PM2 instances via Redis).
  // Fine-grained limits (login, OTP, public API keys) still live in lib/security + lib/api.
  const limiterStore = (() => {
    try {
      return new RedisStore({ sendCommand: (...args) => redis().call(...args), prefix: `${env.QUEUE_PREFIX}:rl:` });
    } catch {
      return undefined;
    }
  })();
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: env.API_RATE_LIMIT_PER_MIN,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      store: limiterStore,
      passOnStoreError: true,
      skip: (req) => /^\/api\/(payments\/razorpay\/webhook|meta\/webhook|gmb\/pubsub|notifications\/stream)/.test(req.originalUrl),
      message: { ok: false, error: "Too many requests - slow down a little.", code: "RATE_LIMITED" },
    }),
  );

  // Raw body for every API call: handlers read request.json()/formData()/text()
  // (webhook signatures need the exact bytes).
  app.use("/api", express.raw({ type: () => true, limit: env.BODY_LIMIT }));

  registerModules(app);

  app.use("/api", notFoundHandler);
  app.use(errorHandler);
  return app;
}
