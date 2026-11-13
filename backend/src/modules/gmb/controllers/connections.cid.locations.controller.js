import { route } from "../../../lib/saas/routeKit.js";
import { connectionLocations } from "../../../lib/gmb/bulkConnect.js";


export const GET = route({ permission: "gmb.view" }, async ({ ctx, params }) => {
  const { connection, items } = await connectionLocations(params.cid, ctx.tenantId);
  return { connection, items };
});
