import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { Stat } from "@/components/ui";
import { KeywordsTable } from "@/components/keywords-table";

export default function KeywordsPage() {
  useTitle("Keywords");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/keywords?${query}`);
  if (!data) return <PageState loading={loading} error={error} />;
  const { rows, counts, types, clientFiltered } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Keywords</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No search-volume provider is connected, so every AI keyword is labelled AI suggested.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total keywords" value={counts.total} tone="indigo" />
        <Stat label="From clients" value={counts.client || 0} tone="emerald" />
        <Stat label="AI suggested" value={counts.ai || 0} tone="blue" />
        <Stat label="With real volume data" value={counts.with_volume || 0} sub="Needs a keyword data source" tone="amber" />
      </div>

      <KeywordsTable rows={rows} types={types} clientFiltered={clientFiltered} params={params} onParams={set} loading={loading} />
    </div>
  );
}
