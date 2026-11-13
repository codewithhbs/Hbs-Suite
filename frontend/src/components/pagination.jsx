import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui";

function pageWindow(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [...new Set([1, total, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((p, i) => {
    if (i && p - nums[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

const navBtn =
  "flex h-8 min-w-8 items-center justify-center rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

/**
 * Server-side pagination bar for { total, page, limit, pages }.
 *   <Pagination meta={data.clients} onChange={set} />   // set({ page }) | set({ limit, page: 1 })
 */
export function Pagination({ meta, onChange, sizes = [10, 25, 50, 100], loading = false, className = "" }) {
  if (!meta || !Number(meta.total)) return null;
  const total = Number(meta.total);
  const limit = Number(meta.limit || 25);
  const pages = Math.max(1, Number(meta.pages || Math.ceil(total / limit)));
  const page = Math.min(Number(meta.page || 1), pages);
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const sizeList = sizes.includes(limit) ? sizes : [...sizes, limit].sort((a, b) => a - b);
  const go = (p) => p !== page && onChange({ page: p });
  return (
    <div className={`flex flex-col items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 sm:flex-row dark:border-zinc-800 ${className}`}>
      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {from.toLocaleString("en-IN")}-{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
        </span>
        <Select value={String(limit)} onChange={(e) => onChange({ limit: e.target.value, page: 1 })} className="!w-auto !py-1" aria-label="Rows per page">
          {sizeList.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </Select>
        {loading ? <span className="animate-pulse">Loading…</span> : null}
      </div>
      {pages > 1 ? (
        <div className="flex items-center gap-1">
          <button type="button" className={navBtn} disabled={page <= 1 || loading} onClick={() => go(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, pages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-xs text-zinc-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => go(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${navBtn} ${p === page ? "!border-brand-500 !bg-brand-500 !text-white hover:!bg-brand-600" : ""}`}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" className={navBtn} disabled={page >= pages || loading} onClick={() => go(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
