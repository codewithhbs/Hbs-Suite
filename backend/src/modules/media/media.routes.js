import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as fileCtrl from "./controllers/file.controller.js";

/**
 * media module routes -> mounted at /api/media
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/:file", adapt(fileCtrl.GET));

export default router;
