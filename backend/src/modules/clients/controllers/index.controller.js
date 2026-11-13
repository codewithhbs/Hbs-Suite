import { scopedEmployee } from "../../../lib/saas/clientScope.js";
import { NextResponse } from "../../../shims/next-server.js";
import { guard, apiError } from "../../../lib/saas/guard.js";
import { listClientsPaged, createClient } from "../../../lib/repo/clients.js";
import { assertLimit } from "../../../lib/saas/entitlements.js";
import { audit } from "../../../lib/saas/audit.js";
import { savePlan, normalizePlanInput } from "../../../lib/posting/plan.js";


export async function GET(request) {
  const g = await guard(request, { permission: "client.view" });
  if (g.error) return g.error;
  // paginated: ?page=&limit=&q=  (default 50 per page, max 100)
  const sp = new URL(request.url).searchParams;
  const data = await listClientsPaged(g.ctx.tenantId, { page: sp.get("page"), limit: sp.get("limit") || 50, q: sp.get("q") });
  data.items = data.items.map(({ google_refresh_token: _t, ...c }) => c); // never ship OAuth tokens
  return NextResponse.json({ ...data, clients: data.items });
}

export async function POST(request) {
  const g = await guard(request, { permission: "client.create" });
  if (g.error) return g.error;
  const { ctx } = g;
  try {
    if (!ctx.tenantId) return NextResponse.json({ error: "Super admin cannot own clients" }, { status: 400 });
    assertLimit(ctx.ent, "max_clients", 1);

    const body = await request.json();
    if (body.import_from_google && !body.business_category) body.business_category = "Pending Google sync";
    if (!body.business_name || !body.business_category) {
      return NextResponse.json({ error: "Business name and category are required" }, { status: 400 });
    }
    if (!body.posting_plan) {
      return NextResponse.json({ error: "Posting plan (start date, duration, posts per week) is required" }, { status: 400 });
    }
    normalizePlanInput(body.posting_plan); // validate before creating anything
    // a team member who only sees assigned clients keeps the client they add
    if (scopedEmployee(ctx) !== null) body.assigned_employee_id = ctx.employeeId;
    const id = await createClient(body, ctx.tenantId);
    await savePlan(id, ctx.tenantId, body.posting_plan, ctx.name);
    await audit(ctx, "CLIENT_CREATED", { entity: "client", entityId: id, meta: { name: body.business_name } });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return apiError(err);
  }
}
