import { useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Flex, Grid, Input, Popconfirm, Segmented, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import Timetable from '../../components/Timetable.jsx';
import { EmptyState, ErrorAlert, Loading, PageHeader } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { DAYS, TYPE_COLORS, isoDay } from '../../lib/schedule.js';

const ALL_WEEK = 0;

// Kompyuterda butun hafta, telefonda bugungi kun ochiladi
const initialDay = () => (window.matchMedia('(min-width: 768px)').matches ? ALL_WEEK : Math.min(isoDay(), 6));

export default function SchedulePage() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [sheet, setSheet] = useState('');
  const [day, setDay] = useState(initialDay);
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(`/admin/timetable?sheet=${encodeURIComponent(sheet)}`);

  const clearAll = async () => {
    try {
      const { deleted } = await api.del('/admin/lessons');
      message.success(`${deleted} ta dars o'chirildi`);
      reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  const lessons = data?.lessons ?? [];
  const hasSunday = lessons.some((l) => l.dayOfWeek === 7);
  const weekDays = DAYS.filter((d) => d.n <= 6 || hasSunday);
  const shownDays = day === ALL_WEEK ? weekDays.map((d) => d.n) : [day];

  return (
    <div>
      <PageHeader
        title="Umumiy jadval"
        subtitle={data?.sheet ? `${data.sheet} · ${data.groups.length} ta guruh · ${lessons.length} ta dars` : undefined}
        extra={
          <Popconfirm
            title="Butun dars jadvali o'chirilsinmi?"
            description="Bu amalni qaytarib bo'lmaydi."
            okText="O'chirish"
            okButtonProps={{ danger: true }}
            cancelText="Bekor qilish"
            onConfirm={clearAll}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!data?.sheet}>
              Tozalash
            </Button>
          </Popconfirm>
        }
      />

      <ErrorAlert error={error} onRetry={reload} style={{ marginBottom: 16 }} />

      {loading && !data ? (
        <Loading />
      ) : !data?.sheet ? (
        <EmptyState title="Jadval hali yuklanmagan">
          <Link to="/admin/import">Excel fayldan yuklash</Link>
        </EmptyState>
      ) : (
        <>
          {/* Kurslar — Excel varaqlari kabi */}
          <Tabs
            type="card"
            activeKey={data.sheet}
            onChange={setSheet}
            items={data.sheets.map((s) => ({ key: s, label: s }))}
            style={{ marginBottom: 4 }}
          />

          <Flex wrap gap={12} align="center" justify="space-between" style={{ marginBottom: 12 }}>
            <div className="scrollbar-none" style={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Segmented
                value={day}
                onChange={setDay}
                options={[{ n: ALL_WEEK, short: 'Hafta', name: 'Butun hafta' }, ...weekDays].map((d) => ({
                  value: d.n,
                  label: screens.sm ? d.name : d.short,
                }))}
              />
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="O'qituvchi, fan yoki xona"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: screens.lg ? 300 : '100%' }}
            />
          </Flex>

          <Flex wrap gap={4} align="center" style={{ marginBottom: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>
              Dars turi:
            </Typography.Text>
            {Object.entries(TYPE_COLORS).map(([name, color]) => (
              <Tag key={name} color={color}>
                {name}
              </Tag>
            ))}
          </Flex>

          <Timetable groups={data.groups} slots={data.slots} lessons={lessons} days={shownDays} query={q.trim()} />
        </>
      )}
    </div>
  );
}
