import { ClientUsageAdmin } from "@/components/admin/usage-admin";
import { useTitle } from "@/hooks/use-title";

export default function ClientUsagePage() {
  useTitle("Client usage");
  return <ClientUsageAdmin />;
}
