import { useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { usePageData } from "@/hooks/use-page-data";
import { PageState } from "@/components/page-state";
import { setTitle } from "@/hooks/use-title";

/** Published CMS page (terms / privacy / disclaimer / custom). Markdown is rendered server-side. */
export function CmsPage({ slug }) {
  const { data, error, loading, notFound } = usePageData(`/api/views/public/cms/${encodeURIComponent(slug)}`);
  const p = data?.page;
  useEffect(() => {
    if (p) setTitle(p.seo_title || p.title);
  }, [p]);
  if (!p) return <PageState loading={loading} error={error} notFound={notFound} />;
  return (
    <article className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{p.title}</h1>
      <p className="mt-2 text-xs text-zinc-400">Last updated {formatDate(p.updated_at)}</p>
      <div className="cms-content mt-8" dangerouslySetInnerHTML={{ __html: p.html }} />
    </article>
  );
}
