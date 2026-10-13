import { Col, Flex, Row, Tag, Typography, theme } from 'antd';
import LessonCard from './LessonCard.jsx';
import { EmptyState } from './ui.jsx';
import { DAYS, groupByDay, isoDay } from '../lib/schedule.js';

export default function WeekSchedule({ lessons, showTeacher = false }) {
  const { token } = theme.useToken();

  if (!lessons.length) {
    return <EmptyState title="Darslar topilmadi">Jadval hali yuklanmagan bo'lishi mumkin.</EmptyState>;
  }

  const byDay = groupByDay(lessons);
  const today = isoDay();
  const days = DAYS.filter((d) => d.n <= 6 || byDay.get(d.n).length);

  return (
    <Row gutter={[24, 24]}>
      {days.map((d) => {
        const items = byDay.get(d.n);
        return (
          <Col key={d.n} xs={24} lg={12}>
            <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
              <Typography.Title level={5} style={{ margin: 0 }}>
                {d.name}
              </Typography.Title>
              {d.n === today && <Tag color="processing">Bugun</Tag>}
              <Typography.Text type="secondary" style={{ marginLeft: 'auto' }}>
                {items.length ? `${items.length} ta dars` : "Dars yo'q"}
              </Typography.Text>
            </Flex>
            {items.length ? (
              <Flex vertical gap={12}>
                {items.map((l) => (
                  <LessonCard key={l.id} lesson={l} showTeacher={showTeacher} />
                ))}
              </Flex>
            ) : (
              <div
                style={{
                  border: `1px dashed ${token.colorBorder}`,
                  borderRadius: token.borderRadiusLG,
                  padding: 20,
                  textAlign: 'center',
                  color: token.colorTextQuaternary,
                }}
              >
                Bo'sh kun
              </div>
            )}
          </Col>
        );
      })}
    </Row>
  );
}
