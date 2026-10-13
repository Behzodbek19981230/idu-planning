import { useState } from 'react';
import { CalendarDays, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { ErrorBox } from '../components/ui.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-white">
          <div className="mb-3 rounded-2xl bg-white/15 p-3 backdrop-blur">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Dars jadvali</h1>
          <p className="mt-1 text-sm text-indigo-100">O'qituvchilar uchun shaxsiy jadval</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6 shadow-xl">
          <div>
            <label className="label" htmlFor="username">Login</label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Parol</label>
            <div className="relative">
              <input
                id="password"
                className="input pr-11"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <ErrorBox error={error} />

          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Kirish
          </button>
          <p className="text-center text-xs text-slate-500">Login va parolni administrator beradi.</p>
        </form>
      </div>
    </div>
  );
}
