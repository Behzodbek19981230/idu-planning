import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WeekSchedule from '../../components/WeekSchedule.jsx';
import { ErrorBox, PageHeader, Spinner } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';

export default function TeacherSchedulePage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/admin/teachers/${id}/lessons`);

  return (
    <div>
      <Link to="/admin/teachers" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> O'qituvchilar
      </Link>
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        <>
          <PageHeader title={data.teacher.fullName} subtitle={`Login: ${data.teacher.username} · ${data.lessons.length} ta dars`} />
          <WeekSchedule lessons={data.lessons} />
        </>
      )}
    </div>
  );
}
