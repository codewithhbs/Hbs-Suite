import { SupportAdminTicket } from "@/components/admin/support-admin";
import { useParams } from "react-router-dom";
import { useTitle } from "@/hooks/use-title";

export default function SupportTicketPage() {
  useTitle("Ticket");
  const { id } = useParams();
  return <SupportAdminTicket id={Number(id)} />;
}
