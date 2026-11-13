import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as idCtrl from "./controllers/id.controller.js";
import * as duplicatesCtrl from "./controllers/duplicates.controller.js";
import * as assignCtrl from "./controllers/assign.controller.js";
import * as idAutoPublishCtrl from "./controllers/id.auto-publish.controller.js";
import * as idImageStyleCtrl from "./controllers/id.image-style.controller.js";
import * as idPostingPlanCtrl from "./controllers/id.posting-plan.controller.js";
import * as idReviewSettingsCtrl from "./controllers/id.review-settings.controller.js";

/**
 * clients module routes -> mounted at /api/clients
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.get("/duplicates", adapt(duplicatesCtrl.GET));
router.post("/duplicates", adapt(duplicatesCtrl.POST));
router.post("/assign", adapt(assignCtrl.POST));
router.get("/:id", adapt(idCtrl.GET));
router.patch("/:id", adapt(idCtrl.PATCH));
router.delete("/:id", adapt(idCtrl.DELETE));
router.get("/:id/auto-publish", adapt(idAutoPublishCtrl.GET));
router.put("/:id/auto-publish", adapt(idAutoPublishCtrl.PUT));
router.get("/:id/image-style", adapt(idImageStyleCtrl.GET));
router.put("/:id/image-style", adapt(idImageStyleCtrl.PUT));
router.get("/:id/posting-plan", adapt(idPostingPlanCtrl.GET));
router.put("/:id/posting-plan", adapt(idPostingPlanCtrl.PUT));
router.post("/:id/posting-plan", adapt(idPostingPlanCtrl.POST));
router.get("/:id/review-settings", adapt(idReviewSettingsCtrl.GET));
router.put("/:id/review-settings", adapt(idReviewSettingsCtrl.PUT));

export default router;
