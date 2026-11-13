import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/hooks/use-api";
import { REFRESH_EVENT } from "@/shims/next-navigation";

/**
 * Loads one screen's data from /api/views/*.
 *  - keeps the previous data while reloading (no flicker on filter/page change)
 *  - router.refresh() (app:refresh event) re-fetches
 *  - 401 -> /login, 409 NO_TENANT -> /admin, 403 PAGE_DENIED -> /dashboard?denied=
 */
export function usePageData(url, { redirectOnAuth = true } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null, notFound: false });
  const key = url ? `${url}#${nonce}` : null;
  const navRef = useRef(navigate);
  navRef.current = navigate;
  const backTo = location.pathname + location.search;

  useEffect(() => {
    if (!url) return undefined;
    const ac = new AbortController();
    apiFetch(url, { signal: ac.signal }).then(
      (data) => setState({ key, data, error: null, notFound: false }),
      (err) => {
        if (err?.name === "AbortError") return;
        const code = err?.data?.code;
        if (redirectOnAuth && err.status === 401) return navRef.current(`/login?next=${encodeURIComponent(backTo)}`, { replace: true });
        if (code === "NO_TENANT") return navRef.current(err.data?.meta?.redirect || "/admin", { replace: true });
        if (code === "PAGE_DENIED") return navRef.current(`/dashboard?denied=${encodeURIComponent(err.data?.meta?.permission || "")}`, { replace: true });
        setState((s) => ({ key, data: s.data, error: err.status === 404 ? null : err.message || "Failed to load.", notFound: err.status === 404 }));
      },
    );
    return () => ac.abort();
  }, [key, url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onRefresh = () => setNonce((n) => n + 1);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, onRefresh);
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((next) => setState((s) => ({ ...s, data: typeof next === "function" ? next(s.data) : next })), []);
  return { data: state.data, error: state.error, notFound: state.notFound, loading: Boolean(url) && state.key !== key, reload, mutate };
}
