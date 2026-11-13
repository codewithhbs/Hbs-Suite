import { Router } from "express";
import { view, plain, intParam, notFound } from "../view.js";
import { cached } from "../../../core/cache.js";
import { pageParams, pagedQuery, likeAny } from "../../../core/pagination.js";
import { query, one } from "../../../lib/db.js";
import { platformStats, revenueTrend, planDistribution, getTenant } from "../../../lib/saas/tenants.js";
import { platformUsage, currentPeriod } from "../../../lib/saas/usage.js";
import { listPlans, listCoupons, listCreditPacks } from "../../../lib/saas/billing.js";
import { resolveEntitlements } from "../../../lib/saas/entitlements.js";
import { creditCosts, getSettings } from "../../../lib/saas/settings.js";
import { agentUsage, dashboardStats } from "../../../lib/repo/stats.js";
import { getTask } from "../../../lib/repo/tasks.js";
import { readPostFilters, listAdminPosts, postFilterOptions, readProfileFilters, listAdminProfiles, profileFilterOptions } from "../../../lib/repo/adminGmb.js";
import { providerInfo } from "../../../lib/ai/index.js";
import { storageInfo } from "../../../lib/storage/index.js";
import { gmbProviderInfo } from "../../../lib/gmb/provider.js";
import { maskedSettings } from "../services/publicSettings.js";

const router = Router();
const SA = { superAdmin: true };
const TTL = Number(process.env.VIEW_STATS_TTL || 30);

const TENANT_SELECT = `t.*, u.name AS owner_name, u.email AS owner_email,
  p.name AS plan_name, p.slug AS plan_slug,
  s.status AS sub_status, s.current_period_end, s.billing_cycle, s.price,
  w.plan_credits, w.purchased_credits,
  (SELECT COUNT(*) FROM clients c WHERE c.tenant_id=t.id) AS client_count,
  (SELECT COUNT(*) FROM users us WHERE us.tenant_id=t.id AND us.active=1) AS user_count,
  (SELECT COUNT(*) FROM ai_tasks a WHERE a.tenant_id=t.id) AS task_count`;
const TENANT_FROM = `tenants t
  LEFT JOIN users u ON u.id=t.owner_user_id
  LEFT JOIN subscriptions s ON s.id=(SELECT MAX(id) FROM subscriptions x WHERE x.tenant_id=t.id)
  LEFT JOIN plans p ON p.id=s.plan_id
  LEFT JOIN credit_wallets w ON w.tenant_id=t.id`;

/** GET /api/views/admin/overview */
router.get(
  "/admin/overview",
  view(SA, async () => {
    const [agg, tenants] = await Promise.all([
      cached("admin:overview", TTL, async () => {
        const [stats, revenue, plans, usage] = await Promise.all([platformStats(), revenueTrend(6), planDistribution(), platformUsage()]);
        return plain({ stats, revenue, plans, usage });
      }),
      pagedQuery({ select: TENANT_SELECT, from: TENANT_FROM, orderBy: "t.created_at DESC", page: { page: 1, limit: 10, offset: 0 } }),
    ]);
    return { ...agg, tenants: plain(tenants.items), tenantCount: tenants.total };
  }),
);

/** GET /api/views/admin/tenants?page&limit&q&status */
router.get(
  "/admin/tenants",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = [];
    const params = [];
    likeAny(["t.name", "t.company_email", "t.slug", "u.email"], q.q, where, params);
    if (q.status) (where.push("t.status=?"), params.push(String(q.status)));
    if (q.plan) (where.push("p.slug=?"), params.push(String(q.plan)));
    const [tenants, plans] = await Promise.all([
      pagedQuery({ select: TENANT_SELECT, from: TENANT_FROM, where, params, orderBy: "t.created_at DESC", page }),
      listPlans({ activeOnly: true }),
    ]);
    return { tenants: plain(tenants), plans: plain(plans) };
  }),
);

/** GET /api/views/admin/tenants/:id */
router.get(
  "/admin/tenants/:id",
  view(SA, async ({ params }) => {
    const id = intParam(params.id);
    const tenant = await getTenant(id);
    if (!tenant) throw notFound();
    const [ent, plans] = await Promise.all([resolveEntitlements(id), listPlans({ activeOnly: true })]);
    return { tenant: plain(tenant), ent: plain(ent), plans: plain(plans) };
  }),
);

/** GET /api/views/admin/users?page&limit&q&role&status */
router.get(
  "/admin/users",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = [];
    const params = [];
    likeAny(["u.name", "u.email", "t.name"], q.q, where, params);
    if (q.role) (where.push("u.role=?"), params.push(String(q.role)));
    if (q.status === "active") where.push("u.active=1");
    if (q.status === "inactive") where.push("u.active=0");
    const users = await pagedQuery({
      select: "u.id,u.name,u.email,u.role,u.active,u.last_login_at,u.created_at,t.name AS tenant_name",
      from: "users u LEFT JOIN tenants t ON t.id=u.tenant_id",
      where,
      params,
      orderBy: "u.tenant_id IS NOT NULL, u.id",
      page,
    });
    return { users: plain(users) };
  }),
);

/** GET /api/views/admin/subscriptions?page&limit&q&status */
router.get(
  "/admin/subscriptions",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = [];
    const params = [];
    likeAny(["t.name", "p.name"], q.q, where, params);
    if (q.status) (where.push("s.status=?"), params.push(String(q.status)));
    const subs = await pagedQuery({
      select: "s.*, t.name AS tenant_name, t.status AS tenant_status, p.name AS plan_name",
      from: "subscriptions s JOIN tenants t ON t.id=s.tenant_id JOIN plans p ON p.id=s.plan_id",
      where,
      params,
      orderBy: "s.id DESC",
      page,
    });
    return { subscriptions: plain(subs) };
  }),
);

/** GET /api/views/admin/invoices?page&limit&q&status */
router.get(
  "/admin/invoices",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = [];
    const params = [];
    likeAny(["i.invoice_no", "t.name"], q.q, where, params);
    if (q.status) (where.push("i.status=?"), params.push(String(q.status)));
    const [invoices, [totals]] = await Promise.all([
      pagedQuery({ select: "i.*, t.name AS tenant_name", from: "invoices i JOIN tenants t ON t.id=i.tenant_id", where, params, orderBy: "i.id DESC", page }),
      query("SELECT COALESCE(SUM(CASE WHEN status='PAID' THEN total END),0) paid, COALESCE(SUM(CASE WHEN status='DUE' THEN total END),0) due FROM invoices"),
    ]);
    return { invoices: plain(invoices), totals: plain(totals) };
  }),
);

/** GET /api/views/admin/audit?page&limit&q&tenant */
router.get(
  "/admin/audit",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 50 });
    const where = [];
    const params = [];
    likeAny(["a.action", "a.user_name", "a.entity"], q.q, where, params);
    if (q.tenant) (where.push("a.tenant_id=?"), params.push(Number(q.tenant)));
    const logs = await pagedQuery({ select: "a.*, t.name AS tenant_name", from: "audit_logs a LEFT JOIN tenants t ON t.id=a.tenant_id", where, params, orderBy: "a.id DESC", page });
    return { logs: plain(logs) };
  }),
);

/** GET /api/views/admin/usage?page&limit */
router.get(
  "/admin/usage",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const [agg, runs] = await Promise.all([
      cached("admin:usage", TTL, async () => {
        const [usage, agents, stats] = await Promise.all([platformUsage(), agentUsage(), dashboardStats()]);
        return plain({ usage, agents, stats });
      }),
      pagedQuery({
        select: "e.id, e.created_at, e.agent, e.status, e.credits_charged, LEFT(e.error,200) error, LEFT(e.output_preview,200) output_preview, t.name AS tenant_name, c.business_name",
        from: "ai_executions e LEFT JOIN tenants t ON t.id=e.tenant_id LEFT JOIN clients c ON c.id=e.client_id",
        orderBy: "e.id DESC",
        page,
      }),
    ]);
    return { ...agg, runs: plain(runs), period: currentPeriod() };
  }),
);

/** GET /api/views/admin/credits?page&limit&q */
router.get(
  "/admin/credits",
  view(SA, async ({ q }) => {
    const page = pageParams(q, { defaultLimit: 25 });
    const where = [];
    const params = [];
    likeAny(["t.name"], q.q, where, params);
    const [wallets, packs, tenants, costs] = await Promise.all([
      pagedQuery({ select: "w.*, t.name AS tenant_name", from: "credit_wallets w JOIN tenants t ON t.id=w.tenant_id", where, params, orderBy: "w.lifetime_used DESC, w.tenant_id", page }),
      listCreditPacks({ activeOnly: false }),
      query("SELECT id, name FROM tenants ORDER BY name LIMIT 5000"),
      creditCosts(),
    ]);
    return { wallets: plain(wallets), packs: plain(packs), tenants: plain(tenants), costs };
  }),
);

/** GET /api/views/admin/coupons */
router.get(
  "/admin/coupons",
  view(SA, async () => {
    const [coupons, plans] = await Promise.all([listCoupons(), listPlans({ activeOnly: true })]);
    return { coupons: plain(coupons), plans: plain(plans) };
  }),
);

/** GET /api/views/admin/plans */
router.get(
  "/admin/plans",
  view(SA, async () => ({ plans: plain(await listPlans({ activeOnly: false })) })),
);

/** GET /api/views/admin/settings */
router.get(
  "/admin/settings",
  view(SA, async () => {
    const [settings, plans] = await Promise.all([getSettings({ fresh: true }), listPlans({ activeOnly: true })]);
    return { settings: plain(maskedSettings(settings)), plans: plain(plans), ai: providerInfo(), storage: storageInfo(), gmb: gmbProviderInfo() };
  }),
);

/** GET /api/views/admin/image-styles */
router.get(
  "/admin/image-styles",
  view(SA, async () => ({
    clients: plain(
      await query("SELECT c.id, c.business_name, t.name tenant FROM clients c JOIN tenants t ON t.id=c.tenant_id WHERE c.active=1 ORDER BY c.business_name LIMIT 500").catch(() => []),
    ),
  })),
);

/** GET /api/views/admin/gmb-posts?(same filters as before, page/per) */
router.get(
  "/admin/gmb-posts",
  view(SA, async ({ q }) => {
    const f = readPostFilters(q);
    const [data, opts] = await Promise.all([listAdminPosts(f), postFilterOptions({ tenant: f.tenant })]);
    return { data: plain(data), opts: plain(opts), page: f.page, perPage: f.perPage };
  }),
);

/** GET /api/views/admin/gmb-posts/:id */
router.get(
  "/admin/gmb-posts/:id",
  view(SA, async ({ params }) => {
    const task = await getTask(intParam(params.id));
    if (!task) throw notFound();
    const tenant = await one("SELECT name FROM tenants WHERE id=?", [task.tenant_id]);
    return { task: plain(task), tenantName: tenant?.name || null };
  }),
);

/** GET /api/views/admin/gmb-profiles */
router.get(
  "/admin/gmb-profiles",
  view(SA, async ({ q }) => {
    const f = readProfileFilters(q);
    const [data, opts] = await Promise.all([listAdminProfiles(f), profileFilterOptions()]);
    return { data: plain(data), opts: plain(opts), page: f.page, perPage: f.perPage };
  }),
);

export default router;
