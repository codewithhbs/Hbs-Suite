import { signupRoute } from "../../../lib/saas/publicRoute.js";
import { resendSignupCode } from "../../../lib/saas/signup.js";


export const POST = signupRoute("signup-resend", { max: 5, windowSec: 900 }, ({ body }) => resendSignupCode(body.token));
