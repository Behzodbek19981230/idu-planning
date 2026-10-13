import WeekSchedule from '../../components/WeekSchedule.jsx';
import { ErrorBox, PageHeader, Spinner } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';

export default function WeekPage() {
  const { data, error, loading, reload } = useApi('/me/lessons');

  return (
    <div>
      <PageHeader
        title="Haftalik jadval"
        subtitle={data ? `Jami ${data.lessons.length} ta dars` : undefined}
      />
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : <WeekSchedule lessons={data.lessons} />}
    </div>
  );
}
