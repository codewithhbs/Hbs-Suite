import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * URL-backed list state (?page=&limit=&q=&status=...). Changing any filter
 * resets to page 1. Returns the query string to append to a /api/views URL.
 */
export function useListParams(defaults = {}) {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => {
    const sp = new URLSearchParams(search);
    const out = { ...defaults };
    for (const [k, v] of sp.entries()) out[k] = v;
    return out;
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(
    (patch) => {
      const sp = new URLSearchParams(search);
      const resetPage = !("page" in patch);
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || v === null || v === undefined) sp.delete(k);
        else sp.set(k, String(v));
      }
      if (resetPage) sp.delete("page");
      const qs = sp.toString();
      navigate(qs ? `${pathname}?${qs}` : pathname, { replace: true, preventScrollReset: true });
    },
    [search, pathname, navigate],
  );

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "" && v != null) sp.set(k, v);
    return sp.toString();
  }, [params]);

  return { params, set, query };
}
