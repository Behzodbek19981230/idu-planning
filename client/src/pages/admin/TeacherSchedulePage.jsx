import { Link, useParams } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import WeekSchedule from '../../components/WeekSchedule.jsx';
import { ErrorAlert, Loading, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';

export default function TeacherSchedulePage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/admin/teachers/${id}/lessons`);

  return (
    <div>
      <Link to="/admin/teachers">
        <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0, marginBottom: 8 }}>
          O'qituvchilar
        </Button>
      </Link>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorAlert error={error} onRetry={reload} />
      ) : (
        <>
          <PageHeader
            title={data.teacher.fullName}
            subtitle={[data.teacher.position, `Login: ${data.teacher.username}`, `${data.lessons.length} ta dars`].filter(Boolean).join(' · ')}
          />
          <WeekSchedule lessons={data.lessons} />
        </>
      )}
    </div>
  );
}
