import { IntegrationsAdmin } from "@/components/admin/integrations-admin";
import { useTitle } from "@/hooks/use-title";

export default function IntegrationsPage() {
  useTitle("Integrations");
  return <IntegrationsAdmin />;
}
