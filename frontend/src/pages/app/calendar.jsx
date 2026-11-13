import { useCallback, useState } from "react";
import { CalendarBoard } from "@/components/calendar-board";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** previous month start .. next month end, around the visible month */
const windowFor = (cursor) => ({
  from: iso(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)),
  to: iso(new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0)),
});

export default function CalendarPage() {
  useTitle("Content calendar");
  const [win, setWin] = useState(() => windowFor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const { data, error, loading } = usePageData(`/api/views/calendar?from=${win.from}&to=${win.to}`);
  const onMonthChange = useCallback((cursor) => {
    const next = windowFor(cursor);
    setWin((w) => (w.from === next.from && w.to === next.to ? w : next));
  }, []);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Content calendar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Plan, schedule and manage your GMB posts with ease.</p>
      </div>
      {data ? <CalendarBoard entries={data.entries} clients={data.clients} onMonthChange={onMonthChange} canGenerate={data.canGenerate !== false} /> : <PageState loading={loading} error={error} />}
    </div>
  );
}
