export const DAYS = [
  { n: 1, short: 'Du', name: 'Dushanba' },
  { n: 2, short: 'Se', name: 'Seshanba' },
  { n: 3, short: 'Ch', name: 'Chorshanba' },
  { n: 4, short: 'Pa', name: 'Payshanba' },
  { n: 5, short: 'Ju', name: 'Juma' },
  { n: 6, short: 'Sh', name: 'Shanba' },
  { n: 7, short: 'Ya', name: 'Yakshanba' },
];

export const dayName = (n) => DAYS.find((d) => d.n === n)?.name ?? '';

/** JS Date -> 1 (Dushanba) .. 7 (Yakshanba) */
export const isoDay = (date = new Date()) => (date.getDay() === 0 ? 7 : date.getDay());

export const WEEK_LABEL = { ODD: 'Toq hafta', EVEN: 'Juft hafta' };

const SEMESTER_START = import.meta.env.VITE_SEMESTER_START;

/** Semestr boshidan hisoblab joriy hafta toq yoki juftligini aniqlaydi. Sozlanmagan bo'lsa null. */
export function currentWeekParity(date = new Date()) {
  if (!SEMESTER_START) return null;
  const start = new Date(`${SEMESTER_START}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const monday = new Date(start);
  monday.setDate(start.getDate() - (isoDay(start) - 1));
  const weeks = Math.floor((date - monday) / (7 * 24 * 3600 * 1000));
  if (weeks < 0) return null;
  return weeks % 2 === 0 ? 'ODD' : 'EVEN';
}

/** Dars shu hafta bo'ladimi (hafta turi bo'yicha) */
export const occursThisWeek = (lesson, parity) =>
  lesson.weekType === 'ALL' || !parity || lesson.weekType === parity;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Bugungi darslar ichida hozirgi va keyingi darsni topadi */
export function lessonStatus(lesson, now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(lesson.startTime);
  const end = toMinutes(lesson.endTime);
  if (mins >= end) return 'past';
  if (mins >= start) return 'now';
  return 'upcoming';
}

export function minutesUntil(hhmm, now = new Date()) {
  return toMinutes(hhmm) - (now.getHours() * 60 + now.getMinutes());
}

export function formatDuration(mins) {
  if (mins < 60) return `${mins} daqiqa`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

export function groupByDay(lessons) {
  const map = new Map(DAYS.map((d) => [d.n, []]));
  for (const l of lessons) map.get(l.dayOfWeek)?.push(l);
  return map;
}

// Brauzerlar uz-UZ lokalini turlicha qo'llaydi ("M10 13"), shuning uchun oy nomlari qo'lda
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

const pad = (n) => String(n).padStart(2, '0');

export const formatDate = (date) => `${date.getDate()}-${MONTHS[date.getMonth()]}`;

export const formatDateTime = (iso) => {
  const d = new Date(iso);
  return `${formatDate(d)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Dars turi -> antd preset rang nomi (Tag color va token palitrasi uchun)
export const TYPE_COLORS = {
  "Ma'ruza": 'blue',
  Amaliy: 'green',
  Seminar: 'gold',
  Laboratoriya: 'purple',
};
