export const ACTIONS = {
  LOGIN: { label: 'Kirish', color: 'green' },
  LOGIN_FAILED: { label: 'Xato kirish', color: 'red' },
  LOGOUT: { label: 'Chiqish', color: 'default' },
  PAGE_VIEW: { label: "Sahifa ko'rish", color: 'blue' },
};

const PAGES = [
  [/^\/$/, 'Bugun'],
  [/^\/week$/, 'Hafta'],
  [/^\/profile$/, 'Profil'],
  [/^\/groups$/, 'Guruhlar'],
  [/^\/admin$/, 'Asosiy'],
  [/^\/admin\/import$/, 'Import'],
  [/^\/admin\/teachers$/, "O'qituvchilar"],
  [/^\/admin\/teachers\/[^/]+$/, "O'qituvchi jadvali"],
  [/^\/admin\/schedule$/, 'Jadval'],
  [/^\/admin\/staff$/, 'Xodimlar'],
  [/^\/superadmin$/, 'Hisobotlar'],
  [/^\/superadmin\/logs$/, 'Loglar'],
];

/** Manzil -> sahifa nomi ("/admin/teachers/12" -> "O'qituvchi jadvali") */
export const pageLabel = (path) => (path ? PAGES.find(([re]) => re.test(path))?.[1] ?? null : null);

/** User-Agent dan qisqa tavsif: "Chrome · Android" */
export function deviceLabel(ua) {
  if (!ua) return '';
  const browser =
    (/Edg\//.test(ua) && 'Edge') ||
    (/OPR\/|Opera/.test(ua) && 'Opera') ||
    (/YaBrowser/.test(ua) && 'Yandex') ||
    (/Chrome\//.test(ua) && 'Chrome') ||
    (/Firefox\//.test(ua) && 'Firefox') ||
    (/Safari\//.test(ua) && 'Safari') ||
    ua.split(/[ /]/)[0];
  const os =
    (/Android/.test(ua) && 'Android') ||
    (/iPhone|iPad/.test(ua) && 'iOS') ||
    (/Windows/.test(ua) && 'Windows') ||
    (/Mac OS X/.test(ua) && 'macOS') ||
    (/Linux/.test(ua) && 'Linux') ||
    '';
  return os ? `${browser} · ${os}` : browser;
}
