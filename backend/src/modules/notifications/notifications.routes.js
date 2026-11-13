import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as fcmTokenCtrl from "./controllers/fcm-token.controller.js";
import * as streamCtrl from "./controllers/stream.controller.js";

/**
 * notifications module routes -> mounted at /api/notifications
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.post("/fcm-token", adapt(fcmTokenCtrl.POST));
router.delete("/fcm-token", adapt(fcmTokenCtrl.DELETE));
router.get("/stream", adapt(streamCtrl.GET));

export default router;
