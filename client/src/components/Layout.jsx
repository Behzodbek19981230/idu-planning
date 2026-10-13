import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { CalendarDays, CalendarRange, FileUp, LayoutDashboard, LogOut, Sun, Table2, UserCircle, Users } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const NAV = {
  TEACHER: [
    { to: '/', label: 'Bugun', icon: Sun, end: true },
    { to: '/week', label: 'Hafta', icon: CalendarRange },
    { to: '/profile', label: 'Profil', icon: UserCircle },
  ],
  ADMIN: [
    { to: '/admin', label: 'Asosiy', icon: LayoutDashboard, end: true },
    { to: '/admin/import', label: 'Import', icon: FileUp },
    { to: '/admin/teachers', label: "O'qituvchilar", icon: Users },
    { to: '/admin/schedule', label: 'Jadval', icon: Table2 },
    { to: '/profile', label: 'Profil', icon: UserCircle },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const items = NAV[user.role];
  // Umumiy jadval keng — butun ekran kengligidan foydalanadi
  const wide = useMatch('/admin/schedule');

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center gap-4 px-4 ${wide ? 'max-w-[110rem] lg:px-6' : 'max-w-6xl'}`}>
          <div className="flex items-center gap-2 font-bold text-indigo-700">
            <CalendarDays className="h-6 w-6" />
            <span className="hidden sm:inline">Dars jadvali</span>
          </div>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="min-w-0 text-right leading-tight">
              <div className="truncate text-sm font-medium">{user.fullName}</div>
              {user.role === 'TEACHER' && <div className="text-xs text-slate-500">O'qituvchi</div>}
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Chiqish" aria-label="Chiqish">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto px-4 py-5 sm:py-8 ${wide ? 'max-w-[110rem] lg:px-6' : 'max-w-6xl'}`}>
        <Outlet />
      </main>

      {/* Mobil pastki menyu */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
