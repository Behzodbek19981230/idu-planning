import { Link } from 'react-router-dom';
import { Button, Card, Col, Row, Statistic, Table, Tag, Typography, theme } from 'antd';
import { BookOutlined, FileExcelOutlined, TeamOutlined, UploadOutlined } from '@ant-design/icons';
import { ErrorAlert, Loading, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { formatDateTime } from '../../lib/schedule.js';

function StatCard({ icon, title, value, to, footer }) {
  const { token } = theme.useToken();
  return (
    <Link to={to}>
      <Card hoverable>
        <Row align="middle" gutter={16} wrap={false}>
          <Col flex="none">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                color: token.colorPrimary,
                background: token.colorPrimaryBg,
              }}
            >
              {icon}
            </div>
          </Col>
          <Col flex="auto" style={{ minWidth: 0 }}>
            <Statistic title={title} value={value} />
            {footer && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                {footer}
              </Typography.Text>
            )}
          </Col>
        </Row>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const stats = useApi('/admin/stats');
  const uploads = useApi('/admin/uploads');

  if (stats.loading && !stats.data) return <Loading />;
  if (stats.error) return <ErrorAlert error={stats.error} onRetry={stats.reload} />;
  const { teachers, lessons, lastUpload } = stats.data;

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        extra={
          <Link to="/admin/import">
            <Button type="primary" icon={<UploadOutlined />}>
              Jadval yuklash
            </Button>
          </Link>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard icon={<TeamOutlined />} title="O'qituvchilar" value={teachers} to="/admin/teachers" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard icon={<BookOutlined />} title="Darslar" value={lessons} to="/admin/schedule" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            icon={<FileExcelOutlined />}
            title="Oxirgi yuklash"
            value={lastUpload ? lastUpload.rowsCount : '—'}
            footer={lastUpload ? formatDateTime(lastUpload.createdAt) : 'Hali yuklanmagan'}
            to="/admin/import"
          />
        </Col>
      </Row>

      <Card title="Yuklashlar tarixi" style={{ marginTop: 24 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="middle"
          loading={uploads.loading && !uploads.data}
          dataSource={uploads.data?.uploads ?? []}
          pagination={false}
          locale={{ emptyText: 'Hali hech qanday fayl yuklanmagan' }}
          scroll={{ x: true }}
          columns={[
            {
              title: 'Fayl',
              dataIndex: 'filename',
              render: (v, u) => (
                <>
                  <FileExcelOutlined style={{ color: '#16a34a', marginRight: 8 }} />
                  <Typography.Text strong>{v}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDateTime(u.createdAt)}
                  </Typography.Text>
                </>
              ),
            },
            { title: 'Darslar', dataIndex: 'rowsCount', width: 100 },
            {
              title: 'Rejim',
              dataIndex: 'mode',
              width: 130,
              responsive: ['sm'],
              render: (m) => (m === 'replace' ? <Tag color="blue">Almashtirildi</Tag> : <Tag color="green">Qo'shildi</Tag>),
            },
            { title: 'Kim yukladi', dataIndex: ['uploadedBy', 'fullName'], responsive: ['md'] },
          ]}
        />
      </Card>
    </div>
  );
}
