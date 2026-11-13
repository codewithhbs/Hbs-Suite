/**
 * Every background job, by name. Workers call these directly (no HTTP hop
 * back into the API like the old Next.js scheduler had to).
 */
const beat = async (name, ok = true, message = null) => {
  const { beat: b } = await import("../lib/system/heartbeat.js");
  await b(name, { ok, message }).catch(() => {});
};
const maintenanceOn = async () => (await (await import("../lib/system/maintenance.js")).maintenanceState()).enabled;

export const JOBS = {
  /** nightly AI generation for every SCHEDULED calendar slot */
  "ai.nightly": {
    queue: "ai",
    cron: process.env.NIGHTLY_CRON || "0 0 * * *",
    async run(data = {}) {
      if (await maintenanceOn()) {
        await beat("nightly_job", true, "skipped - maintenance mode");
        return { skipped: "maintenance" };
      }
      const { runNightlyJob } = await import("../lib/ai/orchestrator.js");
      try {
        const r = await runNightlyJob({
          date: data.date || null,
          clientId: data.clientId ? Number(data.clientId) : null,
          tenantId: data.tenantId ? Number(data.tenantId) : null,
          limit: Number(data.limit || 100),
        });
        await beat("nightly_job", true, `${r.generated}/${r.scheduled} generated, ${r.skipped} skipped`);
        return r;
      } catch (err) {
        await beat("nightly_job", false, err.message);
        throw err;
      }
    },
  },

  "publishing.calendar": {
    queue: "publishing",
    cron: process.env.CALENDAR_POST_CRON || "*/2 * * * *",
    async run() {
      if (await maintenanceOn()) return { skipped: "maintenance" };
      const { runCalendarPublisher } = await import("../lib/posting/calendarPublisher.js");
      try {
        const r = await runCalendarPublisher();
        await beat("calendar_post", true, JSON.stringify(r));
        return r;
      } catch (err) {
        await beat("calendar_post", false, err.message);
        throw err;
      }
    },
  },

  "publishing.auto": {
    queue: "publishing",
    cron: process.env.AUTO_PUBLISH_CRON || "*/5 * * * *",
    async run() {
      const { runAutoPublish } = await import("../lib/posting/autoPublish.js");
      try {
        const r = await runAutoPublish();
        await beat("auto_publish", true, JSON.stringify(r));
        return r;
      } catch (err) {
        await beat("auto_publish", false, err.message);
        throw err;
      }
    },
  },

  "mail.drain": {
    queue: "mail",
    every: Number(process.env.MAIL_WORKER_INTERVAL_MS || 10000),
    async run() {
      const { processEmailQueue } = await import("../lib/mail/queue.js");
      return processEmailQueue(Number(process.env.MAIL_BATCH || 25));
    },
  },

  "maintenance.billing": {
    queue: "maintenance",
    cron: process.env.BILLING_CRON || "30 1 * * *",
    async run() {
      const { runBillingCycle } = await import("../lib/saas/billing.js");
      try {
        const r = await runBillingCycle();
        await beat("billing", true, JSON.stringify(r).slice(0, 400));
        return r;
      } catch (err) {
        await beat("billing", false, err.message);
        throw err;
      }
    },
  },

  "maintenance.housekeeping": {
    queue: "maintenance",
    cron: process.env.HOUSEKEEPING_CRON || "30 2 * * *",
    async run() {
      const { expirePlans } = await import("../lib/posting/plan.js");
      const { pruneCounters } = await import("../lib/api/rateLimiter.js");
      const expired = await expirePlans();
      await pruneCounters();
      return { expired };
    },
  },

  "maintenance.image-cleanup": {
    queue: "maintenance",
    cron: process.env.IMAGE_CLEANUP_CRON || "0 2 * * *",
    async run() {
      const { cleanupOldImages } = await import("../lib/images/cleanup.js");
      return cleanupOldImages();
    },
  },

  "maintenance.health": {
    queue: "maintenance",
    cron: process.env.HEALTH_CRON || "5 * * * *",
    async run() {
      const { runHealthChecks } = await import("../lib/system/health.js");
      const r = await runHealthChecks({ runBy: "scheduler" });
      return { overall: r.overall };
    },
  },

  "maintenance.review-sync": {
    queue: "maintenance",
    cron: process.env.REVIEW_SYNC_CRON || "*/30 * * * *",
    async run() {
      const { syncReviews } = await import("../lib/reviews/inbox.js");
      try {
        const r = await syncReviews();
        await beat("review_sync", true, `${r.clients} listings, ${r.fresh} new, ${r.errors} errors`);
        return r;
      } catch (err) {
        await beat("review_sync", false, err.message);
        throw err;
      }
    },
  },

  "maintenance.listing-health": {
    queue: "maintenance",
    cron: process.env.LISTING_HEALTH_CRON || "0 3 * * *",
    async run() {
      const { checkAllListings } = await import("../lib/gmb/healthMonitor.js");
      try {
        const r = await checkAllListings();
        await beat("listing_monitor", true, JSON.stringify(r));
        return r;
      } catch (err) {
        await beat("listing_monitor", false, err.message);
        throw err;
      }
    },
  },

  /** shows up in Admin -> System health ("scheduler" heartbeat) */
  "maintenance.heartbeat": {
    queue: "maintenance",
    cron: "* * * * *",
    async run() {
      await beat("scheduler");
      return { ok: true };
    },
  },

  "maintenance.hydrate-integrations": {
    queue: "maintenance",
    cron: "*/5 * * * *",
    async run() {
      const { hydrateEnvFromIntegrations } = await import("../lib/integrations/store.js");
      await hydrateEnvFromIntegrations({ fresh: true });
      return { ok: true };
    },
  },
};
