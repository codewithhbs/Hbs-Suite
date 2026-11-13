import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as brandCtrl from "./controllers/brand.controller.js";
import * as themeCtrl from "./controllers/theme.controller.js";

/**
 * settings module routes -> mounted at /api/settings
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.get("/brand", adapt(brandCtrl.GET));
router.put("/brand", adapt(brandCtrl.PUT));
router.post("/brand", adapt(brandCtrl.POST));
router.delete("/brand", adapt(brandCtrl.DELETE));
router.put("/theme", adapt(themeCtrl.PUT));

export default router;
