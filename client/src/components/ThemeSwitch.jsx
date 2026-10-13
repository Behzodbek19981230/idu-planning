import { Button, Dropdown, Segmented, Tooltip } from 'antd';
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useThemeMode } from '../lib/theme.jsx';

const OPTIONS = [
  { key: 'light', label: "Yorug'", icon: <SunOutlined /> },
  { key: 'dark', label: "Qorong'i", icon: <MoonOutlined /> },
  { key: 'system', label: 'Tizim', icon: <DesktopOutlined /> },
];

/** Sarlavhadagi ixcham tugma: bosilganda yorug'/qorong'i/tizim tanlanadi */
export default function ThemeSwitch() {
  const { mode, setMode, dark } = useThemeMode();
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: OPTIONS,
        selectable: true,
        selectedKeys: [mode],
        onClick: ({ key }) => setMode(key),
      }}
    >
      <Tooltip title="Mavzu">
        <Button type="text" shape="circle" icon={dark ? <MoonOutlined /> : <SunOutlined />} aria-label="Mavzuni tanlash" />
      </Tooltip>
    </Dropdown>
  );
}

/** Profil sahifasidagi to'liq tanlov */
export function ThemeSegmented() {
  const { mode, setMode } = useThemeMode();
  return (
    <Segmented
      block
      value={mode}
      onChange={setMode}
      options={OPTIONS.map((o) => ({ value: o.key, label: o.label, icon: o.icon }))}
    />
  );
}
