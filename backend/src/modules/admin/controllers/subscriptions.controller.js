import { NextResponse } from "../../../shims/next-server.js";
import { guard } from "../../../lib/saas/guard.js";
import { query } from "../../../lib/db.js";
import { runBillingCycle } from "../../../lib/saas/billing.js";


export async function GET(request) {
  const g = await guard(request, { superAdmin: true });
  if (g.error) return g.error;
  const subs = await query(
    `SELECT s.*, t.name AS tenant_name, t.status AS tenant_status, p.name AS plan_name
       FROM subscriptions s
       JOIN tenants t ON t.id=s.tenant_id
       JOIN plans p ON p.id=s.plan_id
      ORDER BY s.id DESC`
  );
  return NextResponse.json({ subscriptions: subs });
}

/** Manual trigger of the renewal/expiry sweep (also run by scripts/scheduler.js). */
export async function POST(request) {
  const g = await guard(request, { superAdmin: true });
  if (g.error) return g.error;
  return NextResponse.json(await runBillingCycle());
}
