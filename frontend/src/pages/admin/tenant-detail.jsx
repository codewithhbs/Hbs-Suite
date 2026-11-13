import { useParams } from "react-router-dom";
import Link from "@/shims/next-link";
import { ArrowLeft } from "lucide-react";
import { TenantDetail } from "@/components/admin/tenant-detail";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function AdminTenantPage() {
  const { id } = useParams();
  const { data, error, loading, notFound } = usePageData(`/api/views/admin/tenants/${id}`);
  useTitle(data?.tenant?.name || "Tenant");
  if (!data) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <div className="space-y-5">
      <Link href="/admin/tenants" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800">
        <ArrowLeft className="h-3 w-3" /> All tenants
      </Link>
      <TenantDetail key={`${data.tenant.id}:${data.tenant.updated_at || ""}`} tenant={data.tenant} ent={data.ent} plans={data.plans} />
    </div>
  );
}
