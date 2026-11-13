import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as importCtrl from "./controllers/import.controller.js";
import * as generateCtrl from "./controllers/generate.controller.js";

/**
 * calendar module routes -> mounted at /api/calendar
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.patch("/", adapt(indexCtrl.PATCH));
router.delete("/", adapt(indexCtrl.DELETE));

router.post("/generate", adapt(generateCtrl.POST));
router.get("/import", adapt(importCtrl.GET));
router.post("/import", adapt(importCtrl.POST));

export default router;
