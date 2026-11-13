import { useMemo } from "react";
import { useLocation, useNavigate, useParams as useRouterParams } from "react-router-dom";

/** Refresh = re-load the current screen's data (server components used to re-render). */
export const REFRESH_EVENT = "app:refresh";
export const refreshData = () => window.dispatchEvent(new Event(REFRESH_EVENT));

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (url, opts = {}) => {
        navigate(url, { preventScrollReset: opts.scroll === false });
        if (opts.scroll !== false) window.scrollTo(0, 0);
      },
      replace: (url, opts = {}) => navigate(url, { replace: true, preventScrollReset: opts.scroll === false }),
      back: () => navigate(-1),
      forward: () => navigate(1),
      refresh: refreshData,
      prefetch: () => {},
    }),
    [navigate],
  );
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams() {
  return useRouterParams();
}

export function redirect(url) {
  window.location.assign(url);
}

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
    this.status = 404;
  }
}

export function notFound() {
  throw new NotFoundError();
}
