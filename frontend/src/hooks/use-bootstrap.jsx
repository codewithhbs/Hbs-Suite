import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/hooks/use-api";
import { REFRESH_EVENT } from "@/shims/next-navigation";

const Ctx = createContext({ settings: {}, brand: { name: "HBS Suite", logo: null }, footerPages: [], session: null, ready: false });
export const useBootstrap = () => useContext(Ctx);

/** Public platform data loaded once per visit (+ on router.refresh()). */
export function BootstrapProvider({ children }) {
  const [state, setState] = useState({ settings: {}, brand: { name: "HBS Suite", logo: null }, footerPages: [], session: null, analyticsId: null, ready: false });
  const load = useCallback(() => {
    apiFetch("/api/views/bootstrap")
      .then((d) => setState({ ...d, ready: true }))
      .catch(() => setState((s) => ({ ...s, ready: true })));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(REFRESH_EVENT, load);
    return () => window.removeEventListener(REFRESH_EVENT, load);
  }, [load]);
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
