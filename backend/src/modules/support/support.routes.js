import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as ticketsCtrl from "./controllers/tickets.controller.js";
import * as attachmentsKeyCtrl from "./controllers/attachments.key.controller.js";
import * as ticketsIdCtrl from "./controllers/tickets.id.controller.js";

/**
 * support module routes -> mounted at /api/support
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/tickets", adapt(ticketsCtrl.GET));
router.post("/tickets", adapt(ticketsCtrl.POST));
router.get("/attachments/:key", adapt(attachmentsKeyCtrl.GET));
router.get("/tickets/:id", adapt(ticketsIdCtrl.GET));
router.post("/tickets/:id", adapt(ticketsIdCtrl.POST));
router.patch("/tickets/:id", adapt(ticketsIdCtrl.PATCH));

export default router;
