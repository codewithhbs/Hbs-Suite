import { Navigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/use-workspace";

/** Client-side mirror of requirePagePermission() (the API enforces it too). */
export function RequirePerm({ perm, children }) {
  const { can } = useWorkspace();
  if (perm && !can(perm)) return <Navigate to={`/dashboard?denied=${encodeURIComponent(perm)}`} replace />;
  return children;
}
