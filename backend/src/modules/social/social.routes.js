import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as callbackCtrl from "./controllers/callback.controller.js";
import * as clientIdConnectCtrl from "./controllers/clientId.connect.controller.js";

/**
 * social module routes -> mounted at /api/social
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/callback", adapt(callbackCtrl.GET));
router.get("/:clientId/connect", adapt(clientIdConnectCtrl.GET));

export default router;
