import { useSearchParams } from "react-router-dom";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";
import { RequirePerm } from "@/components/require-perm";
import { SupportList } from "@/components/support/client-support";
import { ReportHistory } from "@/components/report-history";
import { ReviewInbox } from "@/components/review-inbox";
import { RankTracker } from "@/components/rank-tracker";

/** Screens that only need the client dropdown list (id + name). */
function useClientOptions(qs = "") {
  const r = usePageData(`/api/views/client-options${qs}`);
  return { ...r, clients: r.data?.clients };
}

export function SupportPage() {
  useTitle("Support");
  const { clients, error, loading } = useClientOptions();
  if (!clients) return <PageState loading={loading} error={error} />;
  return <SupportList clients={clients} />;
}

export function ReportsPage() {
  useTitle("Shared reports");
  const { clients, error, loading } = useClientOptions();
  if (!clients) return <PageState loading={loading} error={error} />;
  return (
    <RequirePerm perm="analytics.view">
      <ReportHistory clients={clients} />
    </RequirePerm>
  );
}

export function ReviewsPage() {
  useTitle("Review inbox");
  const [sp] = useSearchParams();
  const { clients, error, loading } = useClientOptions("?active=1");
  if (!clients) return <PageState loading={loading} error={error} />;
  return (
    <RequirePerm perm="gmb.view">
      <ReviewInbox clients={clients} initialClient={sp.get("client") || ""} initialStatus={sp.get("status") || "UNREPLIED"} />
    </RequirePerm>
  );
}

export function RankTrackerPage() {
  useTitle("Rank tracker");
  const [sp] = useSearchParams();
  const { clients, error, loading } = useClientOptions("?active=1&place=1");
  if (!clients) return <PageState loading={loading} error={error} />;
  return (
    <RequirePerm perm="gmb.view">
      <RankTracker clients={clients} initialClient={sp.get("client") || ""} initialKeywords={String(sp.get("keywords") || "").slice(0, 1200)} />
    </RequirePerm>
  );
}
