import { Navigate, useSearchParams } from "react-router-dom";
import { SignupWizard } from "@/components/signup/signup-wizard";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function SignupPage() {
  useTitle("Create your workspace");
  const [sp] = useSearchParams();
  const qs = new URLSearchParams();
  for (const k of ["plan", "cycle", "g"]) if (sp.get(k)) qs.set(k, sp.get(k));
  const { data, error, loading } = usePageData(`/api/views/public/signup?${qs}`, { redirectOnAuth: false });
  if (!data) return <PageState loading={loading} error={error} />;
  if (data.closed) return <Navigate to="/login" replace />;
  return (
    <SignupWizard
      plans={data.plans}
      selected={data.selected}
      initialCycle={data.initialCycle}
      taxPercent={data.taxPercent}
      onlinePayments={data.onlinePayments}
      platformName={data.platformName}
      supportEmail={data.supportEmail}
      google={data.google}
    />
  );
}
