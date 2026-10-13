import { useEffect, useMemo, useState } from 'react';
import { Alert, Col, Flex, Row, Segmented, Tag, Typography, theme } from 'antd';
import LessonCard from '../../components/LessonCard.jsx';
import { EmptyState, ErrorAlert, Loading } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  DAYS,
  WEEK_LABEL,
  currentWeekParity,
  formatDate,
  formatDuration,
  isoDay,
  lessonStatus,
  minutesUntil,
  occursThisWeek,
} from '../../lib/schedule.js';

/** Har 30 soniyada yangilanadigan joriy vaqt */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function TodayPage() {
  const { user } = useAuth();
  const { token } = theme.useToken();
  const { data, error, loading, reload } = useApi('/me/lessons');
  const now = useNow();
  const today = isoDay(now);
  const [day, setDay] = useState(today);
  const parity = currentWeekParity(now);

  const lessons = useMemo(() => data?.lessons ?? [], [data]);
  const countByDay = useMemo(() => {
    const c = {};
    for (const l of lessons) if (occursThisWeek(l, parity)) c[l.dayOfWeek] = (c[l.dayOfWeek] || 0) + 1;
    return c;
  }, [lessons, parity]);

  const dayLessons = lessons.filter((l) => l.dayOfWeek === day);
  const isToday = day === today;

  // Bugun uchun holatlar: o'tgan / hozir / keyingi
  const activeToday = isToday ? dayLessons.filter((l) => occursThisWeek(l, parity)) : [];
  const nextLesson = activeToday.find((l) => lessonStatus(l, now) === 'upcoming');
  const current = activeToday.find((l) => lessonStatus(l, now) === 'now');

  const statusOf = (l) => {
    if (!isToday || !occursThisWeek(l, parity)) return undefined;
    const s = lessonStatus(l, now);
    if (s === 'upcoming' && l === nextLesson) return 'next';
    return s === 'upcoming' ? undefined : s;
  };

  const noteOf = (l) => {
    if (l === current) return `Tugashiga ${formatDuration(minutesUntil(l.endTime, now))} qoldi`;
    if (l === nextLesson) return `Boshlanishiga ${formatDuration(minutesUntil(l.startTime, now))} qoldi`;
    return undefined;
  };

  const days = DAYS.filter((d) => d.n <= 6 || countByDay[d.n]);
  const firstName = user.fullName.split(' ')[1] || user.fullName;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Flex wrap align="center" gap={8}>
          <Typography.Text type="secondary">
            {DAYS[today - 1].name}, {formatDate(now)}
          </Typography.Text>
          {parity && <Tag color="purple">{WEEK_LABEL[parity]}</Tag>}
        </Flex>
        <Typography.Title level={3} style={{ margin: '2px 0 0' }}>
          Assalomu alaykum, {firstName}!
        </Typography.Title>
      </div>

      {/* Kunlar tanlovi */}
      <div className="scrollbar-none" style={{ overflowX: 'auto', margin: '0 -16px 20px', padding: '0 16px' }}>
        <Segmented
          block
          size="large"
          value={day}
          onChange={setDay}
          style={{ minWidth: days.length * 56 }}
          options={days.map((d) => ({
            value: d.n,
            label: (
              <Flex vertical align="center" style={{ padding: '4px 0', lineHeight: 1.2 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{d.short}</span>
                <span style={{ fontWeight: 700, fontSize: 17 }}>{countByDay[d.n] || 0}</span>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    marginTop: 2,
                    borderRadius: '50%',
                    background: d.n === today ? token.colorPrimary : 'transparent',
                  }}
                />
              </Flex>
            ),
          }))}
        />
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorAlert error={error} onRetry={reload} />
      ) : (
        <>
          <Flex justify="space-between" align="baseline" style={{ marginBottom: 12 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {isToday ? 'Bugungi darslar' : DAYS[day - 1].name}
            </Typography.Title>
            <Typography.Text type="secondary">{dayLessons.length} ta dars</Typography.Text>
          </Flex>

          {isToday && dayLessons.length > 0 && !current && !nextLesson && (
            <Alert type="success" showIcon title="Bugungi barcha darslar tugadi. Yaxshi dam oling!" style={{ marginBottom: 12 }} />
          )}

          {dayLessons.length ? (
            <Row gutter={[12, 12]}>
              {dayLessons.map((l) => (
                <Col key={l.id} xs={24} lg={12}>
                  <LessonCard lesson={l} status={statusOf(l)} note={isToday ? noteOf(l) : undefined} dimmed={!occursThisWeek(l, parity)} />
                </Col>
              ))}
            </Row>
          ) : (
            <EmptyState title="Bu kunda dars yo'q">Boshqa kunni tanlab ko'ring.</EmptyState>
          )}
        </>
      )}
    </div>
  );
}
