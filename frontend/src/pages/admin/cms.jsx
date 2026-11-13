import { CmsAdmin } from "@/components/admin/cms-admin";
import { useTitle } from "@/hooks/use-title";

export default function CmsPage() {
  useTitle("CMS pages");
  return <CmsAdmin />;
}
