import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import uzUZ from 'antd/locale/uz_UZ';

const STORAGE_KEY = 'idu_theme';
const ThemeContext = createContext(null);

const readMode = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** body foni, brauzer paneli rangi va color-scheme mavzuga mos bo'lishi uchun */
function GlobalColors({ dark }) {
  const { token } = theme.useToken();
  useEffect(() => {
    document.body.style.backgroundColor = token.colorBgLayout;
    document.body.style.color = token.colorText;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', token.colorBgContainer);
  }, [token, dark]);
  return null;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readMode);
  const [osDark, setOsDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setMode = (m) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* private rejim — faqat shu sessiya uchun */
    }
  };

  const dark = mode === 'dark' || (mode === 'system' && osDark);

  const themeConfig = useMemo(
    () => ({
      algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: '#4f46e5',
        borderRadius: 10,
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      },
      components: {
        Layout: { headerHeight: 56, headerPadding: '0 16px' },
        Card: { headerFontSize: 15 },
      },
    }),
    [dark]
  );

  return (
    <ThemeContext.Provider value={{ mode, setMode, dark }}>
      <ConfigProvider locale={uzUZ} theme={themeConfig}>
        <GlobalColors dark={dark} />
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeContext);
