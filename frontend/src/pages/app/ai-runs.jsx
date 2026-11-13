import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useWorkspace } from "@/hooks/use-workspace";
import { useListParams } from "@/hooks/use-list-params";
import { Card, CardHeader, Table, EmptyRow, Stat } from "@/components/ui";
import { AiRunsTable } from "@/components/ai-runs-table";

export default function AiRunsPage() {
  useTitle("AI runs");
  const ctx = useWorkspace();
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/ai-runs?${query}`);
  if (!data) return <PageState loading={loading} error={error} />;
  const { runs, agents, stats } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI runs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Every agent call, with tokens, duration and cost where the provider reports it.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="AI calls" value={stats.ai_calls} tone="indigo" />
        <Stat label="Failures" value={stats.ai_errors} tone="red" />
        <Stat label="Success rate" value={`${stats.ai_success_rate}%`} tone="emerald" />
        <Stat label="Credits used" value={stats.credits_used ?? 0} sub={`Wallet balance ${ctx.ent.wallet.balance}`} tone="amber" />
      </div>

      <Card>
        <CardHeader title="Cost and usage by agent" />
        <Table head={["Agent", "Calls", "Failures", "Avg duration", "Input tokens", "Output tokens", "Credits"]}
          empty={!agents.length ? <EmptyRow colSpan={7}>No AI calls recorded yet.</EmptyRow> : null}>
          {agents.map((a) => (
            <tr key={a.agent}>
              <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-100">{a.agent}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.calls}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.failures}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.avg_ms} ms</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.in_tokens}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.out_tokens}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{a.credits || 0}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <AiRunsTable runs={runs} agents={agents.map((a) => a.agent)} params={params} onParams={set} loading={loading} />
    </div>
  );
}