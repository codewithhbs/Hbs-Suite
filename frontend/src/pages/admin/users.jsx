import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { useListParams } from "@/hooks/use-list-params";
import { UserManager } from "@/components/admin/user-manager";

export default function AdminUsersPage() {
  useTitle("Users");
  const { params, set, query } = useListParams({ limit: "25" });
  const { data, error, loading } = usePageData(`/api/views/admin/users?${query}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Users</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Everyone with a login across the platform.</p>
      </div>
      {data ? (
        <UserManager users={data.users.items} meta={data.users} params={params} onParams={set} loading={loading} />
      ) : (
        <PageState loading={loading} error={error} />
      )}
    </div>
  );
}
