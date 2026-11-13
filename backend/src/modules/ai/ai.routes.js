import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as detectCtrl from "./controllers/detect.controller.js";
import * as enginesCtrl from "./controllers/engines.controller.js";
import * as nightlyCtrl from "./controllers/nightly.controller.js";

/**
 * ai module routes -> mounted at /api/ai
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.post("/detect", adapt(detectCtrl.POST));
router.get("/engines", adapt(enginesCtrl.GET));
router.post("/nightly", adapt(nightlyCtrl.POST));

export default router;
