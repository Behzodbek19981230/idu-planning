import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarRange, Copy, FileSpreadsheet, KeyRound, Lock, Pencil, Plus, Search, Trash2, Unlock, Users } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useApi } from '../../lib/useApi.js';
import { downloadCredentialsCsv } from '../../lib/credentials.js';
import { Badge, EmptyState, ErrorBox, Modal, PageHeader, Spinner } from '../../components/ui.jsx';

export default function TeachersPage() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useApi(`/admin/teachers?q=${encodeURIComponent(q)}`);
  const [editing, setEditing] = useState(null); // null | {} (yangi) | teacher
  const [credentials, setCredentials] = useState(null);
  const [actionError, setActionError] = useState(null);

  const run = async (fn) => {
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(err);
    }
  };

  const resetPassword = (t) =>
    run(async () => {
      if (!confirm(`${t.fullName} uchun yangi parol yaratilsinmi? Eski parol ishlamay qoladi.`)) return;
      const { password } = await api.post(`/admin/teachers/${t.id}/reset-password`);
      setCredentials({ fullName: t.fullName, username: t.username, password });
    });

  const toggleActive = (t) => run(() => api.patch(`/admin/teachers/${t.id}`, { isActive: !t.isActive }));

  const remove = (t) =>
    run(async () => {
      if (!confirm(`${t.fullName} va uning barcha darslari o'chirilsinmi?`)) return;
      await api.del(`/admin/teachers/${t.id}`);
    });

  const teachers = data?.teachers ?? [];

  const exportExcel = () =>
    run(() =>
      api.download(
        `/admin/teachers/export?site=${encodeURIComponent(window.location.origin)}`,
        `oqituvchilar-login-parol-${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    );

  const regenerateMissing = () =>
    run(async () => {
      const n = data.missingPasswords;
      if (!confirm(`${n} ta o'qituvchiga yangi parol yaratilsinmi? Ularga avval berilgan parollar ishlamay qoladi.`)) return;
      await api.post('/admin/teachers/regenerate-missing');
    });

  return (
    <div>
      <PageHeader
        title="O'qituvchilar"
        subtitle={data ? `${teachers.length} ta o'qituvchi` : undefined}
        actions={
          <>
            <button className="btn-secondary" onClick={exportExcel} disabled={!data?.teachers.length}>
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
            </button>
            <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" /> Qo'shish
            </button>
          </>
        }
      />

      {data?.missingPasswords > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <AlertTriangle className="hidden h-5 w-5 shrink-0 sm:block" />
          <p className="flex-1">
            <b>{data.missingPasswords} ta o'qituvchining paroli saqlanmagan</b> — ular Excel eksport funksiyasidan oldin yaratilgan.
            Excel'da ularning paroli chiqishi uchun yangi parol yarating.
          </p>
          <button className="btn shrink-0 bg-amber-600 text-white hover:bg-amber-700" onClick={regenerateMissing}>
            <KeyRound className="h-4 w-4" /> Yangi parol yaratish
          </button>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-10" placeholder="Ism yoki login bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mb-4">
        <ErrorBox error={actionError || error} />
      </div>

      {loading && !data ? (
        <Spinner />
      ) : !teachers.length ? (
        <EmptyState icon={Users} title={q ? 'Hech narsa topilmadi' : "O'qituvchilar yo'q"}>
          {!q && "Excel jadval yuklanganda o'qituvchilar avtomatik qo'shiladi."}
        </EmptyState>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {teachers.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/teachers/${t.id}`} className="font-medium hover:text-indigo-600">
                    {t.fullName}
                  </Link>
                  {!t.isActive && <Badge tone="red">Bloklangan</Badge>}
                  {t.passwordStatus === 'changed' && <Badge tone="green">Parolni o'zgartirgan</Badge>}
                  {t.passwordStatus === 'unknown' && <Badge tone="amber">Parol saqlanmagan</Badge>}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-slate-500">
                  {t.position && <span>{t.position}</span>}
                  {t.scheduleName && t.scheduleName !== t.fullName && <span>Jadvalda: {t.scheduleName}</span>}
                  <span className="font-mono">{t.username}</span>
                  <span>{t.lessonsCount} ta dars</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <IconBtn as={Link} to={`/admin/teachers/${t.id}`} title="Jadvalni ko'rish" icon={CalendarRange} />
                <IconBtn onClick={() => setEditing(t)} title="Tahrirlash" icon={Pencil} />
                <IconBtn onClick={() => resetPassword(t)} title="Parolni tiklash" icon={KeyRound} />
                <IconBtn onClick={() => toggleActive(t)} title={t.isActive ? 'Bloklash' : 'Blokdan chiqarish'} icon={t.isActive ? Lock : Unlock} />
                <IconBtn onClick={() => remove(t)} title="O'chirish" icon={Trash2} danger />
              </div>
            </div>
          ))}
        </div>
      )}

      <TeacherForm
        teacher={editing}
        onClose={() => setEditing(null)}
        onSaved={(creds) => {
          setEditing(null);
          if (creds) setCredentials(creds);
          reload();
        }}
      />
      <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function IconBtn({ as: As = 'button', icon: Icon, title, danger, ...props }) {
  return (
    <As
      title={title}
      aria-label={title}
      className={`rounded-lg border border-slate-200 p-2 transition ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'
      }`}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </As>
  );
}

function TeacherForm({ teacher, onClose, onSaved }) {
  const isNew = teacher && !teacher.id;
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState(null);

  // Modal ochilganda formani to'ldirish
  if (teacher !== prev) {
    setPrev(teacher);
    setForm({
      fullName: teacher?.fullName || '',
      position: teacher?.position || '',
      scheduleName: teacher?.scheduleName || '',
      username: teacher?.username || '',
      password: '',
    });
    setError(null);
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        const d = await api.post('/admin/teachers', form);
        onSaved({ fullName: d.teacher.fullName, username: d.teacher.username, password: d.password });
      } else {
        const { password: _password, ...changes } = form;
        await api.patch(`/admin/teachers/${teacher.id}`, changes);
        onSaved(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal open={Boolean(teacher)} onClose={onClose} title={isNew ? "Yangi o'qituvchi" : 'Tahrirlash'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">F.I.Sh.</label>
          <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="Karimov Alisher Bahodirovich" required autoFocus />
        </div>
        <div>
          <label className="label">Unvon <span className="font-normal text-slate-400">(ixtiyoriy)</span></label>
          <input className="input" value={form.position} onChange={set('position')} placeholder="kat.o'qit, PhD, dots." />
        </div>
        <div>
          <label className="label">Jadvaldagi nomi</label>
          <input className="input" value={form.scheduleName} onChange={set('scheduleName')} placeholder="R.Sobirov" />
          <p className="mt-1 text-xs text-slate-500">
            Excel jadvalida qanday yozilgan bo'lsa, xuddi shunday kiriting — import darslarni shu nom bo'yicha biriktiradi.
          </p>
        </div>
        <div>
          <label className="label">Login {isNew && <span className="font-normal text-slate-400">(ixtiyoriy)</span>}</label>
          <input
            className="input font-mono"
            value={form.username}
            onChange={set('username')}
            placeholder={isNew ? 'avtomatik yaratiladi' : ''}
            autoCapitalize="none"
            required={!isNew}
          />
        </div>
        {isNew && (
          <div>
            <label className="label">Parol <span className="font-normal text-slate-400">(ixtiyoriy)</span></label>
            <input className="input font-mono" value={form.password} onChange={set('password')} placeholder="avtomatik yaratiladi" />
          </div>
        )}
        <ErrorBox error={error} />
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Bekor qilish</button>
          <button className="btn-primary flex-1" disabled={busy}>Saqlash</button>
        </div>
      </form>
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!creds) return null;
  const text = `${creds.fullName}\nLogin: ${creds.username}\nParol: ${creds.password}\nManzil: ${window.location.origin}`;

  const copy = async () => {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal open onClose={onClose} title="Kirish ma'lumotlari">
      <p className="mb-3 text-sm text-red-600">Parol faqat hozir ko'rsatiladi. O'qituvchiga yetkazing.</p>
      <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        <div className="font-medium">{creds.fullName}</div>
        <div>Login: <span className="font-mono font-semibold">{creds.username}</span></div>
        <div>Parol: <span className="font-mono font-semibold">{creds.password}</span></div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn-secondary flex-1" onClick={() => downloadCredentialsCsv([creds], `${creds.username}.csv`)}>CSV</button>
        <button className="btn-primary flex-1" onClick={copy}>
          <Copy className="h-4 w-4" /> {copied ? 'Nusxa olindi' : 'Nusxa olish'}
        </button>
      </div>
    </Modal>
  );
}
