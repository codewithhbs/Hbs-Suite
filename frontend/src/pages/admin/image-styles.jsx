import { ImageStylesAdmin } from "@/components/admin/image-styles-admin";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function AdminImageStylesPage() {
  useTitle("Image styles");
  const { data, error, loading } = usePageData("/api/views/admin/image-styles");
  if (!data) return <PageState loading={loading} error={error} />;
  return <ImageStylesAdmin clients={data.clients} />;
}
