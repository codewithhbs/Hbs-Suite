export class HttpError extends Error {
  constructor(status, message, code = null, meta = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

export const notFound = (msg = "Not found") => new HttpError(404, msg, "NOT_FOUND");
export const badRequest = (msg = "Bad request") => new HttpError(400, msg, "BAD_REQUEST");

/** Express error middleware - same JSON shape the frontend already expects. */
export function errorHandler(err, req, res, _next) {
  const status = err?.status >= 400 && err?.status < 600 ? err.status : err?.type === "entity.too.large" ? 413 : 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  if (res.headersSent) return res.end();
  res.status(status).json({
    ok: false,
    error: status === 500 ? "Something went wrong" : err.message,
    code: err?.code || null,
    meta: err?.meta || null,
    ...(err?.location ? { redirect: err.location } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.path}` });
}
