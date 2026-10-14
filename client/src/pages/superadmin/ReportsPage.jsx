import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Empty, Flex, Input, Row, Segmented, Statistic, Table, Tag, Tooltip, Typography, theme } from 'antd';
import { EyeOutlined, LoginOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { ErrorAlert, Loading, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { ROLE_LABELS } from '../../lib/roles.js';
import { pageLabel } from '../../lib/activity.js';
import { formatDateTime } from '../../lib/schedule.js';

const { Text } = Typography;

const PERIODS = [
  { value: 1, label: 'Bugun' },
  { value: 7, label: '7 kun' },
  { value: 30, label: '30 kun' },
  { value: 90, label: '90 kun' },
];

function StatCard({ icon, title, value, color, footer }) {
  const { token } = theme.useToken();
  return (
    <Card>
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
              color: token[`${color}6`] ?? token.colorPrimary,
              background: token[`${color}1`] ?? token.colorPrimaryBg,
            }}
          >
            {icon}
          </div>
        </Col>
        <Col flex="auto" style={{ minWidth: 0 }}>
          <Statistic title={title} value={value} />
          {footer && (
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {footer}
            </Text>
          )}
        </Col>
      </Row>
    </Card>
  );
}

/** Kunlik kirishlar va sahifa ko'rishlar — oddiy ustunli diagramma */
function DailyChart({ daily }) {
  const { token } = theme.useToken();
  if (!daily.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu davrda faollik yo'q" />;
  const max = Math.max(1, ...daily.map((d) => d.pageViews + d.logins));
  return (
    <div style={{ overflowX: 'auto' }}>
      <Flex align="flex-end" gap={4} style={{ height: 180, minWidth: daily.length * 18, paddingTop: 8 }}>
        {daily.map((d) => (
          <Tooltip
            key={d.day}
            title={
              <>
                <div>{d.day}</div>
                <div>Kirishlar: {d.logins}</div>
                <div>Sahifa ko'rishlar: {d.pageViews}</div>
                <div>Xato kirishlar: {d.failed}</div>
                <div>Foydalanuvchilar: {d.users}</div>
              </>
            }
          >
            <Flex vertical justify="flex-end" style={{ flex: 1, minWidth: 12, height: '100%', cursor: 'default' }}>
              <div style={{ height: `${(d.pageViews / max) * 100}%`, background: token.colorPrimaryBorder, borderRadius: '4px 4px 0 0' }} />
              <div style={{ height: `${(d.logins / max) * 100}%`, background: token.colorPrimary, minHeight: d.logins ? 2 : 0 }} />
            </Flex>
          </Tooltip>
        ))}
      </Flex>
      <Flex justify="space-between" style={{ marginTop: 6 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{daily[0].day}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{daily[daily.length - 1].day}</Text>
      </Flex>
      <Flex gap={16} style={{ marginTop: 8, fontSize: 12 }}>
        <Flex align="center" gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: token.colorPrimary }} /> Kirishlar
        </Flex>
        <Flex align="center" gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: token.colorPrimaryBorder }} /> Sahifa ko'rishlar
        </Flex>
      </Flex>
    </div>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [search, setSearch] = useState('');
  const { data, error, loading, reload } = useApi(`/superadmin/reports?days=${days}`);

  const header = (
    <PageHeader
      title="Hisobotlar"
      subtitle="Kim tizimga kirgani va qaysi sahifalardan foydalangani"
      extra={<Segmented options={PERIODS} value={days} onChange={setDays} />}
    />
  );

  if (loading && !data) return <>{header}<Loading /></>;
  if (error) return <>{header}<ErrorAlert error={error} onRetry={reload} /></>;
  const { summary, daily, topPages, users } = data;

  const q = search.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter((u) => u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    : users;

  return (
    <div>
      {header}

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <StatCard icon={<LoginOutlined />} title="Kirishlar" value={summary.logins} color="green" />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard
            icon={<TeamOutlined />}
            title="Faol foydalanuvchilar"
            value={summary.activeUsers}
            footer={`Jami ${summary.totalUsers} ta`}
          />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard icon={<EyeOutlined />} title="Sahifa ko'rishlar" value={summary.pageViews} color="purple" />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard icon={<WarningOutlined />} title="Xato kirishlar" value={summary.failed} color="red" />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Kunlik faollik" style={{ height: '100%' }}>
            <DailyChart daily={daily} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Eng ko'p ochilgan sahifalar" style={{ height: '100%' }} styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="path"
              size="small"
              dataSource={topPages}
              pagination={false}
              locale={{ emptyText: "Hali ma'lumot yo'q" }}
              columns={[
                {
                  title: 'Sahifa',
                  dataIndex: 'path',
                  render: (p) => (
                    <>
                      <Text strong>{pageLabel(p) ?? p}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{p}</Text>
                    </>
                  ),
                },
                { title: "Ko'rishlar", dataIndex: 'views', width: 100, align: 'right' },
                { title: 'Kishi', dataIndex: 'users', width: 70, align: 'right' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Foydalanuvchilar faolligi"
        style={{ marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
        extra={<Input.Search allowClear placeholder="Qidirish" onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />}
      >
        <Table
          rowKey="id"
          size="middle"
          dataSource={filteredUsers}
          pagination={{ pageSize: 20, hideOnSinglePage: true, showSizeChanger: false }}
          scroll={{ x: true }}
          columns={[
            {
              title: 'Foydalanuvchi',
              dataIndex: 'fullName',
              render: (v, u) => (
                <>
                  <Link to={`/superadmin/logs?userId=${u.id}`}>
                    <Text strong>{v}</Text>
                  </Link>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{u.username}</Text>
                </>
              ),
            },
            {
              title: 'Lavozim',
              dataIndex: 'role',
              responsive: ['md'],
              render: (r, u) => (
                <>
                  <Tag>{ROLE_LABELS[r]}</Tag>
                  {!u.isActive && <Tag color="red">Bloklangan</Tag>}
                </>
              ),
            },
            { title: 'Kirishlar', dataIndex: 'logins', width: 100, align: 'right', sorter: (a, b) => a.logins - b.logins },
            {
              title: "Sahifalar",
              dataIndex: 'pageViews',
              width: 100,
              align: 'right',
              responsive: ['sm'],
              sorter: (a, b) => a.pageViews - b.pageViews,
            },
            {
              title: 'Xato',
              dataIndex: 'failed',
              width: 80,
              align: 'right',
              responsive: ['md'],
              render: (n) => (n ? <Text type="danger">{n}</Text> : 0),
            },
            {
              title: 'Oxirgi faollik',
              dataIndex: 'lastSeen',
              width: 180,
              render: (v) => (v ? formatDateTime(v) : <Text type="secondary">Faollik yo'q</Text>),
            },
          ]}
        />
      </Card>
    </div>
  );
}
