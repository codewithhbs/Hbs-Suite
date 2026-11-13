import { SupportAdminList } from "@/components/admin/support-admin";
import { useTitle } from "@/hooks/use-title";

export default function SupportPage() {
  useTitle("Support tickets");
  return <SupportAdminList />;
}
