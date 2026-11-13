import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as idCtrl from "./controllers/id.controller.js";

/**
 * api-keys module routes -> mounted at /api/api-keys
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.patch("/:id", adapt(idCtrl.PATCH));
router.post("/:id", adapt(idCtrl.POST));
router.delete("/:id", adapt(idCtrl.DELETE));

export default router;
