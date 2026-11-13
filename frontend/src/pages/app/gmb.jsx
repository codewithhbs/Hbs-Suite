import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import Link from "@/shims/next-link";
import { GmbProfilesTable } from "@/components/gmb-profiles-table";

export default function GmbListPage() {
  useTitle("GMB profiles");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/gmb?${query}`);
  if (!data) return <PageState loading={loading} error={error} />;
  const { rows, provider, live, totalProfiles } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">GMB profiles</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {live} of {totalProfiles} profile(s) live on Google.
          {totalProfiles - live ? ` Others use ${provider.isMock ? "demo (mock) data" : "Google once connected"} - connect them from the client page.` : ""}
        </p>
      </div>
      {data.canConnect ? (
        <Link href="/gmb/import" className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600">
          Import all listings from Google
        </Link>
      ) : null}
      </div>

      <GmbProfilesTable rows={rows} statuses={data.statuses} params={params} onParams={set} loading={loading} />
    </div>
  );
}
