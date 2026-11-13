import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { RequirePerm } from "@/components/require-perm";
import { ReviewStudio } from "@/components/gmb/review-studio";
import { ProductFormPage } from "@/components/gmb/product-form-page";
import { ServiceFormPage } from "@/components/gmb/service-form-page";
import { CreateWebsitePage } from "@/components/gmb/website-create";
import { WebsiteEditor } from "@/components/gmb/website-editor/editor";

/** Loads the client header (name/category/city) every GMB sub-screen needs. */
function useBrief(id) {
  const r = usePageData(`/api/views/clients/${id}/brief`);
  return { ...r, c: r.data?.client };
}

export function ReviewQrPage() {
  useTitle("Review QR & poster");
  const { id } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return <ReviewStudio clientId={c.id} business={c.business_name} />;
}

export function ProductNewPage() {
  useTitle("Add product");
  const { id } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <ProductFormPage clientId={c.id} productId={null} business={c.business_name} />
    </RequirePerm>
  );
}

export function ProductEditPage() {
  useTitle("Edit product");
  const { id, pid } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!/^\d+$/.test(String(pid))) return <PageState notFound />;
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <ProductFormPage clientId={c.id} productId={pid} business={c.business_name} />
    </RequirePerm>
  );
}

export function ServiceNewPage() {
  useTitle("Add service");
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <ServiceFormPage clientId={c.id} index="new" presetCategory={sp.get("category") || null} business={c.business_name} />
    </RequirePerm>
  );
}

export function ServiceEditPage() {
  useTitle("Edit service");
  const { id, sid } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!/^\d+$/.test(String(sid))) return <PageState notFound />;
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <ServiceFormPage clientId={c.id} index={String(sid)} business={c.business_name} />
    </RequirePerm>
  );
}

export function WebsiteNewPage() {
  useTitle("Create website from Google");
  const { id } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <CreateWebsitePage clientId={c.id} business={c.business_name} subtitle={[c.business_category, c.city].filter(Boolean).join(" · ")} />
    </RequirePerm>
  );
}

export function WebsiteEditPage() {
  useTitle("Website editor");
  const { id, wid } = useParams();
  const { c, error, loading, notFound } = useBrief(id);
  if (!/^[a-f0-9]{24}$/.test(String(wid))) return <PageState notFound />;
  if (!c) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <RequirePerm perm="gmb.edit">
      <WebsiteEditor clientId={c.id} wid={wid} business={c.business_name} />
    </RequirePerm>
  );
}

/** Old embedded-builder URL -> native editor / website tab. */
export function WebsiteLegacyRedirect() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const site = sp.get("site");
  if (site && /^[a-f0-9]{24}$/.test(site)) return <Navigate to={`/gmb/${id}/website/${site}`} replace />;
  if (sp.get("new")) return <Navigate to={`/gmb/${id}/website/new`} replace />;
  return <Navigate to={`/gmb/${id}?tab=website`} replace />;
}
