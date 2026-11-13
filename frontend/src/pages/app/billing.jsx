import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { AutopayCard } from "@/components/autopay-card";
import { BillingClient } from "@/components/billing-client";

export default function BillingPage() {
  useTitle("Billing & plan");
  const ctx = useWorkspace();
  const [invPage, setInvPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const { data: view, error, loading } = usePageData(`/api/views/billing?invPage=${invPage}&ledgerPage=${ledgerPage}`);
  if (!view) return <PageState loading={loading} error={error} />;

  if (view.internal) {
    // own-company account: nothing to pay, nothing to limit
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Billing & plan</h1>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-zinc-900">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Own company account</p>
          <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{view.tenantName}</p>
          <ul className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 dark:text-zinc-200">
            {["Unlimited AI credits", "Unlimited clients & GMB profiles", "Unlimited team members", "Every feature unlocked", "No plan expiry", "No payments or invoices"].map((t) => (
              <li key={t} className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] text-white">✓</span>{t}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-500">AI usage is still counted (lifetime: {Number(view.lifetimeUsed || 0).toLocaleString("en-IN")} credits) so you can see how much the team uses.</p>
        </div>
      </div>
    );
  }

  const data = view.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Billing & plan</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your subscription, usage against plan limits, AI credit wallet and invoices.
        </p>
      </div>
      <AutopayCard canManage={ctx.can("billing.manage")} />
      <BillingClient data={data} canManage={view.canManage} onInvoicePage={setInvPage} onLedgerPage={setLedgerPage} loading={loading} />
    </div>
  );
}
