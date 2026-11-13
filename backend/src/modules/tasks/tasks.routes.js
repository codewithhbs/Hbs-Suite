import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as bulkCtrl from "./controllers/bulk.controller.js";
import * as idCtrl from "./controllers/id.controller.js";
import * as idHumanizeCtrl from "./controllers/id.humanize.controller.js";
import * as idImageCtrl from "./controllers/id.image.controller.js";

/**
 * tasks module routes -> mounted at /api/tasks
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.post("/bulk", adapt(bulkCtrl.POST));
router.get("/:id", adapt(idCtrl.GET));
router.post("/:id", adapt(idCtrl.POST));
router.post("/:id/humanize", adapt(idHumanizeCtrl.POST));
router.post("/:id/image", adapt(idImageCtrl.POST));

export default router;
