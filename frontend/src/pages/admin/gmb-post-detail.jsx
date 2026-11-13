import { useParams } from "react-router-dom";
import { TaskReview } from "@/components/task-review";
import { AdminPostToolbar } from "@/components/admin/admin-post-actions";
import { usePageData } from "@/hooks/use-page-data";
import { useTitle } from "@/hooks/use-title";
import { PageState } from "@/components/page-state";

export default function AdminGmbPostDetailPage() {
  const { id } = useParams();
  const { data, error, loading, notFound } = usePageData(`/api/views/admin/gmb-posts/${id}`);
  useTitle(data?.task?.title || "GMB post");
  if (!data) return <PageState loading={loading} error={error} notFound={notFound} />;
  const task = data.task;
  return (
    <TaskReview
      key={`${task.id}:${task.updated_at}`}
      task={task}
      backHref="/admin/gmb-posts"
      backLabel="Back to GMB postings"
      toolbar={<AdminPostToolbar taskId={task.id} status={task.status} tenantName={data.tenantName} />}
    />
  );
}
