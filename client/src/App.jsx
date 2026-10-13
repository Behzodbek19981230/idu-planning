import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Spinner } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import TodayPage from './pages/teacher/TodayPage.jsx';
import WeekPage from './pages/teacher/WeekPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ImportPage from './pages/admin/ImportPage.jsx';
import TeachersPage from './pages/admin/TeachersPage.jsx';
import TeacherSchedulePage from './pages/admin/TeacherSchedulePage.jsx';
import SchedulePage from './pages/admin/SchedulePage.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner className="min-h-dvh items-center" />;
  if (!user) return <LoginPage />;

  const isAdmin = user.role === 'ADMIN';

  return (
    <Routes>
      <Route element={<Layout />}>
        {isAdmin ? (
          <>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/import" element={<ImportPage />} />
            <Route path="/admin/teachers" element={<TeachersPage />} />
            <Route path="/admin/teachers/:id" element={<TeacherSchedulePage />} />
            <Route path="/admin/schedule" element={<SchedulePage />} />
          </>
        ) : (
          <>
            <Route path="/" element={<TodayPage />} />
            <Route path="/week" element={<WeekPage />} />
          </>
        )}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to={isAdmin ? '/admin' : '/'} replace />} />
      </Route>
    </Routes>
  );
}
