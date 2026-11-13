import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, Table, EmptyRow, Badge, Button, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export function InvoiceList({ meta, params = {}, onParams, loading = false, invoices, totals: serverTotals }) {
  const router = useRouter();
  const status = params.status || "";
  const setStatus = (v) => onParams({ status: v });
  const q = params.q || "";
  const setQ = (v) => onParams({ q: v });
  const [busy, setBusy] = useState(0);

  const rows = invoices;
  const totals = { paid: Number(serverTotals?.paid || 0), due: Number(serverTotals?.due || 0) };

  async function act(id, action) {
    setBusy(id);
    await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(0);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title={`${meta?.total ?? rows.length} invoices`}
        subtitle={`₹${totals.paid.toLocaleString("en-IN")} collected · ₹${totals.due.toLocaleString("en-IN")} outstanding`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput placeholder="Search invoice/tenant..." value={q} onSearch={setQ} className="!w-48 !py-1.5" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-36">
              <option value="">All statuses</option>
              <option value="DUE">Due</option>
              <option value="PAID">Paid</option>
              <option value="VOID">Void</option>
            </Select>
          </div>
        }
      />
      <Table head={["Invoice", "Tenant", "Type", "Subtotal", "Discount", "Tax", "Total", "Status", "Date", ""]}
        empty={!rows.length ? <EmptyRow colSpan={10}>No invoices.</EmptyRow> : null}>
        {rows.map((i) => (
          <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
            <td className="px-4 py-2 font-mono text-xs">{i.invoice_no}</td>
            <td className="px-4 py-2 text-zinc-800 dark:text-zinc-100">{i.tenant_name}</td>
            <td className="px-4 py-2 text-xs text-zinc-500">{i.type}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">₹{i.subtotal}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{Number(i.discount) ? `-₹${i.discount}` : "-"}</td>
            <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">₹{i.tax}</td>
            <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-100">₹{i.total}</td>
            <td className="px-4 py-2">
              <Badge tone={i.status === "PAID" ? "emerald" : i.status === "DUE" ? "amber" : "slate"}>{i.status}</Badge>
            </td>
            <td className="px-4 py-2 text-xs text-zinc-500">{formatDate(i.created_at)}</td>
            <td className="px-4 py-2 text-right">
              {i.status === "DUE" ? (
                <div className="flex justify-end gap-1">
                  <Button variant="success" className="!py-1 text-xs" disabled={busy === i.id} onClick={() => act(i.id, "mark-paid")}>
                    Mark paid
                  </Button>
                  <Button variant="ghost" className="!py-1 text-xs" onClick={() => act(i.id, "void")}>Void</Button>
                </div>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
<Pagination meta={meta} onChange={onParams} loading={loading} />
    </Card>
  );
}
