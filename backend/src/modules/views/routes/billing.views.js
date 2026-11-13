import { Router } from "express";
import { view, plain } from "../view.js";
import { pageParams, pagedQuery } from "../../../core/pagination.js";
import { listPlans, listCreditPacks, getSubscription } from "../../../lib/saas/billing.js";
import { quotaSummary } from "../../../lib/saas/entitlements.js";
import { estimatePostCost } from "../../../lib/saas/credits.js";
import { razorpayConfig } from "../../../lib/payments/razorpay.js";

const router = Router();

/** GET /api/views/billing?invPage&ledgerPage */
router.get(
  "/billing",
  view({ permission: "billing.view" }, async ({ ctx, q }) => {
    if (ctx.ent.internal) return { internal: true, tenantName: ctx.tenant.name, lifetimeUsed: Number(ctx.ent.wallet.lifetime_used || 0) };
    const invPage = pageParams({ page: q.invPage, limit: q.invLimit }, { defaultLimit: 10, maxLimit: 50 });
    const ledgerPage = pageParams({ page: q.ledgerPage, limit: q.ledgerLimit }, { defaultLimit: 20, maxLimit: 100 });
    const [plans, packs, invoices, ledger, subscription, postCost, rp] = await Promise.all([
      listPlans({ publicOnly: true }),
      listCreditPacks(),
      pagedQuery({
        select: "i.*, t.name AS tenant_name",
        from: "invoices i JOIN tenants t ON t.id=i.tenant_id",
        where: ["i.tenant_id=?"],
        params: [ctx.tenantId],
        orderBy: "i.id DESC",
        page: invPage,
      }),
      pagedQuery({ select: "*", from: "credit_ledger", where: ["tenant_id=?"], params: [ctx.tenantId], orderBy: "id DESC", page: ledgerPage }),
      getSubscription(ctx.tenantId),
      estimatePostCost({ withImage: ctx.features.f_image_generation }),
      razorpayConfig(),
    ]);
    return {
      internal: false,
      canManage: ctx.can("billing.manage"),
      data: plain({
        subscription,
        plan: ctx.plan,
        limits: ctx.limits,
        features: ctx.features,
        usage: ctx.ent.usage,
        live: ctx.ent.live,
        wallet: ctx.ent.wallet,
        quotas: quotaSummary(ctx.ent),
        status: ctx.ent.status,
        plans,
        packs,
        invoices: invoices.items,
        invoicesPage: { ...invoices, items: undefined },
        ledger: ledger.items,
        ledgerPage: { ...ledger, items: undefined },
        postCost,
        onlinePayments: rp.enabled,
      }),
    };
  }),
);

export default router;
