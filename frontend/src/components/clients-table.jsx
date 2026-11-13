import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyX, UserCheck } from "lucide-react";
import { SearchInput } from "@/components/search-input";
import { Pagination } from "@/components/pagination";
import { Card, CardHeader, Table, EmptyRow, Badge, Select, Button, Modal, Alert } from "@/components/ui";
import { apiFetch } from "@/lib/hooks/use-api";

const CONN = {
  GOOGLE: ["emerald", "Google"],
  PENDING: ["amber", "Pick listing"],
  NONE: ["slate", "Not connected"],
};

/**
 * Server-paginated client table. Filters live in the URL
 * (?q=&status=&category=&conn=&assigned=&page=&limit=).
 *   clients = { items, total, page, limit, pages }
 */
export function ClientsTable({
  clients,
  categories = [],
  employees = [],
  all,
  limit,
  canAssign = false,
  canDedupe = false,
  onlyAssigned = false,
  params = {},
  onParams,
  loading = false,
}) {
  const router = useRouter();
  const rows = clients.items || [];
  const [selected, setSelected] = useState(() => new Set());
  const [assignTo, setAssignTo] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [dupes, setDupes] = useState(null); // preview from /api/clients/duplicates

  const allOnPage = rows.length > 0 && rows.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected((s) => (allOnPage ? new Set([...s].filter((id) => !rows.some((c) => c.id === id))) : new Set([...s, ...rows.map((c) => c.id)])));
  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  async function assign() {
    if (!selected.size) return;
    setBusy("assign");
    setMsg(null);
    try {
      const r = await apiFetch("/api/clients/assign", { body: { client_ids: [...selected], employee_id: assignTo === "none" ? null : Number(assignTo) } });
      setMsg({ tone: "green", text: `${r.updated} client(s) ${assignTo === "none" ? "unassigned" : `assigned to ${employees.find((e) => String(e.id) === assignTo)?.name || "member"}`}.` });
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setMsg({ tone: "red", text: e.message });
    } finally {
      setBusy("");
    }
  }

  async function previewDupes() {
    setBusy("dupes");
    setMsg(null);
    try {
      setDupes(await apiFetch("/api/clients/duplicates"));
    } catch (e) {
      setMsg({ tone: "red", text: e.message });
    } finally {
      setBusy("");
    }
  }

  async function removeDupes() {
    setBusy("remove");
    try {
      const r = await apiFetch("/api/clients/duplicates", { body: { confirm: true } });
      setDupes(null);
      setMsg({ tone: "green", text: `${r.removed} duplicate client(s) removed${r.unlinked ? `, ${r.unlinked} unlinked from a listing another client already uses` : ""}.` });
      router.refresh();
    } catch (e) {
      setMsg({ tone: "red", text: e.message });
    } finally {
      setBusy("");
    }
  }

  const cols = canAssign ? ["", "Business", "Category", "City", "Services", "Keywords", "Posts", "Assigned to", "GMB", "Status", ""] : ["Business", "Category", "City", "Services", "Keywords", "Posts", "Assigned to", "GMB", "Status", ""];

  return (
    <Card>
      <CardHeader
        title={`${clients.total} of ${all ?? clients.total} clients`}
        subtitle={onlyAssigned ? "Showing only the clients assigned to you" : `Plan limit: ${Number(limit) < 0 ? "unlimited" : limit}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={params.q || ""} onSearch={(q) => onParams({ q })} className="!w-40 !py-1.5" />
            <Select value={params.category || ""} onChange={(e) => onParams({ category: e.target.value })} className="!w-40">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={params.conn || ""} onChange={(e) => onParams({ conn: e.target.value })} className="!w-40">
              <option value="">All connections</option>
              <option value="google">Google connected</option>
              <option value="pending">Signed in, listing not picked</option>
              <option value="none">Not connected</option>
            </Select>
            {canAssign ? (
              <Select value={params.assigned || ""} onChange={(e) => onParams({ assigned: e.target.value })} className="!w-40">
                <option value="">Everyone</option>
                <option value="none">Unassigned</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            ) : null}
            <Select value={params.status || ""} onChange={(e) => onParams({ status: e.target.value })} className="!w-32">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            {canDedupe ? (
              <Button variant="secondary" className="!py-1.5" disabled={busy === "dupes"} onClick={previewDupes}>
                <CopyX className="h-3.5 w-3.5" /> {busy === "dupes" ? "Checking..." : "Find duplicates"}
              </Button>
            ) : null}
          </div>
        }
      />

      {msg ? <Alert tone={msg.tone} className="mx-4 mt-3">{msg.text}</Alert> : null}

      {canAssign && selected.size ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-brand-50/40 px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-brand-500/5">
          <UserCheck className="h-4 w-4 text-brand-500" />
          <span className="font-medium">{selected.size} selected</span>
          <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="!w-52 !py-1.5">
            <option value="">Assign to team member...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            <option value="none">Nobody (unassign)</option>
          </Select>
          <Button className="!py-1.5" disabled={!assignTo || busy === "assign"} onClick={assign}>
            {busy === "assign" ? "Saving..." : "Apply"}
          </Button>
          <button type="button" className="text-xs text-zinc-500 hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      ) : null}

      <Table head={cols.map((h, i) => (canAssign && i === 0 ? <input key="all" type="checkbox" aria-label="Select page" checked={allOnPage} onChange={toggleAll} className="accent-brand-500" /> : h))}
        empty={!rows.length ? <EmptyRow colSpan={cols.length}>{onlyAssigned && !params.q ? "No clients are assigned to you yet. Ask the workspace owner to assign some." : "No clients match this filter."}</EmptyRow> : null}>
        {rows.map((c) => {
          const [tone, label] = CONN[c.conn_state] || CONN.NONE;
          return (
            <tr key={c.id} className={c.active ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/60" : "bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}>
              {canAssign ? (
                <td className="px-4 py-2">
                  <input type="checkbox" aria-label={`Select ${c.business_name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-brand-500" />
                </td>
              ) : null}
              <td className="px-4 py-2 font-medium text-zinc-800 dark:text-zinc-100">{c.business_name}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.business_category}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.city}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.service_count}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.keyword_count}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.post_count}</td>
              <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{c.employee_name || "-"}</td>
              <td className="px-4 py-2"><Badge tone={tone}>{label}</Badge></td>
              <td className="px-4 py-2">{c.active ? <Badge tone="emerald">Active</Badge> : <Badge tone="red">Inactive</Badge>}</td>
              <td className="px-4 py-2 text-right">
                <Link href={`/clients/${c.id}`} className="text-xs font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300">
                  {c.conn_state === "GOOGLE" ? "Open" : "Open / connect"}
                </Link>
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination meta={clients} onChange={onParams} loading={loading} />

      <Modal
        open={Boolean(dupes)}
        title="Duplicate clients"
        onClose={() => setDupes(null)}
        footer={
          dupes?.count ? (
            <>
              <Button variant="secondary" onClick={() => setDupes(null)}>Cancel</Button>
              <Button disabled={busy === "remove"} onClick={removeDupes}>{busy === "remove" ? "Cleaning..." : `Clean ${dupes.count} duplicate(s)`}</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setDupes(null)}>Close</Button>
          )
        }
      >
        {dupes?.count ? (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-600 dark:text-zinc-300">
              Empty copies (no posts, tasks or calendar slots) are deleted. If several clients point to the same Google listing, the one with most work is kept and the others are unlinked - their posts and history stay.
            </p>
            <ul className="max-h-72 space-y-1.5 overflow-y-auto">
              {dupes.groups.map((g) => (
                <li key={g.keep.join("-")} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                  <span className="font-medium">{g.business_name}</span>
                  {g.city ? <span className="text-zinc-500">, {g.city}</span> : null}
                  <span className="text-zinc-500">
                    {" "}· {g.total} copies{g.type === "same_listing" ? " on one Google listing" : ""} → keep #{g.keep.join(", #")}
                    {g.remove.length ? `, delete ${g.remove.length}` : ""}
                    {g.unlink.length ? `, unlink ${g.unlink.length} (have posts, kept)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">No duplicate clients found.</p>
        )}
      </Modal>
    </Card>
  );
}