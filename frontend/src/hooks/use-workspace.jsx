import { createContext, useContext, useMemo } from "react";

const Ctx = createContext(null);

/**
 * Signed-in context (what server components got from requireTenantContext()):
 *   const { session, can, ent, limits, features, plan, tenant } = useWorkspace();
 */
export function WorkspaceProvider({ value, children }) {
  const ctx = useMemo(() => {
    if (!value) return null;
    const perms = Array.isArray(value.perms) ? value.perms : [];
    return { ...value, can: (p) => value.role === "SUPER_ADMIN" || perms.includes(p) };
  }, [value]);
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace() outside the app layout");
  return v;
}
