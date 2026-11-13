import { route } from "../../../lib/saas/routeKit.js";
import { listIntegrationsForAdmin } from "../../../lib/integrations/store.js";


/** Browser-safe list: secrets are never returned, only "set" + a mask. */
export const GET = route({ superAdmin: true }, async () => ({ items: await listIntegrationsForAdmin() }));
