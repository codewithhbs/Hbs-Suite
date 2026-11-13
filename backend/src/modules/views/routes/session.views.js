import { Router } from "express";
import { h } from "../../../core/http/asyncHandler.js";
import { view, plain } from "../view.js";
import { getSession } from "../../../lib/auth.js";
import { getSettings } from "../../../lib/saas/settings.js";
import { platformBrand, tenantBrand } from "../../../lib/branding.js";
import { publicAnalyticsId } from "../../../lib/integrations/store.js";
import { footerPages } from "../../../lib/cms/pages.js";
import { providerInfo } from "../../../lib/ai/index.js";
import { gmbProviderInfo } from "../../../lib/gmb/provider.js";
import { storageInfo } from "../../../lib/storage/index.js";
import { maintenanceState, bypassesMaintenance } from "../../../lib/system/maintenance.js";
import { publicSettings } from "../services/publicSettings.js";

const router = Router();

/**
 * GET /api/views/bootstrap - public, called once on SPA load.
 * Brand, public settings, footer pages, GA id and who (if anyone) is signed in.
 */
router.get(
  "/bootstrap",
  h(async () => {
    const [settings, brand, ga, pages, session] = await Promise.all([
      getSettings(),
      platformBrand().catch(() => ({ name: "HBS Suite", logo: null })),
      publicAnalyticsId().catch(() => null),
      footerPages().catch(() => []),
      getSession().catch(() => null),
    ]);
    return {
      settings: publicSettings(settings),
      brand,
      analyticsId: ga && /^G-[A-Z0-9]+$/.test(ga) ? ga : null,
      footerPages: plain(pages),
      session: session ? { role: session.role, tenantId: session.tenantId || null, name: session.name } : null,
    };
  }),
);

/**
 * GET /api/views/session - everything the workspace shell needs
 * (what the old (app)/layout.js + requireTenantContext computed per page).
 */
router.get(
  "/session",
  view({ tenant: false }, async ({ ctx, req }) => {
    const [m, settings] = await Promise.all([maintenanceState(), getSettings()]);
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.headers["x-real-ip"] || req.ip;
    const blocked = !ctx.isSuperAdmin && !bypassesMaintenance(m, { session: ctx.session, ip });
    const brand = ctx.tenantId ? await tenantBrand(ctx.tenant).catch(() => null) : await platformBrand().catch(() => null);
    return {
      session: ctx.session,
      role: ctx.role,
      perms: ctx.perms,
      isSuperAdmin: ctx.isSuperAdmin,
      impersonating: ctx.impersonating,
      tenant: plain(ctx.tenant || null),
      plan: plain(ctx.plan || null),
      limits: plain(ctx.limits || null),
      features: plain(ctx.features || null),
      ent: plain(ctx.ent || null),
      brand,
      aiProvider: providerInfo(),
      gmbProvider: gmbProviderInfo(),
      storage: storageInfo(),
      platformName: settings.platform_name,
      disableRightClick: Number(settings.app_disable_right_click) === 1,
      maintenance: {
        enabled: Boolean(m.enabled),
        blocked,
        title: m.title,
        message: m.message,
        eta: m.eta || null,
        platformName: m.platformName,
        supportEmail: m.supportEmail,
      },
    };
  }),
);

export default router;
