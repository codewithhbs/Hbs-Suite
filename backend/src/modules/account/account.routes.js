import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as indexCtrl from "./controllers/index.controller.js";

/**
 * account module routes -> mounted at /api/account
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.patch("/", adapt(indexCtrl.PATCH));

export default router;
