import { Router } from "express";
import { clientScopeInline, scopeWhere, scopedEmployee } from "../../../lib/saas/clientScope.js";
import { view, plain, intParam, notFound } from "../view.js";
import { pageParams, pagedQuery, likeAny } from "../../../core/pagination.js";
import { query, one } from "../../../lib/db.js";
import { getClient } from "../../../lib/repo/clients.js";
import { listEmployeesForAssignment } from "../../../lib/repo/employees.js";
import { providerFor, gmbProviderInfo } from "../../../lib/gmb/provider.js";
import { runAudit } from "../../../lib/gmb/audit.js";
import { formatInputDate } from "../../../lib/utils.js";

const router = Router();

/** never ship OAuth tokens to the browser */
const stripSecrets = (c) => {
  if (!c) return c;
  const { google_refresh_token: _t, ...rest } = c;
  return rest;
};

/** GET /api/views/clients?page&limit&q&status=active|inactive&category */
router.get(
  "/clients",
  view({ permission: "client.view" }, async ({ ctx, q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = ["c.tenant_id=?"];
    const params = [ctx.tenantId];
    scopeWhere("c.id", ctx, where, params);
    if (q.status === "active") where.push("c.active=1");
    if (q.status === "inactive") where.push("c.active=0");
    if (q.category) (where.push("c.business_category=?"), params.push(String(q.category)));
    if (q.conn === "google") where.push("c.google_location_name IS NOT NULL");
    if (q.conn === "pending") where.push("c.google_location_name IS NULL AND c.google_refresh_token IS NOT NULL");
    if (q.conn === "none") where.push("c.google_location_name IS NULL AND c.google_refresh_token IS NULL");
    if (q.assigned === "none") where.push("c.assigned_employee_id IS NULL");
    else if (q.assigned) (where.push("c.assigned_employee_id=?"), params.push(Number(q.assigned)));
    likeAny(["c.business_name", "c.city", "c.business_category"], q.q, where, params);

    // counts per row only for the visible page (they used to run for every client)
    const [list, categories, [{ all }]] = await Promise.all([
      pagedQuery({
        select: `c.*, u.name AS employee_name,
                 CASE WHEN c.google_location_name IS NOT NULL THEN 'GOOGLE'
                      WHEN c.google_refresh_token IS NOT NULL THEN 'PENDING'
                      ELSE 'NONE' END AS conn_state,
                 (SELECT COUNT(*) FROM gmb_services s WHERE s.client_id=c.id) AS service_count,
                 (SELECT COUNT(*) FROM keywords k WHERE k.client_id=c.id) AS keyword_count,
                 (SELECT COUNT(*) FROM gmb_posts p WHERE p.client_id=c.id) AS post_count`,
        from: "clients c LEFT JOIN employees e ON e.id=c.assigned_employee_id LEFT JOIN users u ON u.id=e.user_id",
        where,
        params,
        orderBy: "c.business_name, c.id",
        page,
      }),
      query(`SELECT DISTINCT business_category FROM clients WHERE tenant_id=?${clientScopeInline("id", ctx)} AND business_category IS NOT NULL AND business_category<>'' ORDER BY business_category LIMIT 300`, [ctx.tenantId]),
      query(`SELECT COUNT(*) AS \`all\` FROM clients WHERE tenant_id=?${clientScopeInline("id", ctx)}`, [ctx.tenantId]),
    ]);
    list.items = list.items.map(stripSecrets);
    const fullAccess = scopedEmployee(ctx) === null;
    return {
      clients: plain(list),
      categories: categories.map((r) => r.business_category),
      all: Number(all),
      limit: ctx.limits.max_clients,
      employees: fullAccess ? plain(await listEmployeesForAssignment(ctx.tenantId)) : [],
      canAssign: fullAccess && ctx.can("client.edit"),
      canDedupe: fullAccess && ctx.can("client.delete"),
      onlyAssigned: !fullAccess,
    };
  }),
);

/** GET /api/views/clients/new */
router.get(
  "/clients/new",
  view({ permission: "client.create" }, async ({ ctx }) => ({ employees: plain(await listEmployeesForAssignment(ctx.tenantId)) })),
);

/** GET /api/views/clients/:id?edit=1 */
router.get(
  "/clients/:id",
  view({ permission: "client.view" }, async ({ ctx, params, q }) => {
    const client = await getClient(intParam(params.id), ctx.tenantId);
    if (!client) throw notFound();
    const employees = q.edit ? await listEmployeesForAssignment(ctx.tenantId) : null;
    return { client: plain(stripSecrets(client)), employees: plain(employees), canEdit: ctx.can("client.edit"), canConnect: ctx.can("gmb.connect") };
  }),
);

/** GET /api/views/gmb?page&limit&q&conn */
router.get(
  "/gmb",
  view({ permission: "gmb.view" }, async ({ ctx, q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = ["c.tenant_id=?"];
    const params = [ctx.tenantId];
    scopeWhere("c.id", ctx, where, params);
    if (q.conn) (where.push("p.connection_status=?"), params.push(String(q.conn)));
    likeAny(["c.business_name", "p.category", "c.city"], q.q, where, params);
    const [rows, statuses, [live]] = await Promise.all([
      pagedQuery({
        select: `p.*, c.business_name, c.city, c.gmb_location_id,
                 (SELECT COUNT(*) FROM gmb_posts g WHERE g.client_id=c.id) AS posts`,
        from: "gmb_profiles p JOIN clients c ON c.id=p.client_id",
        where,
        params,
        orderBy: "c.business_name, p.id",
        page,
      }),
      query(
        `SELECT DISTINCT p.connection_status s FROM gmb_profiles p JOIN clients c ON c.id=p.client_id WHERE c.tenant_id=?${clientScopeInline("c.id", ctx)} AND p.connection_status IS NOT NULL`,
        [ctx.tenantId],
      ),
      query(
        `SELECT COUNT(*) total, SUM(p.provider='google' AND p.connection_status='GOOGLE_CONNECTED') live
           FROM gmb_profiles p JOIN clients c ON c.id=p.client_id WHERE c.tenant_id=?${clientScopeInline("c.id", ctx)}`,
        [ctx.tenantId],
      ),
    ]);
    return {
      rows: plain(rows),
      statuses: statuses.map((s) => s.s),
      live: Number(live.live || 0),
      totalProfiles: Number(live.total || 0),
      provider: gmbProviderInfo(),
      canConnect: ctx.can("gmb.connect"),
    };
  }),
);

const settled = (r, fallback) => (r.status === "fulfilled" ? r.value : fallback);

/** GET /api/views/gmb/:id?startDate&endDate&edit=1 */
router.get(
  "/gmb/:id",
  view({ permission: "gmb.view" }, async ({ ctx, params, q }) => {
    const clientId = intParam(params.id);
    const owned = await one(`SELECT id, google_email FROM clients WHERE id=? AND tenant_id=?${clientScopeInline("id", ctx)}`, [clientId, ctx.tenantId]);
    if (!owned) throw notFound();

    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    const maxDate = formatInputDate(today);
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(q.startDate || "") ? q.startDate : formatInputDate(monthAgo);
    const endDate = /^\d{4}-\d{2}-\d{2}$/.test(q.endDate || "") ? q.endDate : maxDate;
    const editing = Boolean(q.edit);

    const provider = await providerFor(clientId);
    const [profileR, postsR, perfR, rawR] = await Promise.allSettled([
      provider.getProfile(clientId),
      editing ? Promise.resolve([]) : provider.getPosts(clientId, 20),
      editing ? Promise.resolve(null) : provider.getPerformance(clientId, { startDate, endDate }),
      one("SELECT * FROM gmb_profiles WHERE client_id=? LIMIT 1", [clientId]),
    ]);
    const profile = settled(profileR, null);
    if (!profile && profileR.status !== "rejected") throw notFound();
    return {
      clientId,
      googleEmail: owned.google_email || null,
      providerName: provider.name || null,
      editing,
      profile: plain(profile),
      profileError: profileR.status === "rejected" ? profileR.reason?.message || "unknown error" : null,
      raw: editing ? plain(settled(rawR, null)) : null,
      posts: plain(settled(postsR, [])),
      postsError: postsR.status === "rejected" ? postsR.reason?.message || "error" : null,
      perf: plain(settled(perfR, null)),
      perfError: perfR.status === "rejected" ? perfR.reason?.message || "error" : null,
      startDate,
      endDate,
      maxDate,
      canConnect: ctx.can("gmb.connect"),
      social: Number(ctx.tenant?.social_enabled) === 1,
    };
  }),
);

/** GET /api/views/gmb/:id/audit */
router.get(
  "/gmb/:id/audit",
  view({ permission: "gmb.view" }, async ({ ctx, params }) => {
    const c = await one(`SELECT id FROM clients WHERE id=? AND tenant_id=?${clientScopeInline("id", ctx)}`, [intParam(params.id), ctx.tenantId]);
    if (!c) throw notFound();
    return { clientId: c.id, audit: plain(await runAudit(c.id)) };
  }),
);

export default router;
