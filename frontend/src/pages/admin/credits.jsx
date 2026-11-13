import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { CreditManager } from "@/components/admin/credit-manager";

export default function AdminCreditsPage() {
  useTitle("AI credits");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/admin/credits?${query}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI credits</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Every AI agent call debits the tenant wallet. Plan credits refill each cycle, purchased credits never expire.</p>
      </div>
      {data ? (
        <CreditManager wallets={data.wallets.items} walletsMeta={data.wallets} packs={data.packs} tenants={data.tenants} costs={data.costs} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
