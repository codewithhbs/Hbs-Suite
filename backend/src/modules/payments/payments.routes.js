import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as razorpayWebhookCtrl from "./controllers/razorpay.webhook.controller.js";

/**
 * payments module routes -> mounted at /api/payments
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.post("/razorpay/webhook", adapt(razorpayWebhookCtrl.POST));

export default router;
