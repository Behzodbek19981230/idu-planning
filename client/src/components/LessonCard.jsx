import { Card, Flex, Tag, Typography, theme } from 'antd';
import { BookOutlined, ClockCircleOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { TYPE_COLORS, WEEK_LABEL } from '../lib/schedule.js';

const { Text } = Typography;

export default function LessonCard({ lesson, status, note, showTeacher = false, dimmed = false }) {
  const { token } = theme.useToken();
  const isNow = status === 'now';

  return (
    <Card
      size="small"
      style={{
        opacity: status === 'past' || dimmed ? 0.55 : 1,
        borderColor: isNow ? token.colorPrimary : status === 'next' ? token.colorPrimaryBorder : undefined,
        boxShadow: isNow ? `0 0 0 3px ${token.colorPrimaryBg}` : undefined,
      }}
      styles={{ body: { padding: 14 } }}
    >
      <Flex gap={14}>
        <Flex
          vertical
          align="center"
          justify="center"
          style={{
            width: 58,
            flexShrink: 0,
            borderRadius: token.borderRadius,
            background: token.colorPrimaryBg,
            color: token.colorPrimary,
            padding: '8px 0',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>{lesson.startTime}</span>
          <span style={{ width: 1, height: 10, margin: '5px 0', background: token.colorPrimaryBorder }} />
          <span style={{ fontSize: 12, lineHeight: 1 }}>{lesson.endTime}</span>
        </Flex>

        <Flex vertical gap={6} style={{ minWidth: 0, flex: 1 }}>
          <Flex wrap gap={4}>
            {isNow && <Tag color="processing">Hozir</Tag>}
            {status === 'next' && <Tag color="success">Keyingi</Tag>}
            {lesson.pairNumber && <Tag>{lesson.pairNumber}-juftlik</Tag>}
            {lesson.lessonType && <Tag color={TYPE_COLORS[lesson.lessonType]}>{lesson.lessonType}</Tag>}
            {WEEK_LABEL[lesson.weekType] && <Tag color="red">{WEEK_LABEL[lesson.weekType]}</Tag>}
          </Flex>

          <Text strong style={{ fontSize: 15 }}>
            <BookOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />
            {lesson.subject}
          </Text>

          <Flex vertical gap={2}>
            {(lesson.room || lesson.building) && (
              <Text>
                <EnvironmentOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />
                <Text strong>{lesson.room ? `${lesson.room}-xona` : '—'}</Text>
                {lesson.building && <Text type="secondary"> · {lesson.building}</Text>}
              </Text>
            )}
            {lesson.groupName && (
              <Text type="secondary">
                <TeamOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />
                {lesson.groupName}
                {lesson.sheetName && <Text type="secondary" style={{ opacity: 0.7 }}> · {lesson.sheetName}</Text>}
              </Text>
            )}
            {showTeacher && lesson.teacher && (
              <Text type="secondary">
                <UserOutlined style={{ color: token.colorTextTertiary, marginRight: 6 }} />
                {lesson.teacher.fullName}
              </Text>
            )}
          </Flex>

          {note && (
            <Text style={{ color: token.colorPrimary, fontSize: 12, fontWeight: 500 }}>
              <ClockCircleOutlined style={{ marginRight: 6 }} />
              {note}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
