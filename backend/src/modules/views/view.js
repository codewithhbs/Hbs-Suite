import { getPageContext } from "../../lib/saas/context.js";
import { HttpError } from "../../core/http/errors.js";
import { h } from "../../core/http/asyncHandler.js";

/**
 * Screen-data endpoint wrapper (replaces the old server-component guards):
 *   401 UNAUTHENTICATED  -> SPA sends the user to /login
 *   409 NO_TENANT        -> super admin opened a workspace screen -> /admin
 *   403 PAGE_DENIED      -> SPA goes to /dashboard?denied=<permission>
 */
export function view(opts, fn) {
  return h(async (req, res) => {
    const ctx = await getPageContext();
    if (!ctx) throw new HttpError(401, "Not signed in", "UNAUTHENTICATED");
    if (opts.superAdmin && !ctx.isSuperAdmin) throw new HttpError(403, "Super admin only", "FORBIDDEN");
    if (!opts.superAdmin && opts.tenant !== false && !ctx.tenantId) {
      throw new HttpError(409, "Workspace screen", "NO_TENANT", { redirect: "/admin" });
    }
    if (opts.permission && !ctx.can(opts.permission)) {
      throw new HttpError(403, "You don't have access to that page.", "PAGE_DENIED", { permission: opts.permission });
    }
    return fn({ ctx, req, res, q: req.query, params: req.params });
  });
}

export const plain = (x) => JSON.parse(JSON.stringify(x ?? null));
export const intParam = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, "Not found", "NOT_FOUND");
  return n;
};
export const notFound = () => new HttpError(404, "Not found", "NOT_FOUND");
