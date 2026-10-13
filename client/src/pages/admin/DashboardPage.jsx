import { Link } from 'react-router-dom';
import { BookOpen, FileSpreadsheet, FileUp, Users } from 'lucide-react';
import { ErrorBox, PageHeader, Spinner } from '../../components/ui.jsx';
import { useApi } from '../../lib/useApi.js';
import { formatDateTime } from '../../lib/schedule.js';

function Stat({ icon: Icon, label, value, to }) {
  return (
    <Link to={to} className="card flex items-center gap-4 p-5 transition hover:border-indigo-300 hover:shadow">
      <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const stats = useApi('/admin/stats');
  const uploads = useApi('/admin/uploads');

  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error) return <ErrorBox error={stats.error} onRetry={stats.reload} />;
  const { teachers, lessons, lastUpload } = stats.data;

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        actions={
          <Link to="/admin/import" className="btn-primary">
            <FileUp className="h-4 w-4" /> Jadval yuklash
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="O'qituvchilar" value={teachers} to="/admin/teachers" />
        <Stat icon={BookOpen} label="Darslar" value={lessons} to="/admin/schedule" />
        <Stat
          icon={FileSpreadsheet}
          label={lastUpload ? `Oxirgi yuklash: ${formatDateTime(lastUpload.createdAt)}` : 'Hali yuklanmagan'}
          value={lastUpload ? lastUpload.rowsCount : '—'}
          to="/admin/import"
        />
      </div>

      <h2 className="mb-3 mt-8 font-semibold">Yuklashlar tarixi</h2>
      {uploads.data?.uploads.length ? (
        <div className="card divide-y divide-slate-100">
          {uploads.data.uploads.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate font-medium">{u.filename}</span>
              <span className="text-slate-500">{u.rowsCount} ta dars</span>
              <span className="text-slate-500">{u.mode === 'replace' ? 'Almashtirildi' : "Qo'shildi"}</span>
              <span className="w-full text-xs text-slate-400 sm:w-auto">
                {formatDateTime(u.createdAt)} · {u.uploadedBy?.fullName}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Hali hech qanday fayl yuklanmagan.</p>
      )}
    </div>
  );
}
