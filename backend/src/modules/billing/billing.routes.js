import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as autopayCtrl from "./controllers/autopay.controller.js";
import * as creditsCtrl from "./controllers/credits.controller.js";
import * as upgradeCtrl from "./controllers/upgrade.controller.js";
import * as invoicesIdPayCtrl from "./controllers/invoices.id.pay.controller.js";

/**
 * billing module routes -> mounted at /api/billing
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.get("/autopay", adapt(autopayCtrl.GET));
router.post("/autopay", adapt(autopayCtrl.POST));
router.post("/credits", adapt(creditsCtrl.POST));
router.post("/upgrade", adapt(upgradeCtrl.POST));
router.post("/invoices/:id/pay", adapt(invoicesIdPayCtrl.POST));

export default router;
