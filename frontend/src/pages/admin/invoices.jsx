import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { InvoiceList } from "@/components/admin/invoice-list";

export default function AdminInvoicesPage() {
  useTitle("Invoices");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/admin/invoices?${query}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invoices</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Marking an invoice paid activates the subscription. Credit-pack invoices release credits on payment.</p>
      </div>
      {data ? (
        <InvoiceList invoices={data.invoices.items} meta={data.invoices} totals={data.totals} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
