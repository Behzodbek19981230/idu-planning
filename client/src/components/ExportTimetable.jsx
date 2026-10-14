import { forwardRef } from 'react';
import { DAYS, WEEK_LABEL } from '../lib/schedule.js';

// Eksport (PDF / rasm) uchun — mavzudan qat'i nazar oq fon, Excel'dagi kabi ko'rinish
const BORDER = '1px solid #8c8c8c';
const cellBase = { border: BORDER, padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' };

function LessonText({ lesson }) {
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontWeight: 700, fontSize: 12 }}>
        {lesson.subject}
        {lesson.type && ` (${lesson.type})`}
      </div>
      {WEEK_LABEL[lesson.weekType] && <div style={{ fontSize: 10, fontStyle: 'italic', color: '#595959' }}>{WEEK_LABEL[lesson.weekType]}</div>}
      <div style={{ fontSize: 11 }}>{lesson.teacher}</div>
      {lesson.room && <div style={{ fontSize: 11, fontWeight: 700, color: '#c00000' }}>Xona: {lesson.room}</div>}
    </div>
  );
}

/** Guruhlar jadvali: ustunlar — guruhlar, qatorlar — kun × juftlik (server /groups/timetable natijasi) */
const ExportTimetable = forwardRef(function ExportTimetable({ title, grid }, ref) {
  const created = new Date().toLocaleDateString('ru-RU');
  return (
    <div
      ref={ref}
      style={{
        display: 'inline-block',
        padding: 24,
        background: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>{title}</div>
      <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 200 + grid.columns.length * 190 }}>
        <colgroup>
          <col style={{ width: 44 }} />
          <col style={{ width: 64 }} />
          <col style={{ width: 92 }} />
          {grid.columns.map((c) => (
            <col key={c} style={{ width: 190 }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: '#dce6f1', fontWeight: 700, fontSize: 13 }}>
            <th style={cellBase}>Kun</th>
            <th style={cellBase}>Juftlik</th>
            <th style={cellBase}>Vaqti</th>
            {grid.columns.map((c) => (
              <th key={c} style={cellBase}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.days.map(({ day, rows }) =>
            rows.map((row, i) => (
              <tr key={`${day}-${row.startTime}`} data-day-end={i === rows.length - 1 ? '' : undefined} style={{ fontSize: 12 }}>
                {i === 0 && (
                  <td rowSpan={rows.length} style={{ ...cellBase, padding: 0, background: '#fff2cc', fontWeight: 700, fontSize: 13 }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>{DAYS[day - 1].name}</div>
                  </td>
                )}
                <td style={cellBase}>{row.pairNumber ?? ''}</td>
                <td style={{ ...cellBase, whiteSpace: 'nowrap' }}>
                  {row.startTime}-{row.endTime}
                </td>
                {row.cells.map((cell, k) => (
                  <td key={k} colSpan={cell.span} style={{ ...cellBase, height: 64 }}>
                    {cell.lessons.map((l, j) => (
                      <div key={l.id}>
                        {j > 0 && <div style={{ borderTop: '1px dashed #8c8c8c', margin: '4px 0' }} />}
                        <LessonText lesson={l} />
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 10, color: '#8c8c8c', textAlign: 'right' }}>Sana: {created}</div>
    </div>
  );
});

export default ExportTimetable;
