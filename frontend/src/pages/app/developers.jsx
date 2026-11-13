import { ApiKeysManager } from "@/components/api-keys-manager";
import { useTitle } from "@/hooks/use-title";
import { RequirePerm } from "@/components/require-perm";

export default function DevelopersPage() {
  useTitle("API & developers");
  return <RequirePerm perm="apikey.manage"><ApiKeysManager /></RequirePerm>;
}
