import { ListingHealth } from "@/components/listing-health";
import { useTitle } from "@/hooks/use-title";
import { RequirePerm } from "@/components/require-perm";

export default function ListingHealthPage() {
  useTitle("Listing health");
  return <RequirePerm perm="gmb.view"><ListingHealth /></RequirePerm>;
}
