import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Flex, Grid, Layout as AntLayout, Menu, Typography, theme } from 'antd';
import {
  CalendarOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  IdcardOutlined,
  LogoutOutlined,
  ScheduleOutlined,
  TableOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuth } from '../lib/auth.jsx';
import { ROLE_LABELS } from '../lib/roles.js';
import ThemeSwitch from './ThemeSwitch.jsx';

const NAV = {
  TEACHER: [
    { key: '/', label: 'Bugun', icon: <CalendarOutlined /> },
    { key: '/week', label: 'Hafta', icon: <ScheduleOutlined /> },
    { key: '/profile', label: 'Profil', icon: <UserOutlined /> },
  ],
  ADMIN: [
    { key: '/admin', label: 'Asosiy', icon: <DashboardOutlined /> },
    { key: '/admin/import', label: 'Import', icon: <UploadOutlined /> },
    { key: '/admin/teachers', label: "O'qituvchilar", icon: <TeamOutlined /> },
    { key: '/admin/schedule', label: 'Jadval', icon: <TableOutlined /> },
    { key: '/groups', label: 'Guruhlar', icon: <FolderOpenOutlined /> },
    { key: '/admin/staff', label: 'Xodimlar', icon: <IdcardOutlined /> },
    { key: '/profile', label: 'Profil', icon: <UserOutlined /> },
  ],
  DEAN: [
    { key: '/groups', label: 'Guruhlar', icon: <FolderOpenOutlined /> },
    { key: '/profile', label: 'Profil', icon: <UserOutlined /> },
  ],
  VICE_DEAN: [
    { key: '/groups', label: 'Guruhlarim', icon: <FolderOpenOutlined /> },
    { key: '/profile', label: 'Profil', icon: <UserOutlined /> },
  ],
};

// Mobil pastki menyuga sig'adigan bandlar soni — ortiqcha bo'lsa Profil foydalanuvchi menyusida qoladi
const BOTTOM_NAV_MAX = 6;

/** Joriy manzilga eng uzun mos keladigan menyu bandi */
function activeKey(items, pathname) {
  return (
    items
      .filter((i) => pathname === i.key || (i.key !== '/' && i.key !== '/admin' && pathname.startsWith(i.key + '/')))
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? pathname
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  // Umumiy jadval keng — butun ekran kengligidan foydalanadi
  const wide = useMatch('/admin/schedule');

  const items = NAV[user.role];
  const selected = activeKey(items, pathname);
  const maxWidth = wide ? 1760 : 1152;

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profil' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Chiqish', danger: true },
    ],
    onClick: ({ key }) => (key === 'logout' ? logout() : navigate('/profile')),
  };

  return (
    <AntLayout style={{ minHeight: '100dvh' }}>
      <AntLayout.Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          paddingInline: 0,
        }}
      >
        <Flex align="center" gap={16} style={{ maxWidth, margin: '0 auto', height: '100%', paddingInline: 16 }}>
          <Flex align="center" gap={8} style={{ color: token.colorPrimary, fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap' }}>
            <CalendarOutlined style={{ fontSize: 22 }} />
            {screens.sm && 'Dars jadvali'}
          </Flex>

          {!isMobile && (
            <Menu
              mode="horizontal"
              selectedKeys={[selected]}
              items={items}
              onClick={({ key }) => navigate(key)}
              style={{ flex: 1, minWidth: 0, borderBottom: 'none', background: 'transparent' }}
            />
          )}

          <Flex align="center" gap={4} style={{ marginLeft: 'auto', minWidth: 0 }}>
            <ThemeSwitch />
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <Flex align="center" gap={8} style={{ cursor: 'pointer', minWidth: 0, paddingLeft: 4 }}>
                <Flex vertical align="flex-end" style={{ minWidth: 0, lineHeight: 1.25 }}>
                  <Typography.Text strong ellipsis style={{ maxWidth: isMobile ? 150 : 220 }}>
                    {user.fullName}
                  </Typography.Text>
                  {user.role !== 'ADMIN' && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {ROLE_LABELS[user.role]}
                    </Typography.Text>
                  )}
                </Flex>
                <Avatar style={{ background: token.colorPrimary, flexShrink: 0 }} icon={<UserOutlined />} />
              </Flex>
            </Dropdown>
          </Flex>
        </Flex>
      </AntLayout.Header>

      <AntLayout.Content
        style={{
          width: '100%',
          maxWidth,
          margin: '0 auto',
          padding: isMobile ? '16px 16px calc(84px + env(safe-area-inset-bottom))' : '28px 24px 40px',
        }}
      >
        <Outlet />
      </AntLayout.Content>

      {isMobile && (
        <BottomNav
          items={items.length > BOTTOM_NAV_MAX ? items.filter((i) => i.key !== '/profile') : items}
          selected={selected}
          onSelect={navigate}
        />
      )}
    </AntLayout>
  );
}

/** Mobil pastki menyu (ilovadagi tab-bar kabi) */
function BottomNav({ items, selected, onSelect }) {
  const { token } = theme.useToken();
  return (
    <nav
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        background: token.colorBgElevated,
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: token.boxShadowTertiary,
      }}
    >
      {items.map((i) => {
        const active = i.key === selected;
        return (
          <button
            key={i.key}
            onClick={() => onSelect(i.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 2px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: active ? token.colorPrimary : token.colorTextSecondary,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{i.icon}</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{i.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
