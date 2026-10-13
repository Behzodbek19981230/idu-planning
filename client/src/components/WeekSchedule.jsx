import { CalendarX } from 'lucide-react';
import LessonCard from './LessonCard.jsx';
import { EmptyState } from './ui.jsx';
import { DAYS, groupByDay, isoDay } from '../lib/schedule.js';

export default function WeekSchedule({ lessons, showTeacher = false }) {
  if (!lessons.length) {
    return (
      <EmptyState icon={CalendarX} title="Darslar topilmadi">
        Jadval hali yuklanmagan bo'lishi mumkin.
      </EmptyState>
    );
  }

  const byDay = groupByDay(lessons);
  const today = isoDay();
  const days = DAYS.filter((d) => d.n <= 6 || byDay.get(d.n).length);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {days.map((d) => {
        const items = byDay.get(d.n);
        return (
          <section key={d.n} id={`day-${d.n}`} className="scroll-mt-20">
            <h2 className="mb-2.5 flex items-center gap-2 font-semibold">
              {d.name}
              {d.n === today && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">Bugun</span>}
              <span className="ml-auto text-sm font-normal text-slate-500">
                {items.length ? `${items.length} ta dars` : "Dars yo'q"}
              </span>
            </h2>
            {items.length ? (
              <div className="space-y-3">
                {items.map((l) => (
                  <LessonCard key={l.id} lesson={l} showTeacher={showTeacher} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                Bo'sh kun
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
