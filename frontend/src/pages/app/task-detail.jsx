import { useParams } from "react-router-dom";
import { TaskReview } from "@/components/task-review";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function TaskDetailPage() {
  const { id } = useParams();
  const { data, error, loading, notFound } = usePageData(`/api/views/tasks/${id}`);
  useTitle(data?.task?.title || "Task");
  if (!data) return <PageState loading={loading} error={error} notFound={notFound} />;
  return <TaskReview key={data.task.id + ":" + data.task.updated_at} task={data.task} perms={data.perms} />;
}
