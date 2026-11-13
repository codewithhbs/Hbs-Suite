import { PromptsAdmin } from "@/components/admin/prompts-admin";
import { useTitle } from "@/hooks/use-title";

export default function PromptsPage() {
  useTitle("AI prompts");
  return <PromptsAdmin />;
}
