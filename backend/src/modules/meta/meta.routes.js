import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as webhookCtrl from "./controllers/webhook.controller.js";

/**
 * meta module routes -> mounted at /api/meta
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/webhook", adapt(webhookCtrl.GET));
router.post("/webhook", adapt(webhookCtrl.POST));

export default router;
