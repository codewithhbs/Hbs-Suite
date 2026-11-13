import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as reviewSlugCtrl from "./controllers/review.slug.controller.js";

/**
 * public module routes -> mounted at /api/public
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.post("/review/:slug", adapt(reviewSlugCtrl.POST));

export default router;
