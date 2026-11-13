import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import Link from "next/link";
import {
  Card,
  CardHeader,
  Table,
  EmptyRow,
  Badge,
  Select,
} from "@/components/ui";
import { truncate } from "@/lib/utils";

/** Server-paginated keywords. rows = { items, total, page, limit, pages } */
export function KeywordsTable({ rows, types = [], clientFiltered, params = {}, onParams, loading = false }) {
  const pageRows = rows.items || [];
  return (
    <Card>
      <CardHeader
        title={`${rows.total.toLocaleString("en-IN")} keywords`}
        subtitle={clientFiltered ? "Filtered by client" : "All clients"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput placeholder="Search keyword..." value={params.q || ""} onSearch={(q) => onParams({ q })} className="!w-44 !py-1.5" />
            <Select value={params.type || ""} onChange={(e) => onParams({ type: e.target.value })} className="!w-32">
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select value={params.source || ""} onChange={(e) => onParams({ source: e.target.value })} className="!w-36">
              <option value="">All sources</option>
              <option value="CLIENT">Client</option>
              <option value="AI_SUGGESTED">AI suggested</option>
            </Select>
          </div>
        }
      />
      <Table
        head={[
          "Keyword",
          "Client",
          "Type",
          "Source",
          "Relevance",
          "Priority",
          "Reason",
        ]}
        empty={
          !pageRows.length ? (
            <EmptyRow colSpan={7}>No keywords match this filter.</EmptyRow>
          ) : null
        }
      >
        {pageRows.map((k) => (
          <tr key={k.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
            <td className="px-4 py-2 text-zinc-800 dark:text-zinc-100">
              {k.keyword}
            </td>
            <td className="px-4 py-2">
              <Link
                href={`/clients/${k.client_id}`}
                className="text-zinc-600 dark:text-zinc-400 hover:text-brand-500 dark:text-brand-400"
              >
                {k.business_name}
              </Link>
            </td>
            <td className="px-4 py-2">
              <Badge>{k.kw_type}</Badge>
            </td>
            <td className="px-4 py-2">
              <Badge tone={k.source === "CLIENT" ? "emerald" : "blue"}>
                {k.source === "CLIENT" ? "Client" : "AI suggested"}
              </Badge>
            </td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
              {k.relevance_score}
            </td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
              {k.priority}
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
              {truncate(k.reason, 80)}
            </td>
          </tr>
        ))}
      </Table>

      <Pagination meta={rows} onChange={onParams} loading={loading} />
    </Card>
  );
}
