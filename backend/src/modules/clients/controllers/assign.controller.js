import { route, body } from "../../../lib/saas/routeKit.js";
import { query, one } from "../../../lib/db.js";
import { scopedEmployee } from "../../../lib/saas/clientScope.js";
import { audit } from "../../../lib/saas/audit.js";

/** POST /api/clients/assign { client_ids: [..], employee_id: 5 | null } - bulk assign to a team member */
export const POST = route({ permission: "client.edit" }, async ({ ctx, request }) => {
  if (!ctx.tenantId || scopedEmployee(ctx) !== null) {
    const e = new Error("Only the workspace owner (or someone who sees all clients) can assign clients.");
    e.status = 403;
    throw e;
  }
  const b = await body(request);
  const ids = [...new Set((Array.isArray(b.client_ids) ? b.client_ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) {
    const e = new Error("Select at least one client.");
    e.status = 400;
    throw e;
  }
  let emp = b.employee_id ? Number(b.employee_id) : null;
  if (emp) {
    const ok = await one("SELECT e.id FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=? AND e.tenant_id=? AND u.active=1", [emp, ctx.tenantId]);
    if (!ok) {
      const e = new Error("That team member was not found.");
      e.status = 404;
      throw e;
    }
  } else emp = null;
  const r = await query(`UPDATE clients SET assigned_employee_id=? WHERE tenant_id=? AND id IN (${ids.map(() => "?").join(",")})`, [emp, ctx.tenantId, ...ids]);
  await audit(ctx, "CLIENTS_ASSIGNED", { entity: "client", meta: { count: r.affectedRows, employee_id: emp } });
  return { updated: r.affectedRows };
});
