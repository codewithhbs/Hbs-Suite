import { WebSettingsAdmin } from "@/components/admin/web-settings-admin";
import { useTitle } from "@/hooks/use-title";

export default function WebSettingsPage() {
  useTitle("Web settings");
  return <WebSettingsAdmin />;
}
