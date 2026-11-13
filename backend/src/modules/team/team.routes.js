import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";
import * as idCtrl from "./controllers/id.controller.js";

/**
 * team module routes -> mounted at /api/team
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));
router.post("/", adapt(indexCtrl.POST));
router.patch("/:id", adapt(idCtrl.PATCH));
router.delete("/:id", adapt(idCtrl.DELETE));

export default router;
