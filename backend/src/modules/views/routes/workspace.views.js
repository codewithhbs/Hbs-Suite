import { Router } from "express";
import { clientScopeInline, scopeKey, scopeWhere } from "../../../lib/saas/clientScope.js";
import { view, plain, intParam, notFound } from "../view.js";
import { cached } from "../../../core/cache.js";
import { pageParams, pagedQuery, likeAny } from "../../../core/pagination.js";
import { query, one } from "../../../lib/db.js";
import { dashboardStats, statusBreakdown, topClients, dailyTaskTrend, agentUsage, performanceTotals } from "../../../lib/repo/stats.js";
import { listTasks, getTask, hydrate } from "../../../lib/repo/tasks.js";
import { listTenantUsers } from "../../../lib/auth.js";

const router = Router();
const STATS_TTL = Number(process.env.VIEW_STATS_TTL || 30);

/** GET /api/views/dashboard */
router.get(
  "/dashboard",
  view({}, async ({ ctx }) => {
    const T = ctx.tenantId;
    const [agg, tasks] = await Promise.all([
      cached(`stats:${T}:${scopeKey(ctx)}:dashboard`, STATS_TTL, async () => {
        const [stats, breakdown, clients, trend] = await Promise.all([dashboardStats(T), statusBreakdown(T), topClients(6, T), dailyTaskTrend(7, T)]);
        return plain({ stats, breakdown, clients, trend });
      }),
      listTasks({ status: ["READY_FOR_REVIEW", "NEEDS_REVIEW"], limit: 8, tenantId: T }),
    ]);
    return { ...agg, tasks: plain(tasks) };
  }),
);

/** GET /api/views/analytics */
router.get(
  "/analytics",
  view({ permission: "analytics.view" }, async ({ ctx }) => {
    const T = ctx.tenantId;
    return cached(`stats:${T}:${scopeKey(ctx)}:analytics`, STATS_TTL, async () => {
      const [stats, perf, clients, breakdown, daily] = await Promise.all([
        dashboardStats(T),
        performanceTotals(T),
        topClients(10, T),
        statusBreakdown(T),
        query(
          `SELECT DATE(created_at) day, COUNT(*) tasks, ROUND(AVG(qa_score),1) avg_score,
                  SUM(status='PUBLISHED') published, SUM(status='REJECTED') rejected
             FROM ai_tasks WHERE tenant_id=?${clientScopeInline("client_id", ctx)} AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
            GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 14`,
          [T],
        ),
      ]);
      return plain({ stats, perf, clients, breakdown, daily });
    });
  }),
);

/** GET /api/views/ai-runs?page&limit&status&agent */
router.get(
  "/ai-runs",
  view({ permission: "task.view" }, async ({ ctx, q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = ["e.tenant_id=?"];
    const params = [ctx.tenantId];
    scopeWhere("e.client_id", ctx, where, params);
    if (q.status) (where.push("e.status=?"), params.push(String(q.status)));
    if (q.agent) (where.push("e.agent=?"), params.push(String(q.agent)));
    const [agents, runs] = await Promise.all([
      cached(`stats:${ctx.tenantId}:${scopeKey(ctx)}:agents`, STATS_TTL, async () => plain(await agentUsage(ctx.tenantId))),
      pagedQuery({
        select: `e.id, e.created_at, e.task_id, e.agent, e.provider, e.model, e.duration_ms, e.status,
                 LEFT(e.error, 120) AS error, LEFT(e.output_preview, 120) AS output_preview, c.business_name`,
        from: "ai_executions e LEFT JOIN clients c ON c.id=e.client_id",
        where,
        params,
        orderBy: "e.id DESC",
        page,
      }),
    ]);
    const total = agents.reduce((n, a) => n + Number(a.calls || 0), 0);
    const failed = agents.reduce((n, a) => n + Number(a.failures || 0), 0);
    return {
      agents,
      stats: {
        ai_calls: total,
        ai_errors: failed,
        ai_success_rate: total ? Math.round(((total - failed) / total) * 100) : 100,
        credits_used: agents.reduce((n, a) => n + Number(a.credits || 0), 0),
      },
      runs: plain(runs),
    };
  }),
);

/** GET /api/views/keywords?page&limit&client&q&type&source */
router.get(
  "/keywords",
  view({ permission: "keyword.view" }, async ({ ctx, q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const clientId = q.client ? Number(q.client) : null;
    const where = ["k.tenant_id=?"];
    const params = [ctx.tenantId];
    scopeWhere("k.client_id", ctx, where, params);
    if (clientId) (where.push("k.client_id=?"), params.push(clientId));
    if (q.type) (where.push("k.kw_type=?"), params.push(String(q.type)));
    if (q.source) (where.push("k.source=?"), params.push(String(q.source)));
    likeAny(["k.keyword", "c.business_name", "c.city"], q.q, where, params);
    const [rows, [counts], types] = await Promise.all([
      pagedQuery({
        select: "k.*, c.business_name, c.city",
        from: "keywords k JOIN clients c ON c.id=k.client_id",
        where,
        params,
        orderBy: "c.business_name, k.relevance_score DESC, k.id",
        page,
      }),
      query(
        `SELECT COUNT(*) total, SUM(source='AI_SUGGESTED') ai, SUM(source='CLIENT') client,
                SUM(has_volume_data=1) with_volume FROM keywords WHERE tenant_id=?${clientScopeInline("client_id", ctx)}`,
        [ctx.tenantId],
      ),
      query(`SELECT DISTINCT kw_type FROM keywords WHERE tenant_id=?${clientScopeInline("client_id", ctx)} AND kw_type IS NOT NULL ORDER BY kw_type`, [ctx.tenantId]),
    ]);
    return { rows: plain(rows), counts: plain(counts), types: types.map((t) => t.kw_type), clientFiltered: !!clientId };
  }),
);

/** GET /api/views/tasks?page&limit&status&q&client */
router.get(
  "/tasks",
  view({ permission: "task.view" }, async ({ ctx, q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = ["t.tenant_id=?"];
    const params = [ctx.tenantId];
    scopeWhere("t.client_id", ctx, where, params);
    if (q.status) (where.push("t.status=?"), params.push(String(q.status)));
    if (q.client) (where.push("t.client_id=?"), params.push(Number(q.client)));
    likeAny(["t.title", "t.topic", "c.business_name"], q.q, where, params);
    const [tasks, stats] = await Promise.all([
      pagedQuery({
        select: `t.*, c.business_name, c.city, c.business_category, c.maps_url AS client_maps_url,
                 (SELECT gp.search_url FROM gmb_posts gp WHERE gp.task_id=t.id AND gp.status<>'DELETED' ORDER BY gp.id DESC LIMIT 1) AS live_url`,
        from: "ai_tasks t JOIN clients c ON c.id=t.client_id",
        where,
        params,
        orderBy: "t.updated_at DESC, t.id DESC",
        page,
      }),
      cached(`stats:${ctx.tenantId}:${scopeKey(ctx)}:dashboard-stats`, STATS_TTL, async () => plain(await dashboardStats(ctx.tenantId))),
    ]);
    tasks.items = tasks.items.map(hydrate);
    return {
      tasks: plain(tasks),
      stats,
      bulkEnabled: Boolean(ctx.features?.f_bulk_actions),
      canPublish: ctx.can("task.publish"),
    };
  }),
);

/** GET /api/views/tasks/:id */
router.get(
  "/tasks/:id",
  view({ permission: "task.view" }, async ({ ctx, params }) => {
    const task = await getTask(intParam(params.id), ctx.tenantId);
    if (!task) throw notFound();
    return {
      task: plain(task),
      perms: { edit: ctx.can("task.edit"), approve: ctx.can("task.approve"), publish: ctx.can("task.publish"), generate: ctx.can("task.generate") },
    };
  }),
);

/** GET /api/views/calendar?from&to (date window, max 120 days) */
router.get(
  "/calendar",
  view({ permission: "calendar.view" }, async ({ ctx, q }) => {
    const iso = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
    let from = okDate(q.from) ? q.from : iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    let to = okDate(q.to) ? q.to : iso(new Date(now.getFullYear(), now.getMonth() + 2, 0));
    if ((new Date(to) - new Date(from)) / 86400000 > 120) to = iso(new Date(new Date(from).getTime() + 120 * 86400000));
    const [entries, clients] = await Promise.all([
      query(
        `SELECT c.*, cl.business_name,
                (SELECT t.id FROM ai_tasks t WHERE t.calendar_id=c.id ORDER BY t.id DESC LIMIT 1) AS task_id,
                (SELECT t.status FROM ai_tasks t WHERE t.calendar_id=c.id ORDER BY t.id DESC LIMIT 1) AS task_status
           FROM content_calendar c JOIN clients cl ON cl.id=c.client_id
          WHERE c.scheduled_date BETWEEN ? AND ? AND c.tenant_id=?${clientScopeInline("c.client_id", ctx)} ORDER BY c.scheduled_date, cl.business_name LIMIT 2000`,
        [from, to, ctx.tenantId],
      ),
      query(`SELECT id, business_name FROM clients WHERE active=1 AND tenant_id=?${clientScopeInline("id", ctx)} ORDER BY business_name`, [ctx.tenantId]),
    ]);
     return { entries: plain(entries), clients: plain(clients), from, to, canGenerate: ctx.can("task.generate") };
  }),
);

/** GET /api/views/team */
router.get(
  "/team",
  view({ permission: "team.view" }, async ({ ctx }) => ({
    users: plain(await listTenantUsers(ctx.tenantId)),
    canInvite: ctx.can("team.invite"),
    canEdit: ctx.can("team.edit"),
    isOwner: ctx.role === "OWNER",
    limit: ctx.limits.max_team_members,
    used: ctx.ent.live.team_members,
  })),
);

/** GET /api/views/settings */
router.get(
  "/settings",
  view({}, async ({ ctx }) => ({ users: plain(await listTenantUsers(ctx.tenantId)) })),
);

/** GET /api/views/client-options?active=1&place=1 - lightweight dropdown source */
router.get(
  "/client-options",
  view({}, async ({ ctx, q }) => {
    const cols = q.place ? "id, business_name, place_id" : "id, business_name";
    const rows = await query(
      `SELECT ${cols} FROM clients WHERE tenant_id=?${clientScopeInline("id", ctx)}${q.active ? " AND active=1" : ""} ORDER BY business_name LIMIT 5000`,
      [ctx.tenantId],
    );
    return { clients: plain(rows) };
  }),
);

/** GET /api/views/clients/:id/brief - header info for sub-screens (QR, services, products, website) */
router.get(
  "/clients/:id/brief",
  view({ permission: "gmb.view" }, async ({ ctx, params }) => {
    const c = await one(`SELECT id, business_name, business_category, city FROM clients WHERE id=? AND tenant_id=?${clientScopeInline("id", ctx)}`, [intParam(params.id), ctx.tenantId]);
    if (!c) throw notFound();
    return { client: plain(c) };
  }),
);

export default router;
