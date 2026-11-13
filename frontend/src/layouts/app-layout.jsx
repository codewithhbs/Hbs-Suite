import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { usePageData } from "@/hooks/use-page-data";
import { WorkspaceProvider } from "@/hooks/use-workspace";
import { setTitleTemplate } from "@/hooks/use-title";
import { AppShell } from "@/components/app-shell";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { PushClient } from "@/components/pwa/push-client";
import { NoContextMenu } from "@/components/pwa/no-context-menu";
import { Skeleton, Alert } from "@/components/ui";

/** Workspace shell ((app)/layout.js): session, plan, maintenance gate. */
export function AppLayout() {
  const { data: s, error } = usePageData("/api/views/session");

  useEffect(() => {
    if (s?.brand?.name) setTitleTemplate(s.brand.name);
  }, [s?.brand?.name]);

  if (!s) {
    return error ? (
      <div className="p-6">
        <Alert>{error}</Alert>
      </div>
    ) : (
      <ShellSkeleton />
    );
  }
  if (!s.tenant && s.isSuperAdmin) {
    // super admin outside a workspace -> admin console
    window.location.replace("/admin");
    return null;
  }
  const m = s.maintenance;
  if (m.blocked) return <MaintenanceScreen title={m.title} message={m.message} eta={m.eta} platformName={m.platformName} supportEmail={m.supportEmail} />;

  return (
    <WorkspaceProvider value={s}>
      <AppShell
        session={s.session}
        aiProvider={s.aiProvider}
        gmbProvider={s.gmbProvider}
        workspace={s.tenant?.name}
        brand={s.brand}
        themeColor={s.tenant?.theme_color || null}
        plan={s.plan?.name}
        perms={s.perms}
        creditsLeft={s.ent?.wallet?.unlimited ? "Unlimited" : s.ent?.wallet?.balance}
        banner={
          <>
            {m.enabled ? <div className="bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white">Maintenance mode is ON - clients see the maintenance page.</div> : null}
            {s.impersonating ? <ImpersonationBanner admin={s.impersonating} tenantName={s.tenant?.name} /> : null}
          </>
        }
      >
        <Outlet />
        <PushClient />
        <NoContextMenu enabled={s.disableRightClick} />
      </AppShell>
    </WorkspaceProvider>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="hidden w-64 border-r border-zinc-200 bg-white p-4 md:block dark:border-zinc-800 dark:bg-zinc-900">
        <Skeleton className="h-9 w-40" />
        <div className="mt-6 space-y-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}
