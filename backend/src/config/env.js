import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  HOST: process.env.HOST || "0.0.0.0",
  // Frontend origin(s) allowed to call the API with cookies (comma separated)
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.APP_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  REDIS_URL: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  BODY_LIMIT: process.env.BODY_LIMIT || "30mb",
  API_RATE_LIMIT_PER_MIN: Number(process.env.API_RATE_LIMIT_PER_MIN || 600),
  QUEUE_PREFIX: process.env.QUEUE_PREFIX || "hbs",
};
export const isProd = env.NODE_ENV === "production";
