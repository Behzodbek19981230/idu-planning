import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card, DatePicker, Flex, Input, Select, Table, Tag, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ErrorAlert, PageHeader } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { ROLE_LABELS } from '../../lib/roles.js';
import { ACTIONS, deviceLabel, pageLabel } from '../../lib/activity.js';
import { formatDateTime } from '../../lib/schedule.js';

const { Text } = Typography;
const PAGE_SIZE = 50;

export default function LogsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  // Tozalashda sana tanlagichni qayta yaratish uchun
  const [resetKey, setResetKey] = useState(0);
  const users = useApi('/superadmin/users');

  const page = Number(params.get('page')) || 1;
  const query = new URLSearchParams(params);
  query.set('pageSize', PAGE_SIZE);
  const { data, error, loading, reload } = useApi(`/superadmin/logs?${query}`);

  /** Filtrni o'zgartirish — sahifa 1 ga qaytadi */
  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Qidiruv maydoni yozib bo'lingandan keyin qo'llanadi
  useEffect(() => {
    if (search === (params.get('q') ?? '')) return;
    const t = setTimeout(() => setFilter({ q: search.trim() }), 400);
    return () => clearTimeout(t);
  });

  const hasFilters = ['q', 'userId', 'action', 'from', 'to'].some((k) => params.get(k));

  return (
    <div>
      <PageHeader
        title="Loglar"
        subtitle={data ? `Jami ${data.total} ta yozuv` : 'Kirishlar va ochilgan sahifalar'}
        extra={
          <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
            Yangilash
          </Button>
        }
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Flex wrap gap={8} style={{ padding: 12 }}>
          <Input.Search
            allowClear
            placeholder="Login, ism, sahifa yoki IP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(v) => setFilter({ q: v.trim() })}
            style={{ width: 240 }}
          />
          <Select
            allowClear
            showSearch
            placeholder="Foydalanuvchi"
            loading={users.loading}
            value={params.get('userId') ? Number(params.get('userId')) : undefined}
            onChange={(v) => setFilter({ userId: v })}
            optionFilterProp="label"
            options={(users.data?.users ?? []).map((u) => ({ value: u.id, label: `${u.fullName} (${u.username})` }))}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Harakat"
            value={params.get('action') ?? undefined}
            onChange={(v) => setFilter({ action: v })}
            options={Object.entries(ACTIONS).map(([value, a]) => ({ value, label: a.label }))}
            style={{ width: 160 }}
          />
          <DatePicker.RangePicker
            key={resetKey}
            placeholder={['Boshlanish', 'Tugash']}
            onChange={(r) =>
              setFilter({
                from: r?.[0]?.startOf('day').toISOString(),
                to: r?.[1]?.endOf('day').toISOString(),
              })
            }
          />
          {hasFilters && (
            <Button
              type="link"
              onClick={() => {
                setSearch('');
                setResetKey((k) => k + 1);
                setParams({}, { replace: true });
              }}
            >
              Tozalash
            </Button>
          )}
        </Flex>

        {error && <ErrorAlert error={error} onRetry={reload} style={{ margin: 12 }} />}

        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          dataSource={data?.items ?? []}
          scroll={{ x: true }}
          locale={{ emptyText: 'Yozuvlar topilmadi' }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            showSizeChanger: false,
            hideOnSinglePage: true,
            onChange: (p) => setFilter({ page: p > 1 ? String(p) : null }),
          }}
          columns={[
            {
              title: 'Vaqt',
              dataIndex: 'createdAt',
              width: 170,
              render: (v) => <Text style={{ whiteSpace: 'nowrap' }}>{formatDateTime(v)}</Text>,
            },
            {
              title: 'Foydalanuvchi',
              dataIndex: 'username',
              render: (v, l) => (
                <>
                  <Text strong>{l.user?.fullName ?? v}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {v}
                    {l.user && ` · ${ROLE_LABELS[l.user.role]}`}
                    {!l.user && l.action === 'LOGIN_FAILED' && ' · mavjud emas'}
                  </Text>
                </>
              ),
            },
            {
              title: 'Harakat',
              dataIndex: 'action',
              width: 140,
              render: (a) => <Tag color={ACTIONS[a]?.color}>{ACTIONS[a]?.label ?? a}</Tag>,
            },
            {
              title: 'Sahifa',
              dataIndex: 'path',
              render: (p) =>
                p ? (
                  <>
                    <Text>{pageLabel(p) ?? p}</Text>
                    {pageLabel(p) && (
                      <>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{p}</Text>
                      </>
                    )}
                  </>
                ) : (
                  <Text type="secondary">—</Text>
                ),
            },
            {
              title: 'Qurilma',
              dataIndex: 'userAgent',
              responsive: ['lg'],
              render: (ua, l) => (
                <Tooltip title={ua}>
                  <Text>{deviceLabel(ua) || '—'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{l.ip}</Text>
                </Tooltip>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
