import { TeamManager } from "@/components/team-manager";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function TeamPage() {
  useTitle("Team");
  const { data, error, loading } = usePageData("/api/views/team");
  if (!data) return <PageState loading={loading} error={error} />;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Team</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Owners have full access. For every team member you choose exactly what they can open - by default everything except billing and workspace settings.
        </p>
      </div>
      <TeamManager users={data.users} canInvite={data.canInvite} canEdit={data.canEdit} isOwner={data.isOwner} limit={data.limit} used={data.used} />
    </div>
  );
}
