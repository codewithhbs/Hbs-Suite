import { Navigate, Outlet } from "react-router-dom";
import { usePageData } from "@/hooks/use-page-data";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { AdminShell } from "@/components/admin-shell";
import { ShellSkeleton } from "@/layouts/app-layout";
import { Alert } from "@/components/ui";

/** Super-admin console ((admin)/layout.js). */
export function AdminLayout() {
  const { data: s, error } = usePageData("/api/views/session");
  if (!s) return error ? <div className="p-6"><Alert>{error}</Alert></div> : <ShellSkeleton />;
  if (!s.isSuperAdmin) return <Navigate to={s.tenant ? "/dashboard" : "/login"} replace />;
  return (
    <WorkspaceProvider value={s}>
      <AdminShell session={s.session} platformName={s.platformName}>
        <Outlet />
      </AdminShell>
    </WorkspaceProvider>
  );
}
