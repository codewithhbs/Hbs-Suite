import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as locateCtrl from "./controllers/locate.controller.js";
import * as scansCtrl from "./controllers/scans.controller.js";
import * as scansIdCtrl from "./controllers/scans.id.controller.js";
import * as scansIdMapCtrl from "./controllers/scans.id.map.controller.js";

/**
 * rank module routes -> mounted at /api/rank
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/locate", adapt(locateCtrl.GET));
router.post("/locate", adapt(locateCtrl.POST));
router.get("/scans", adapt(scansCtrl.GET));
router.post("/scans", adapt(scansCtrl.POST));
router.get("/scans/:id", adapt(scansIdCtrl.GET));
router.get("/scans/:id/map", adapt(scansIdMapCtrl.GET));

export default router;
