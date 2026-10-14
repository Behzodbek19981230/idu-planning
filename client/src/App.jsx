import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { HOME } from './lib/roles.js';
import { Loading } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PublicSchedulePage from './pages/PublicSchedulePage.jsx';
import TodayPage from './pages/teacher/TodayPage.jsx';
import WeekPage from './pages/teacher/WeekPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ImportPage from './pages/admin/ImportPage.jsx';
import TeachersPage from './pages/admin/TeachersPage.jsx';
import TeacherSchedulePage from './pages/admin/TeacherSchedulePage.jsx';
import SchedulePage from './pages/admin/SchedulePage.jsx';
import StaffPage from './pages/admin/StaffPage.jsx';
import GroupsPage from './pages/groups/GroupsPage.jsx';
import ReportsPage from './pages/superadmin/ReportsPage.jsx';
import LogsPage from './pages/superadmin/LogsPage.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  // Talabalar uchun ochiq sahifa — login talab qilinmaydi
  if (pathname === '/jadval') return <PublicSchedulePage />;

  if (loading) return <Loading fullScreen />;
  if (!user) return <LoginPage />;

  const { role } = user;

  return (
    <Routes>
      <Route element={<Layout />}>
        {role === 'ADMIN' && (
          <>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/import" element={<ImportPage />} />
            <Route path="/admin/teachers" element={<TeachersPage />} />
            <Route path="/admin/teachers/:id" element={<TeacherSchedulePage />} />
            <Route path="/admin/schedule" element={<SchedulePage />} />
            <Route path="/admin/staff" element={<StaffPage />} />
          </>
        )}
        {role === 'TEACHER' && (
          <>
            <Route path="/" element={<TodayPage />} />
            <Route path="/week" element={<WeekPage />} />
          </>
        )}
        {role === 'SUPERADMIN' && (
          <>
            <Route path="/superadmin" element={<ReportsPage />} />
            <Route path="/superadmin/logs" element={<LogsPage />} />
          </>
        )}
        {role !== 'TEACHER' && role !== 'SUPERADMIN' && <Route path="/groups" element={<GroupsPage />} />}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to={HOME[role]} replace />} />
      </Route>
    </Routes>
  );
}
