import { Router } from "express";
import { adapt } from "../../core/http/adapter.js";
import * as forgotPasswordCtrl from "./controllers/forgot-password.controller.js";
import * as loginCtrl from "./controllers/login.controller.js";
import * as logoutCtrl from "./controllers/logout.controller.js";
import * as resendOtpCtrl from "./controllers/resend-otp.controller.js";
import * as resetPasswordCtrl from "./controllers/reset-password.controller.js";
import * as verifyOtpCtrl from "./controllers/verify-otp.controller.js";
import * as googleCallbackCtrl from "./controllers/google.callback.controller.js";
import * as googleStartCtrl from "./controllers/google.start.controller.js";
import * as signupCompleteCtrl from "./controllers/signup.complete.controller.js";
import * as signupOrderCtrl from "./controllers/signup.order.controller.js";
import * as signupResendCtrl from "./controllers/signup.resend.controller.js";
import * as signupStartCtrl from "./controllers/signup.start.controller.js";
import * as signupVerifyCtrl from "./controllers/signup.verify.controller.js";

/**
 * auth module routes -> mounted at /api/auth
 * Controllers keep the original handler contract (Web Request in, Response out);
 * adapt() bridges them to Express.
 */
const router = Router();

router.post("/forgot-password", adapt(forgotPasswordCtrl.POST));
router.post("/login", adapt(loginCtrl.POST));
router.post("/logout", adapt(logoutCtrl.POST));
router.post("/resend-otp", adapt(resendOtpCtrl.POST));
router.post("/reset-password", adapt(resetPasswordCtrl.POST));
router.post("/verify-otp", adapt(verifyOtpCtrl.POST));
router.get("/google/callback", adapt(googleCallbackCtrl.GET));
router.get("/google/start", adapt(googleStartCtrl.GET));
router.post("/signup/complete", adapt(signupCompleteCtrl.POST));
router.post("/signup/order", adapt(signupOrderCtrl.POST));
router.post("/signup/resend", adapt(signupResendCtrl.POST));
router.post("/signup/start", adapt(signupStartCtrl.POST));
router.post("/signup/verify", adapt(signupVerifyCtrl.POST));

export default router;
