import viewsRoutes from "./views/views.routes.js";
import pwaRoutes from "./pwa/pwa.routes.js";
import accountRoutes from "./account/account.routes.js";
import adminRoutes from "./admin/admin.routes.js";
import aiRoutes from "./ai/ai.routes.js";
import apiKeysRoutes from "./api-keys/api-keys.routes.js";
import authRoutes from "./auth/auth.routes.js";
import billingRoutes from "./billing/billing.routes.js";
import calendarRoutes from "./calendar/calendar.routes.js";
import clientsRoutes from "./clients/clients.routes.js";
import cronRoutes from "./cron/cron.routes.js";
import gmbRoutes from "./gmb/gmb.routes.js";
import healthRoutes from "./health/health.routes.js";
import imageStylesRoutes from "./image-styles/image-styles.routes.js";
import listingHealthRoutes from "./listing-health/listing-health.routes.js";
import mediaRoutes from "./media/media.routes.js";
import metaRoutes from "./meta/meta.routes.js";
import notificationsRoutes from "./notifications/notifications.routes.js";
import paymentsRoutes from "./payments/payments.routes.js";
import plansRoutes from "./plans/plans.routes.js";
import publicRoutes from "./public/public.routes.js";
import pushConfigRoutes from "./push-config/push-config.routes.js";
import rankRoutes from "./rank/rank.routes.js";
import reportsRoutes from "./reports/reports.routes.js";
import reviewsRoutes from "./reviews/reviews.routes.js";
import searchRoutes from "./search/search.routes.js";
import settingsRoutes from "./settings/settings.routes.js";
import socialRoutes from "./social/social.routes.js";
import supportRoutes from "./support/support.routes.js";
import tasksRoutes from "./tasks/tasks.routes.js";
import teamRoutes from "./team/team.routes.js";
import v1Routes from "./v1/v1.routes.js";

/**
 * Module registry (modular monolith). Each module owns its routes + controllers.
 *   /api/<module>/*  -> modules/<module>/<module>.routes.js
 */
export function registerModules(app) {
  app.use("/api/views", viewsRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/api-keys", apiKeysRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/calendar", calendarRoutes);
  app.use("/api/clients", clientsRoutes);
  app.use("/api/cron", cronRoutes);
  app.use("/api/gmb", gmbRoutes);
  app.use("/api/health", healthRoutes);
  app.use("/api/image-styles", imageStylesRoutes);
  app.use("/api/listing-health", listingHealthRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/meta", metaRoutes);
  app.use("/api/notifications", notificationsRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/plans", plansRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/push-config", pushConfigRoutes);
  app.use("/api/rank", rankRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/reviews", reviewsRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api/v1", v1Routes);
  app.use("/", pwaRoutes);
}

export const MODULES = ["views", "account", "admin", "ai", "api-keys", "auth", "billing", "calendar", "clients", "cron", "gmb", "health", "image-styles", "listing-health", "media", "meta", "notifications", "payments", "plans", "public", "push-config", "rank", "reports", "reviews", "search", "settings", "social", "support", "tasks", "team", "v1", "pwa"];
