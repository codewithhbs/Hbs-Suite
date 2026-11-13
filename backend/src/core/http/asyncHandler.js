/** Wrap an async Express handler; returned objects are sent as JSON `{ ok: true, ...data }`. */
export const h = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req, res);
    if (res.headersSent || data === undefined) return;
    res.set("Cache-Control", "no-store").json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
};

/** Parse JSON from the raw /api body buffer. */
export function jsonBody(req) {
  if (req.body && !Buffer.isBuffer(req.body)) return req.body;
  if (!req.body?.length) return {};
  try {
    return JSON.parse(req.body.toString("utf8"));
  } catch {
    return {};
  }
}
