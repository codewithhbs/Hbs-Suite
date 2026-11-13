import { Readable } from "node:stream";
import { toExpress } from "../../shims/next-headers.js";

/**
 * Bridges a Web-standard handler `(request, { params }) => Response`
 * to Express. Body arrives as a raw Buffer (express.raw on /api), so
 * request.json(), .text(), .formData() and webhook signatures all work.
 */
export function adapt(handler) {
  if (typeof handler !== "function") throw new Error("adapt(): handler missing");
  return async function adapted(req, res, next) {
    const ac = new AbortController();
    res.on("close", () => {
      if (!res.writableEnded) ac.abort();
    });
    try {
      const request = toWebRequest(req, ac.signal);
      const p = { ...req.params };
      const response = await handler(request, { params: Object.assign(Promise.resolve(p), p) });
      await sendWebResponse(res, response);
    } catch (err) {
      next(err);
    }
  };
}

export function toWebRequest(req, signal) {
  const url = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, String(v));
  }
  const hasBody = !["GET", "HEAD"].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
  return new Request(url, { method: req.method, headers, body: hasBody ? req.body : undefined, signal, duplex: "half" });
}

export async function sendWebResponse(res, response) {
  if (!response) return res.status(204).end();
  if (!(response instanceof Response)) return res.json(response);

  for (const c of response.__cookies || []) {
    if (c.op === "set") res.cookie(c.name, c.value, toExpress(c.opts));
    else res.clearCookie(c.name, { path: c.opts?.path || "/" });
  }
  res.status(response.status);
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  response.headers.forEach((value, key) => {
    if (key === "set-cookie") return;
    res.setHeader(key, value);
  });
  for (const sc of setCookies) res.append("Set-Cookie", sc);

  if (!response.body) return res.end();
  const ct = response.headers.get("content-type") || "";
  if (ct.includes("text/event-stream")) {
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
  }
  await new Promise((resolve, reject) => {
    const stream = Readable.fromWeb(response.body);
    stream.on("error", (e) => (res.headersSent ? (res.destroy(e), resolve()) : reject(e)));
    res.on("close", () => {
      stream.destroy();
      resolve();
    });
    stream.pipe(res);
  });
}
