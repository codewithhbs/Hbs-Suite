import { route, body } from "../../../lib/saas/routeKit.js";
import { findDuplicateClients, removeDuplicateClients } from "../../../lib/repo/duplicates.js";
import { scopedEmployee } from "../../../lib/saas/clientScope.js";
import { audit } from "../../../lib/saas/audit.js";
import { invalidate } from "../../../core/cache.js";

const ownerOnly = (ctx) => {
  if (!ctx.tenantId || scopedEmployee(ctx) !== null) {
    const e = new Error("Only the workspace owner (or someone who sees all clients) can clean up duplicates.");
    e.status = 403;
    throw e;
  }
};

/** GET /api/clients/duplicates - preview */
export const GET = route({ permission: "client.delete" }, async ({ ctx }) => {
  ownerOnly(ctx);
  const r = await findDuplicateClients(ctx.tenantId);
  return { count: r.removable.length + r.unlinkable.length, removable: r.removable.length, unlinkable: r.unlinkable.length, groups: r.groups };
});

/** POST /api/clients/duplicates { confirm: true } - remove empty, unlinked copies */
export const POST = route({ permission: "client.delete" }, async ({ ctx, request }) => {
  ownerOnly(ctx);
  const b = await body(request);
  if (b.confirm !== true) {
    const e = new Error("Send { confirm: true } to remove duplicates.");
    e.status = 400;
    throw e;
  }
  const r = await removeDuplicateClients(ctx.tenantId);
  await audit(ctx, "CLIENT_DUPLICATES_REMOVED", { entity: "client", meta: { removed: r.removed, unlinked: r.unlinked } });
  await invalidate(`stats:${ctx.tenantId}:`);
  return r;
});