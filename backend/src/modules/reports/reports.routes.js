import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as sharesCtrl from "./controllers/shares.controller.js";
import * as sharesIdFileCtrl from "./controllers/shares.id.file.controller.js";

/**
 * reports module routes -> mounted at /api/reports
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/shares", adapt(sharesCtrl.GET));
router.get("/shares/:id/file", adapt(sharesIdFileCtrl.GET));

export default router;
