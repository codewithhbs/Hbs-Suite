import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { Pagination } from "@/components/pagination";
import { SearchInput } from "@/components/search-input";
import { Card, CardHeader, Table, EmptyRow, Badge } from "@/components/ui";
import { formatDate, truncate } from "@/lib/utils";

export default function AdminAuditPage() {
  useTitle("Audit log");
  const { params, set, query } = useListParams({ limit: "50" });
  const { data, error, loading } = usePageData(`/api/views/admin/audit?${query}`);
  if (!data) return <PageState loading={loading} error={error} />;
  const logs = data.logs.items;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Audit log</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Who did what, in which tenant, and when.</p>
      </div>
      <Card>
        <CardHeader title={`${data.logs.total} entries`} action={<SearchInput placeholder="Search action, user, entity..." value={params.q || ""} onSearch={(q) => set({ q })} className="!w-56 !py-1.5" />} />
        <Table head={["When", "Tenant", "User", "Role", "Action", "Entity", "Meta"]}
          empty={!logs.length ? <EmptyRow colSpan={7}>Nothing logged yet.</EmptyRow> : null}>
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
              <td className="px-4 py-2 text-xs text-zinc-500">{formatDate(l.created_at, true)}</td>
              <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-300">{l.tenant_name || "platform"}</td>
              <td className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-300">{l.user_name}</td>
              <td className="px-4 py-2"><Badge tone={l.role === "SUPER_ADMIN" ? "indigo" : "slate"}>{l.role || "-"}</Badge></td>
              <td className="px-4 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-100">{l.action}</td>
              <td className="px-4 py-2 text-xs text-zinc-500">{l.entity ? `${l.entity}#${l.entity_id ?? "-"}` : "-"}</td>
              <td className="px-4 py-2 text-xs text-zinc-500">{truncate(l.meta, 70)}</td>
            </tr>
          ))}
        </Table>
        <Pagination meta={data.logs} onChange={set} loading={loading} />
      </Card>
    </div>
  );
}
