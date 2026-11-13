import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as swCtrl from "./controllers/sw.controller.js";
import * as manifestCtrl from "./controllers/manifest.controller.js";

/** PWA files served from the API (dynamic: Firebase config + build id). Mounted at / */
const router = Router();
router.get("/sw.js", adapt(swCtrl.GET));
router.get("/manifest.webmanifest", adapt(manifestCtrl.GET));
export default router;
