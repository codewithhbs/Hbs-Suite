import { NextResponse, after } from "../../../shims/next-server.js";
import { guard, apiError } from "../../../lib/saas/guard.js";
import { query } from "../../../lib/db.js";
import { clientScopeInline } from "../../../lib/saas/clientScope.js";
import { withEngine } from "../../../lib/ai/engine.js";
import { generateCalendarNow } from "../../../lib/ai/orchestrator.js";
import { audit } from "../../../lib/saas/audit.js";

const MAX = 50;

/**
 * POST /api/calendar/generate
 *   { ids: [calendarId, ...], engine? }   -> these slots
 *   { date: "YYYY-MM-DD", client_id?, engine? } -> every open slot of that day
 * Generates the posts NOW (all at the same time) instead of waiting for the night run.
 * Only slots still SCHEDULED with no post yet are taken. Answers at once; the slots
 * show PREPARING until the AI is done, then GENERATED (or SKIPPED on error).
 */
export async function POST(request) {
  const g = await guard(request, { permission: "task.generate" });
  if (g.error) return g.error;
  const { ctx } = g;
  try {
    const b = await request.json().catch(() => ({}));
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, MAX);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : null;
    if (!ids.length && !date) return NextResponse.json({ error: "Pick a post or a day" }, { status: 400 });

    const params = [];
    let sql = `SELECT c.* FROM content_calendar c
                 JOIN clients cl ON cl.id=c.client_id AND cl.active=1
                WHERE c.status='SCHEDULED'
                  AND NOT EXISTS (SELECT 1 FROM ai_tasks a WHERE a.calendar_id=c.id)`;
    if (ids.length) {
      sql += ` AND c.id IN (${ids.map(() => "?").join(",")})`;
      params.push(...ids);
    } else {
      sql += " AND c.scheduled_date=?";
      params.push(date);
      if (b.client_id) {
        sql += " AND c.client_id=?";
        params.push(Number(b.client_id));
      }
    }
    if (ctx.tenantId) {
      sql += ` AND c.tenant_id=?${clientScopeInline("c.client_id")}`;
      params.push(ctx.tenantId);
    }
    sql += ` ORDER BY c.scheduled_date, c.id LIMIT ${MAX}`;
    const rows = await query(sql, params);

    // claim each slot so the night run / auto-poster never writes it a second time
    const claimed = [];
    for (const row of rows) {
      const r = await query("UPDATE content_calendar SET status='PREPARING' WHERE id=? AND status='SCHEDULED'", [row.id]);
      if (r.affectedRows) claimed.push(row);
    }
    if (!claimed.length) {
      return NextResponse.json({ error: "Nothing to generate - these posts are already written or being written." }, { status: 409 });
    }

    const engine = b.engine || null;
    after(() => withEngine(engine, () => generateCalendarNow({ rows: claimed, userId: ctx.userId })));
    await audit(ctx, "AI_JOB_RUN", { meta: { mode: "calendar_now", count: claimed.length } }).catch(() => {});
    return NextResponse.json({ ok: true, queued: claimed.length, ids: claimed.map((r) => r.id) });
  } catch (err) {
    return apiError(err);
  }
}