import { lazy, Suspense } from "react";

/** next/dynamic -> React.lazy (+ optional loading component). */
export default function dynamic(loader, opts = {}) {
  const Lazy = lazy(() => loader().then((m) => ({ default: m?.default ?? m })));
  const Loading = opts.loading || (() => null);
  return function DynamicComponent(props) {
    return (
      <Suspense fallback={<Loading />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
