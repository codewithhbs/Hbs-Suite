import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { TenantList } from "@/components/admin/tenant-list";

export default function AdminTenantsPage() {
  useTitle("Tenants");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/admin/tenants?${query}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Tenants</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create accounts, switch plans, grant credits, suspend or impersonate.</p>
      </div>
      {data ? (
        <TenantList tenants={data.tenants.items} meta={data.tenants} plans={data.plans} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
