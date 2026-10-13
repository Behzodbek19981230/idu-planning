import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarX, Search, Trash2 } from 'lucide-react';
import Timetable, { TYPE_STYLE } from '../../components/Timetable.jsx';
import { EmptyState, ErrorBox, PageHeader, Spinner } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { DAYS, isoDay } from '../../lib/schedule.js';

const ALL_WEEK = 0;

// Kompyuterda butun hafta, telefonda bugungi kun ochiladi
const initialDay = () =>
  window.matchMedia('(min-width: 768px)').matches ? ALL_WEEK : Math.min(isoDay(), 6);

export default function SchedulePage() {
  const [sheet, setSheet] = useState('');
  const [day, setDay] = useState(initialDay);
  const [q, setQ] = useState('');
  const [clearError, setClearError] = useState(null);
  const { data, error, loading, reload } = useApi(`/admin/timetable?sheet=${encodeURIComponent(sheet)}`);

  const clearAll = async () => {
    if (!confirm("Butun dars jadvali o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.")) return;
    try {
      await api.del('/admin/lessons');
      reload();
    } catch (err) {
      setClearError(err);
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
        actions={
          <button className="btn-secondary text-red-600" onClick={clearAll}>
            <Trash2 className="h-4 w-4" /> Tozalash
          </button>
        }
      />

      <div className="mb-4">
        <ErrorBox error={clearError || error} />
      </div>

      {loading && !data ? (
        <Spinner />
      ) : !data?.sheet ? (
        <EmptyState icon={CalendarX} title="Jadval hali yuklanmagan">
          <Link to="/admin/import" className="text-indigo-600 underline">Excel fayldan yuklash</Link>
        </EmptyState>
      ) : (
        <>
          {/* Kurslar — Excel varaqlari kabi */}
          <div className="scrollbar-none -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            {data.sheets.map((s) => (
              <button
                key={s}
                onClick={() => setSheet(s)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  s === data.sheet ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              {[{ n: ALL_WEEK, short: 'Hafta', name: 'Butun hafta' }, ...weekDays].map((d) => (
                <button
                  key={d.n}
                  onClick={() => setDay(d.n)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    d.n === day ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <span className="sm:hidden">{d.short}</span>
                  <span className="hidden sm:inline">{d.name}</span>
                </button>
              ))}
            </div>
            <div className="relative lg:ml-auto lg:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" placeholder="O'qituvchi, fan yoki xona" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {Object.entries(TYPE_STYLE).map(([name, s]) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-sm border-l-4 ${s.card}`} />
                {name}
              </span>
            ))}
          </div>

          <Timetable groups={data.groups} slots={data.slots} lessons={lessons} days={shownDays} query={q.trim()} />
        </>
      )}
    </div>
  );
}
