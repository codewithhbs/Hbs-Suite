import { currentStore } from "../../core/requestContext.js";

/**
 * Client visibility for team members.
 *
 *  - OWNER, super admin, impersonation and anyone with "client.view_all"
 *    see every client of the workspace.
 *  - Every other team member sees ONLY the clients the owner assigned to them
 *    (clients.assigned_employee_id) - lists, detail pages, posts, reviews,
 *    calendar, stats, search and every /api/gmb/:id action.
 *
 * The signed-in context is stored on the request (AsyncLocalStorage) by
 * buildContext(), so repo functions apply the rule without extra arguments.
 * Background jobs have no request context -> unrestricted.
 */
export const VIEW_ALL = "client.view_all";

export function setScopeContext(ctx) {
  const s = currentStore();
  if (s && ctx) s.ctx = ctx;
}

/** employee id the current user is limited to, or null = no limit */
export function scopedEmployee(ctx = currentStore()?.ctx) {
  if (!ctx || !ctx.tenantId || ctx.isSuperAdmin || ctx.impersonating) return null;
  if (ctx.role === "OWNER") return null;
  if (Array.isArray(ctx.perms) && ctx.perms.includes(VIEW_ALL)) return null;
  return Number(ctx.employeeId) || -1; // member without an employee row sees nothing
}

/**
 * SQL fragment limiting rows by client.
 *   clientScope("t.client_id") -> { sql: " AND t.client_id IN (...)", params: [12] }
 *   clientScope("c.id")        -> for the clients table itself
 */
export function clientScope(column = "client_id", ctx) {
  const emp = scopedEmployee(ctx);
  if (emp === null) return { sql: "", params: [], emp: null };
  return { sql: ` AND ${column} IN (SELECT sc.id FROM clients sc WHERE sc.assigned_employee_id=?)`, params: [emp], emp };
}

/** Same, with the id inlined (for helpers that build SQL strings without params). */
export function clientScopeInline(column = "client_id", ctx) {
  const emp = scopedEmployee(ctx);
  return emp === null ? "" : ` AND ${column} IN (SELECT sc.id FROM clients sc WHERE sc.assigned_employee_id=${Number(emp)})`;
}

/** Cache-key suffix so restricted members never read the owner's cached numbers. */
export const scopeKey = (ctx) => {
  const emp = scopedEmployee(ctx);
  return emp === null ? "all" : `e${emp}`;
};

/** Push the scope condition onto a where[] / params[] pair. */
export function scopeWhere(column, ctx, where, params) {
  const emp = scopedEmployee(ctx);
  if (emp === null) return;
  where.push(`${column} IN (SELECT sc.id FROM clients sc WHERE sc.assigned_employee_id=?)`);
  params.push(emp);
}
