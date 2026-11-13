import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { Card, CardHeader, Stat } from "@/components/ui";
import { TaskFilters } from "@/components/task-filters";
import { TaskQueueTable } from "@/components/task-queue-table";

export default function TasksPage() {
  useTitle("AI tasks");
  const { params, set, query } = useListParams({ limit: "25" });
  const status = params.status || "";
  const { data, error, loading } = usePageData(`/api/views/tasks?${query}`);
  if (!data) return <PageState loading={loading} error={error} />;
  const { tasks, stats } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Today&apos;s AI tasks</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Review the generated post, edit if needed, then approve and publish. Select multiple rows to approve or reject in bulk.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ready for review" value={stats.ready} tone="emerald" />
        <Stat label="Needs attention" value={stats.needs_review} tone="amber" />
        <Stat label="Rejected" value={stats.rejected} tone="red" />
        <Stat label="Published" value={stats.published} tone="indigo" />
      </div>

      <Card>
        <CardHeader title="Task queue" subtitle={`${tasks.total} tasks`} action={<div className="flex flex-wrap items-center gap-2"><SearchInput placeholder="Search title, topic, client..." value={params.q || ""} onSearch={(q) => set({ q })} className="!w-56 !py-1.5" /><TaskFilters current={status} /></div>} />
        <TaskQueueTable tasks={tasks.items} bulkEnabled={data.bulkEnabled} canPublish={data.canPublish} />
        <Pagination meta={tasks} onChange={set} loading={loading} />
      </Card>
    </div>
  );
}
