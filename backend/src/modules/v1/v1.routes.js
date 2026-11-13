import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as clientsCtrl from "./controllers/clients.controller.js";
import * as meCtrl from "./controllers/me.controller.js";
import * as postsCtrl from "./controllers/posts.controller.js";
import * as clientsIdCtrl from "./controllers/clients.id.controller.js";
import * as postsIdCtrl from "./controllers/posts.id.controller.js";
import * as clientsIdPerformanceCtrl from "./controllers/clients.id.performance.controller.js";
import * as clientsIdPostingPlanCtrl from "./controllers/clients.id.posting-plan.controller.js";
import * as clientsIdReviewsCtrl from "./controllers/clients.id.reviews.controller.js";

/**
 * v1 module routes -> mounted at /api/v1
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/clients", adapt(clientsCtrl.GET));
router.get("/me", adapt(meCtrl.GET));
router.get("/posts", adapt(postsCtrl.GET));
router.post("/posts", adapt(postsCtrl.POST));
router.get("/clients/:id", adapt(clientsIdCtrl.GET));
router.get("/posts/:id", adapt(postsIdCtrl.GET));
router.get("/clients/:id/performance", adapt(clientsIdPerformanceCtrl.GET));
router.get("/clients/:id/posting-plan", adapt(clientsIdPostingPlanCtrl.GET));
router.get("/clients/:id/reviews", adapt(clientsIdReviewsCtrl.GET));

export default router;
