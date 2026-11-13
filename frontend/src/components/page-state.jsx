import { Link } from "react-router-dom";
import { Alert, Skeleton } from "@/components/ui";

/** First-load skeleton / error / 404 for a screen. */
export function PageState({ loading, error, notFound, rows = 4 }) {
  if (notFound) return <NotFoundBlock />;
  if (error && !loading) return <Alert>{error}</Alert>;
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function NotFoundBlock() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-black text-zinc-200 dark:text-zinc-800">404</p>
      <p className="mt-3 text-sm text-zinc-500">This page could not be found.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand-500">
        Go home
      </Link>
    </div>
  );
}
