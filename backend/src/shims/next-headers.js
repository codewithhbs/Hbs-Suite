import { currentStore } from "../core/requestContext.js";

/** next/headers cookies() on top of Express (cookie-parser + res.cookie). */
export async function cookies() {
  const store = currentStore();
  const req = store?.req;
  const res = store?.res;
  const jar = req?.cookies || {};
  return {
    get(name) {
      return jar[name] !== undefined ? { name, value: jar[name] } : undefined;
    },
    getAll() {
      return Object.entries(jar).map(([name, value]) => ({ name, value }));
    },
    has(name) {
      return jar[name] !== undefined;
    },
    set(name, value, opts = {}) {
      if (typeof name === "object") ({ name, value, ...opts } = name);
      if (!res || res.headersSent) return;
      res.cookie(name, value, toExpress(opts));
      jar[name] = value;
    },
    delete(name) {
      const o = typeof name === "object" ? name : { name };
      if (!res || res.headersSent) return;
      res.clearCookie(o.name, { path: o.path || "/", domain: o.domain });
      delete jar[o.name];
    },
  };
}

export async function headers() {
  const req = currentStore()?.req;
  return new Headers(Object.entries(req?.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
}

export function toExpress(o = {}) {
  const out = { path: o.path || "/" };
  if (o.httpOnly !== undefined) out.httpOnly = o.httpOnly;
  if (o.secure !== undefined) out.secure = o.secure;
  if (o.sameSite) out.sameSite = o.sameSite;
  if (o.domain) out.domain = o.domain;
  if (o.maxAge !== undefined) out.maxAge = Number(o.maxAge) * 1000; // Next = seconds, Express = ms
  if (o.expires) out.expires = new Date(o.expires);
  if (process.env.COOKIE_DOMAIN && !out.domain) out.domain = process.env.COOKIE_DOMAIN;
  return out;
}
