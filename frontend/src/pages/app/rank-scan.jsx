import { RankScanView } from "@/components/rank-tracker";
import { useParams } from "react-router-dom";
import { useTitle } from "@/hooks/use-title";
import { RequirePerm } from "@/components/require-perm";

export default function RankScanPage() {
  useTitle("Rank scan");
  const { id } = useParams();
  return <RequirePerm perm="gmb.view"><RankScanView id={Number(id)} /></RequirePerm>;
}
