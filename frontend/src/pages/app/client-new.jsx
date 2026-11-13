import { ClientForm } from "@/components/client-form";
import { QuotaNotice } from "@/components/quota-notice";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function NewClientPage() {
  useTitle("New client");
  const ctx = useWorkspace();
  const { data, error, loading } = usePageData("/api/views/clients/new");
  if (!data) return <PageState loading={loading} error={error} />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">New client</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">A mock GMB profile is created automatically.</p>
      </div>
      <QuotaNotice used={ctx.ent.live.clients} limit={ctx.limits.max_clients} label="clients" planName={ctx.plan?.name} />
      <ClientForm employees={data.employees} />
    </div>
  );
}
