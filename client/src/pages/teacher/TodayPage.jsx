import { useEffect, useMemo, useState } from 'react';
import { Coffee } from 'lucide-react';
import LessonCard from '../../components/LessonCard.jsx';
import { EmptyState, ErrorBox, Spinner } from '../../components/ui.jsx';
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

/** Har daqiqada yangilanadigan joriy vaqt */
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
      <div className="mb-5">
        <p className="text-sm text-slate-500">
          {DAYS[today - 1].name}, {formatDate(now)}
          {parity && <> · <span className="font-medium text-indigo-600">{WEEK_LABEL[parity]}</span></>}
        </p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Assalomu alaykum, {firstName}!</h1>
      </div>

      {/* Kunlar tanlovi: mobilda gorizontal aylantiriladi */}
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const active = d.n === day;
          return (
            <button
              key={d.n}
              onClick={() => setDay(d.n)}
              className={`flex min-w-[3.25rem] flex-col items-center rounded-2xl border px-3 py-2 transition ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
              }`}
            >
              <span className={`text-xs ${active ? 'text-indigo-100' : 'text-slate-500'}`}>{d.short}</span>
              <span className="text-base font-bold">{countByDay[d.n] || 0}</span>
              {d.n === today && <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? 'bg-white' : 'bg-indigo-600'}`} />}
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">{isToday ? 'Bugungi darslar' : DAYS[day - 1].name}</h2>
            <span className="text-sm text-slate-500">{dayLessons.length} ta dars</span>
          </div>

          {isToday && dayLessons.length > 0 && !current && !nextLesson && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Bugungi barcha darslar tugadi. Yaxshi dam oling!
            </p>
          )}

          {dayLessons.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {dayLessons.map((l) => (
                <LessonCard
                  key={l.id}
                  lesson={l}
                  status={statusOf(l)}
                  note={isToday ? noteOf(l) : undefined}
                  dimmed={!occursThisWeek(l, parity)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Coffee} title="Bu kunda dars yo'q">
              Boshqa kunni tanlab ko'ring.
            </EmptyState>
          )}
        </>
      )}
    </div>
  );
}
