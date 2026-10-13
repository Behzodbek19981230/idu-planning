import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { DoorOpen, User } from 'lucide-react';
import { DAYS, WEEK_LABEL } from '../lib/schedule.js';

export const TYPE_STYLE = {
  "Ma'ruza": { card: 'border-l-sky-500 bg-sky-50/70', chip: 'bg-sky-100 text-sky-800' },
  Amaliy: { card: 'border-l-emerald-500 bg-emerald-50/70', chip: 'bg-emerald-100 text-emerald-800' },
  Seminar: { card: 'border-l-amber-500 bg-amber-50/70', chip: 'bg-amber-100 text-amber-800' },
  Laboratoriya: { card: 'border-l-violet-500 bg-violet-50/70', chip: 'bg-violet-100 text-violet-800' },
};
const DEFAULT_STYLE = { card: 'border-l-slate-400 bg-slate-50', chip: 'bg-slate-200 text-slate-700' };

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
  const style = TYPE_STYLE[lesson.lessonType] || DEFAULT_STYLE;
  const hit = matches(lesson, query);
  return (
    <div
      className={`flex h-full flex-col gap-1 rounded-lg border border-l-4 border-slate-200 p-2 text-left text-xs shadow-sm transition ${style.card} ${
        query ? (hit ? 'ring-2 ring-indigo-500' : 'opacity-25') : ''
      }`}
    >
      <div className="break-words font-semibold leading-snug text-slate-900">{lesson.subject}</div>
      <div className="flex flex-wrap gap-1">
        {lesson.lessonType && <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}>{lesson.lessonType}</span>}
        {WEEK_LABEL[lesson.weekType] && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">{WEEK_LABEL[lesson.weekType]}</span>
        )}
      </div>
      <Link to={`/admin/teachers/${lesson.teacher.id}`} className="flex items-center gap-1 text-slate-600 hover:text-indigo-700">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{lesson.teacher.fullName}</span>
      </Link>
      {lesson.room && (
        <div className="mt-auto flex items-center gap-1 font-semibold text-red-600">
          <DoorOpen className="h-3 w-3 shrink-0" />
          {lesson.room}
        </div>
      )}
    </div>
  );
}

/**
 * Excel'dagi kabi jadval: ustunlar — guruhlar, qatorlar — kun × juftlik.
 * Bir nechta guruhga birgalikda o'tiladigan dars (potok) ularning ustiga cho'zilib turadi.
 */
export default function Timetable({ groups, slots, lessons, days, query }) {
  const cols = groups.length;
  let row = 2; // 1-qator — sarlavha

  return (
    <div className="max-h-[calc(100dvh-16rem)] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:max-h-[calc(100dvh-14rem)]">
      <div
        className="grid text-sm"
        // Ustunlar ekranga teng bo'linadi; juda ko'p guruh bo'lsa — gorizontal scroll
        style={{
          gridTemplateColumns: `4.25rem repeat(${cols}, minmax(0, 1fr))`,
          width: `max(100%, ${4.25 + cols * 8.75}rem)`,
        }}
      >
        {/* Sarlavha */}
        <div className="sticky left-0 top-0 z-30 border-b border-r border-slate-200 bg-slate-100 px-2 py-2.5 text-xs font-semibold text-slate-500" style={{ gridRow: 1, gridColumn: 1 }}>
          Vaqt
        </div>
        {groups.map((g, i) => (
          <div
            key={g}
            className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-100 px-2 py-2.5 text-center text-xs font-semibold text-slate-700"
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            {g}
          </div>
        ))}

        {days.map((day) => {
          const dayLessons = lessons.filter((l) => l.dayOfWeek === day);
          const dayRow = row++;
          return (
            <Fragment key={day}>
              <div
                className="border-b border-slate-200 bg-indigo-50/60"
                style={{ gridRow: dayRow, gridColumn: `1 / ${cols + 2}` }}
              >
                <div className="sticky left-0 inline-flex items-baseline gap-2 px-3 py-1.5">
                  <span className="font-semibold text-indigo-800">{DAYS[day - 1].name}</span>
                  <span className="text-xs text-indigo-500">{dayLessons.length} ta dars</span>
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
                      className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-slate-200 bg-white px-2 py-2 text-center leading-tight"
                      style={{ gridRow: r, gridColumn: 1 }}
                    >
                      {slot.pairNumber && <span className="text-[10px] text-slate-400">{slot.pairNumber}-juftlik</span>}
                      <span className="text-xs font-semibold text-slate-800">{slot.startTime}</span>
                      <span className="text-[11px] text-slate-500">{slot.endTime}</span>
                    </div>
                    {groups.map((g, i) =>
                      covered.has(i) ? null : (
                        <div key={g} className="min-h-16 border-b border-r border-slate-100" style={{ gridRow: r, gridColumn: i + 2 }} />
                      )
                    )}
                    {cells.map((c) => (
                      <div
                        key={c.from}
                        className="flex flex-col gap-1.5 border-b border-r border-slate-100 p-1.5"
                        style={{ gridRow: r, gridColumn: `${c.from + 2} / ${c.to + 3}` }}
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
