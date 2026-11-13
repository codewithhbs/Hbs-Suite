import { Router } from "express";
import { h } from "../../../core/http/asyncHandler.js";
import { HttpError } from "../../../core/http/errors.js";
import { plain } from "../view.js";
import { cached } from "../../../core/cache.js";
import { listPlans, listCreditPacks } from "../../../lib/saas/billing.js";
import { getSettings } from "../../../lib/saas/settings.js";
import { razorpayConfig } from "../../../lib/payments/razorpay.js";
import { readSignupToken } from "../../../lib/googleLogin.js";
import { flowBySlug } from "../../../lib/reviews/flow.js";
import { getPage } from "../../../lib/cms/pages.js";
import { renderMarkdown } from "../../../lib/cms/markdown.js";

const router = Router();
const PUBLIC_TTL = Number(process.env.VIEW_PUBLIC_TTL || 60);

/** GET /api/views/public/plans - landing + pricing */
router.get(
  "/public/plans",
  h(async () =>
    cached("public:plans", PUBLIC_TTL, async () => {
      const [plans, packs] = await Promise.all([listPlans({ publicOnly: true }), listCreditPacks()]);
      return plain({ plans, packs });
    }),
  ),
);

/** GET /api/views/public/signup?plan&cycle&g */
router.get(
  "/public/signup",
  h(async (req) => {
    const settings = await getSettings();
    if (Number(settings.allow_signup) !== 1) return { closed: true };
    const sp = req.query;
    const [plans, rp] = await Promise.all([listPlans({ publicOnly: true }), razorpayConfig()]);
    const selected = plans.find((p) => p.slug === sp.plan)?.slug || settings.default_plan_slug || plans[0]?.slug;
    const g = sp.g ? readSignupToken(String(sp.g)) : null;
    return {
      closed: false,
      plans: plain(plans),
      selected,
      initialCycle: sp.cycle === "YEARLY" ? "YEARLY" : "MONTHLY",
      taxPercent: Number(settings.tax_percent || 0),
      onlinePayments: Boolean(rp.enabled),
      platformName: settings.platform_name || "HBS Suite",
      supportEmail: settings.support_email || "",
      google: g ? { email: g.email, name: g.name, token: sp.g } : null,
    };
  }),
);

/** GET /api/views/public/review/:slug - QR review funnel (no login) */
router.get(
  "/public/review/:slug",
  h(async (req) => {
    const f = await flowBySlug(req.params.slug);
    if (!f) throw new HttpError(404, "Not found", "NOT_FOUND");
    return {
      flow: {
        slug: f.slug,
        business: f.business_name,
        category: f.business_category,
        city: f.city,
        logo: f.logo_url,
        color: /^#[0-9a-f]{6}$/i.test(f.poster?.accent || "") ? f.poster.accent : f.brand_color || "#0EA5E9",
        mode: f.mode,
        steps: f.steps,
        threshold: Number(f.threshold) || 4,
        reviewUrl: f.reviewUrl,
      },
    };
  }),
);

/** GET /api/views/public/cms/:slug - published CMS page, markdown rendered server-side */
router.get(
  "/public/cms/:slug",
  h(async (req) => {
    const p = await getPage(String(req.params.slug));
    if (!p) throw new HttpError(404, "Not found", "NOT_FOUND");
    return {
      page: {
        slug: p.slug,
        title: p.title,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        updated_at: p.updated_at,
        html: renderMarkdown(p.content),
      },
    };
  }),
);

export default router;
