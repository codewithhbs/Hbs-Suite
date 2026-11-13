import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { ReviewFlowApp } from "@/components/review-flow-app";
import { usePageData } from "@/hooks/use-page-data";
import { PageState } from "@/components/page-state";

/** Public page behind the review QR code (no login). */
export default function ReviewFlowPage() {
  const { slug } = useParams();
  const { data, error, loading, notFound } = usePageData(`/api/views/public/review/${encodeURIComponent(slug)}`, { redirectOnAuth: false });
  const f = data?.flow;
  useEffect(() => {
    if (f) document.title = `Review ${f.business}`;
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, [f]);
  if (!f) return <div className="p-6"><PageState loading={loading} error={error} notFound={notFound} /></div>;
  return (
    <ReviewFlowApp slug={f.slug} business={f.business} category={f.category} city={f.city} logo={f.logo} color={f.color} mode={f.mode} steps={f.steps} threshold={f.threshold} reviewUrl={f.reviewUrl} />
  );
}
