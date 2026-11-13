import { HealthAdmin } from "@/components/admin/health-admin";
import { useTitle } from "@/hooks/use-title";

export default function HealthPage() {
  useTitle("System health");
  return <HealthAdmin />;
}
