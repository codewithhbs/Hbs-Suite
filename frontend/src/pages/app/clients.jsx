import Link from "@/shims/next-link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { ClientsTable } from "@/components/clients-table";
import { usePageData } from "@/hooks/use-page-data";
import { useListParams } from "@/hooks/use-list-params";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function ClientsPage() {
  useTitle("Clients");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/clients?${query}`);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Clients</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Business data the AI is allowed to use.</p>
        </div>
        <Link href="/clients/new"><Button><Plus className="h-3.5 w-3.5" /> New client</Button></Link>
      </div>
      {data ? (
        <ClientsTable clients={data.clients} categories={data.categories} employees={data.employees} all={data.all} limit={data.limit} canAssign={data.canAssign} canDedupe={data.canDedupe} onlyAssigned={data.onlyAssigned} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
