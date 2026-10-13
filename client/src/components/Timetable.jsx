import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Typography, theme } from 'antd';
import { EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { DAYS, TYPE_COLORS, WEEK_LABEL } from '../lib/schedule.js';

/** Dars ustunlarini uzluksiz bo'laklarga ajratadi: [1,2,3,6] -> [[1,3],[6,6]] */
function runs(indices) {
  const sorted = [...indices].sort((a, b) => a - b);
  const out = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i === last[1] + 1) last[1] = i;
    else out.push([i, i]);
  }
  return out;
}

/** Bir vaqtdagi darslarni kataklarga joylaydi; ustma-ust tushganlari bitta katakda yig'iladi */
function buildCells(lessons, groups) {
  const pieces = [];
  for (const l of lessons) {
    const idx = l.columns.map((c) => groups.indexOf(c)).filter((i) => i >= 0);
    for (const [from, to] of runs(idx)) pieces.push({ from, to, lessons: [l] });
  }
  pieces.sort((a, b) => a.from - b.from);
  const cells = [];
  for (const p of pieces) {
    const last = cells[cells.length - 1];
    if (last && p.from <= last.to) {
      last.to = Math.max(last.to, p.to);
      last.lessons.push(...p.lessons);
    } else cells.push({ ...p, lessons: [...p.lessons] });
  }
  return cells;
}

function matches(lesson, q) {
  if (!q) return true;
  const hay = [lesson.subject, lesson.teacher.fullName, lesson.room, lesson.groupName].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

function LessonTile({ lesson, query }) {
  const { token } = theme.useToken();
  const color = TYPE_COLORS[lesson.lessonType] || 'geekblue';
  const hit = matches(lesson, query);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        height: '100%',
        padding: 8,
        fontSize: 12,
        borderRadius: token.borderRadius,
        background: token[`${color}1`],
        border: `1px solid ${token[`${color}3`]}`,
        borderLeft: `4px solid ${token[`${color}6`]}`,
        opacity: query && !hit ? 0.25 : 1,
        outline: query && hit ? `2px solid ${token.colorPrimary}` : 'none',
        transition: 'opacity .15s',
      }}
    >
      <Typography.Text strong style={{ fontSize: 12.5, lineHeight: 1.35, wordBreak: 'break-word' }}>
        {lesson.subject}
      </Typography.Text>
      <div>
        {lesson.lessonType && (
          <Tag color={TYPE_COLORS[lesson.lessonType]} style={{ fontSize: 10, lineHeight: '16px', marginInlineEnd: 4 }}>
            {lesson.lessonType}
          </Tag>
        )}
        {WEEK_LABEL[lesson.weekType] && (
          <Tag color="red" style={{ fontSize: 10, lineHeight: '16px' }}>
            {WEEK_LABEL[lesson.weekType]}
          </Tag>
        )}
      </div>
      <Link to={`/admin/teachers/${lesson.teacher.id}`} style={{ color: token.colorTextSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <UserOutlined style={{ marginRight: 4 }} />
        {lesson.teacher.fullName}
      </Link>
      {lesson.room && (
        <span style={{ marginTop: 'auto', fontWeight: 600, color: token.colorError }}>
          <EnvironmentOutlined style={{ marginRight: 4 }} />
          {lesson.room}
        </span>
      )}
    </div>
  );
}

/**
 * Excel'dagi kabi jadval: ustunlar — guruhlar, qatorlar — kun × juftlik.
 * Bir nechta guruhga birgalikda o'tiladigan dars (potok) ularning ustiga cho'zilib turadi.
 */
export default function Timetable({ groups, slots, lessons, days, query }) {
  const { token } = theme.useToken();
  const cols = groups.length;
  const line = `1px solid ${token.colorBorderSecondary}`;
  const headBg = token.colorFillAlter;
  let row = 2; // 1-qator — sarlavha

  const headCell = {
    position: 'sticky',
    top: 0,
    background: token.colorBgContainer,
    backgroundImage: `linear-gradient(${headBg}, ${headBg})`,
    borderBottom: line,
    borderRight: line,
    padding: '10px 8px',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    color: token.colorTextHeading,
  };

  return (
    <div
      style={{
        maxHeight: 'calc(100dvh - 15rem)',
        overflow: 'auto',
        border: line,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
      }}
    >
      <div
        style={{
          display: 'grid',
          // Ustunlar ekranga teng bo'linadi; juda ko'p guruh bo'lsa — gorizontal scroll
          gridTemplateColumns: `4.25rem repeat(${cols}, minmax(0, 1fr))`,
          width: `max(100%, ${4.25 + cols * 8.75}rem)`,
        }}
      >
        <div style={{ ...headCell, left: 0, zIndex: 3, textAlign: 'left', color: token.colorTextSecondary, gridRow: 1, gridColumn: 1 }}>Vaqt</div>
        {groups.map((g, i) => (
          <div key={g} style={{ ...headCell, zIndex: 2, gridRow: 1, gridColumn: i + 2 }}>
            {g}
          </div>
        ))}

        {days.map((day) => {
          const dayLessons = lessons.filter((l) => l.dayOfWeek === day);
          const dayRow = row++;
          return (
            <Fragment key={day}>
              <div style={{ gridRow: dayRow, gridColumn: `1 / ${cols + 2}`, background: token.colorPrimaryBg, borderBottom: line }}>
                <div style={{ position: 'sticky', left: 0, display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '6px 12px' }}>
                  <span style={{ fontWeight: 600, color: token.colorPrimaryText }}>{DAYS[day - 1].name}</span>
                  <span style={{ fontSize: 12, color: token.colorPrimaryTextHover }}>{dayLessons.length} ta dars</span>
                </div>
              </div>

              {slots.map((slot) => {
                const r = row++;
                const slotLessons = dayLessons.filter((l) => l.startTime === slot.startTime && l.endTime === slot.endTime);
                const cells = buildCells(slotLessons, groups);
                const covered = new Set(cells.flatMap((c) => Array.from({ length: c.to - c.from + 1 }, (_, k) => c.from + k)));
                return (
                  <Fragment key={slot.startTime}>
                    <div
                      style={{
                        gridRow: r,
                        gridColumn: 1,
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '8px 4px',
                        lineHeight: 1.3,
                        background: token.colorBgContainer,
                        borderBottom: line,
                        borderRight: line,
                      }}
                    >
                      {slot.pairNumber && <span style={{ fontSize: 10, color: token.colorTextTertiary }}>{slot.pairNumber}-juftlik</span>}
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{slot.startTime}</span>
                      <span style={{ fontSize: 11, color: token.colorTextSecondary }}>{slot.endTime}</span>
                    </div>
                    {groups.map((g, i) =>
                      covered.has(i) ? null : (
                        <div key={g} style={{ gridRow: r, gridColumn: i + 2, minHeight: 64, borderBottom: line, borderRight: line }} />
                      )
                    )}
                    {cells.map((c) => (
                      <div
                        key={c.from}
                        style={{
                          gridRow: r,
                          gridColumn: `${c.from + 2} / ${c.to + 3}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: 6,
                          borderBottom: line,
                          borderRight: line,
                        }}
                      >
                        {c.lessons.map((l) => (
                          <LessonTile key={l.id} lesson={l} query={query} />
                        ))}
                      </div>
                    ))}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
