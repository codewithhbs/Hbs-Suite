import { gmbRoute, requireMethod } from "../../../lib/gmb/routeHelpers.js";


export const DELETE = gmbRoute("gmb.connect", async ({ provider, clientId, params }) => {
  requireMethod(provider, "removeAdmin");
  return provider.removeAdmin(clientId, decodeURIComponent(params.adminId));
});
