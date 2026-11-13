import { NotificationsAdmin } from "@/components/admin/notifications-admin";
import { useTitle } from "@/hooks/use-title";

export default function NotificationsPage() {
  useTitle("Notifications");
  return <NotificationsAdmin />;
}
