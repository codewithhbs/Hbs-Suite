import { TicketView } from "@/components/support/client-support";
import { useParams } from "react-router-dom";
import { useTitle } from "@/hooks/use-title";

export default function SupportTicketPage() {
  useTitle("Support ticket");
  const { id } = useParams();
  return <TicketView id={Number(id)} />;
}
