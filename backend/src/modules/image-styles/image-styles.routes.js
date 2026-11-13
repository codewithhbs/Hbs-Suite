import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";

/**
 * image-styles module routes -> mounted at /api/image-styles
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/", adapt(indexCtrl.GET));

export default router;
