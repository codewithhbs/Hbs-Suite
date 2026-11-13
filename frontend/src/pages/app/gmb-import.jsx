import { GmbBulkImport } from "@/components/gmb/bulk-import";
import { useSearchParams } from "react-router-dom";
import { useTitle } from "@/hooks/use-title";
import { RequirePerm } from "@/components/require-perm";

export default function GmbImportPage() {
  useTitle("Import Google listings");
  const [sp] = useSearchParams();
  return <RequirePerm perm="gmb.connect"><GmbBulkImport initialConnection={sp.get("connection") ? Number(sp.get("connection")) : null} /></RequirePerm>;
}
