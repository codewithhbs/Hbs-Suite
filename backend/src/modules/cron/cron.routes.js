import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as calendarPostCtrl from "./controllers/calendar-post.controller.js";
import * as heartbeatCtrl from "./controllers/heartbeat.controller.js";
import * as mailWorkerCtrl from "./controllers/mail-worker.controller.js";

/**
 * cron module routes -> mounted at /api/cron
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.post("/calendar-post", adapt(calendarPostCtrl.POST));
router.post("/heartbeat", adapt(heartbeatCtrl.POST));
router.post("/mail-worker", adapt(mailWorkerCtrl.POST));
router.get("/mail-worker", adapt(mailWorkerCtrl.GET));

export default router;
