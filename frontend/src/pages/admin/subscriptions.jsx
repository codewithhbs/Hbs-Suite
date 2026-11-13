import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { SubscriptionList } from "@/components/admin/subscription-list";

export default function AdminSubscriptionsPage() {
  useTitle("Subscriptions");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/admin/subscriptions?${query}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Subscriptions</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Renewals, trials and expiries across every tenant.</p>
      </div>
      {data ? (
        <SubscriptionList subscriptions={data.subscriptions.items} meta={data.subscriptions} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
