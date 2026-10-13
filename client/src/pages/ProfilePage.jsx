import { useState } from 'react';
import { CheckCircle2, KeyRound, LogOut } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox, PageHeader } from '../components/ui.jsx';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (form.newPassword !== form.confirm) return setError(new Error('Yangi parollar mos kelmadi'));
    setBusy(true);
    try {
      await api.post('/auth/change-password', form);
      setDone(true);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Profil" />

      <div className="card mb-4 p-5">
        <div className="text-lg font-semibold">{user.fullName}</div>
        <div className="mt-1 text-sm text-slate-500">
          Login: <span className="font-mono text-slate-700">{user.username}</span>
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-5 w-5 text-indigo-600" /> Parolni o'zgartirish
        </h2>
        <div>
          <label className="label">Joriy parol</label>
          <input className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </div>
        <div>
          <label className="label">Yangi parol</label>
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={form.newPassword} onChange={set('newPassword')} required />
        </div>
        <div>
          <label className="label">Yangi parolni takrorlang</label>
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={form.confirm} onChange={set('confirm')} required />
        </div>
        <ErrorBox error={error} />
        {done && (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Parol muvaffaqiyatli o'zgartirildi
          </p>
        )}
        <button className="btn-primary w-full sm:w-auto" disabled={busy}>Saqlash</button>
      </form>

      <button onClick={logout} className="btn-secondary mt-4 w-full text-red-600 md:hidden">
        <LogOut className="h-4 w-4" /> Chiqish
      </button>
    </div>
  );
}
