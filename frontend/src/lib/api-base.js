/**
 * API origin. Empty = same origin (recommended: Nginx proxies /api to the
 * Express server, Vite does the same in dev). Set VITE_API_URL only when the
 * API lives on another (same-site) host, e.g. https://api.hbssuite.com.
 */
export const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const needsPrefix = (u) => typeof u === "string" && (u.startsWith("/api/") || u === "/api" || u === "/sw.js" || u === "/manifest.webmanifest");

export const apiUrl = (u) => (API_URL && needsPrefix(u) ? `${API_URL}${u}` : u);

/** Route every fetch("/api/...") to the API with cookies (session) attached. */
export function installFetchBridge() {
  if (typeof window === "undefined" || window.__apiBridge) return;
  window.__apiBridge = true;
  const native = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    if (needsPrefix(input)) {
      return native(apiUrl(input), { credentials: "include", ...init });
    }
    return native(input, init);
  };
}
