import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as inboxCtrl from "./controllers/inbox.controller.js";
import * as inboxIdCtrl from "./controllers/inbox.id.controller.js";

/**
 * reviews module routes -> mounted at /api/reviews
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/inbox", adapt(inboxCtrl.GET));
router.post("/inbox", adapt(inboxCtrl.POST));
router.post("/inbox/:id", adapt(inboxIdCtrl.POST));

export default router;
