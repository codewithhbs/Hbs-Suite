import { gmbRoute } from "../../../lib/gmb/routeHelpers.js";
import { importFromGoogle } from "../../../lib/gmb/importFromGoogle.js";


/** POST -> re-import profile, services, locations, logo, links and keywords from Google. */
export const POST = gmbRoute("gmb.edit", async ({ clientId }) => ({ result: await importFromGoogle(clientId) }));
