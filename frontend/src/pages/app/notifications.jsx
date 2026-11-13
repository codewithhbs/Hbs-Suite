import { NotificationCenter } from "@/components/notification-center";
import { useTitle } from "@/hooks/use-title";

export default function NotificationsPage() {
  useTitle("Notifications");
  return <NotificationCenter />;
}
