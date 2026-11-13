import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { PlanManager } from "@/components/admin/plan-manager";

export default function AdminPlansPage() {
  useTitle("Plans");
  const { data, error, loading } = usePageData("/api/views/admin/plans");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Plans &amp; packaging</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Price, quotas and feature flags. Everything here is enforced live for every tenant on the plan.</p>
      </div>
      {data ? (
        <PlanManager plans={data.plans} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
