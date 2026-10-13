import ExcelJS from 'exceljs';
import { PAIR_DURATION_MIN, PAIR_TIMES } from './config.js';

// Ustun nomlari (kichik harfda, bo'sh joylarsiz taqqoslanadi). O'zbek (lotin/kirill), rus va ingliz variantlari.
const COLUMN_ALIASES = {
  teacher: ["o'qituvchi", 'oqituvchi', 'ўқитувчи', 'укитувчи', 'преподаватель', 'teacher', 'fio', 'ф.и.о', 'domla'],
  day: ['kun', 'hafta kuni', 'кун', 'день', 'день недели', 'day'],
  pair: ['juftlik', 'para', 'juft', 'жуфтлик', 'пара', '№ пары', 'pair', 'nechanchi'],
  time: ['vaqt', 'vaqti', 'вақт', 'вақти', 'время', 'time'],
  start: ['boshlanish', 'boshlanishi', 'бошланиш', 'начало', 'start'],
  end: ['tugash', 'tugashi', 'тугаш', 'конец', 'окончание', 'end'],
  subject: ['fan', 'fan nomi', 'фан', 'предмет', 'дисциплина', 'subject'],
  group: ['guruh', 'гуруҳ', 'гурух', 'группа', 'group'],
  room: ['xona', 'auditoriya', 'хона', 'аудитория', 'ауд', 'room'],
  building: ['bino', 'korpus', 'бино', 'корпус', 'здание', 'building'],
  lessonType: ['turi', 'dars turi', 'тури', 'тип', 'вид занятия', 'type'],
  weekType: ['hafta', 'hafta turi', 'ҳафта', 'неделя', 'week'],
};

const DAY_NAMES = {
  1: ['dushanba', 'dush', 'du', 'душанба', 'понедельник', 'пн', 'monday', 'mon'],
  2: ['seshanba', 'sesh', 'se', 'сешанба', 'вторник', 'вт', 'tuesday', 'tue'],
  3: ['chorshanba', 'chor', 'cho', 'чоршанба', 'среда', 'ср', 'wednesday', 'wed'],
  4: ['payshanba', 'pay', 'pa', 'пайшанба', 'четверг', 'чт', 'thursday', 'thu'],
  5: ['juma', 'ju', 'жума', 'пятница', 'пт', 'friday', 'fri'],
  6: ['shanba', 'sha', 'шанба', 'суббота', 'сб', 'saturday', 'sat'],
  7: ['yakshanba', 'yak', 'якшанба', 'воскресенье', 'вс', 'sunday', 'sun'],
};

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** ExcelJS katak qiymatini oddiy qiymatga aylantiradi (rich text, formula, hyperlink). */
function cellValue(cell) {
  let v = cell?.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) v = v.result;
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
    else if ('text' in v) v = v.text;
  }
  return v;
}

const asText = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

const pad = (n) => String(n).padStart(2, '0');

/** "8:30", "08.30", Date yoki Excel kasr soni (0.354) -> "08:30" */
function parseTime(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const mins = Math.round(v * 24 * 60);
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const m = String(v).match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** "08:30-09:50" kabi oraliqni ajratadi */
function parseTimeRange(v) {
  if (v instanceof Date || typeof v === 'number') return [parseTime(v), null];
  const parts = String(v ?? '').match(/\d{1,2}[:.]\d{2}/g) || [];
  return [parseTime(parts[0]), parseTime(parts[1])];
}

function parseDay(v) {
  if (typeof v === 'number' && v >= 1 && v <= 7) return v;
  if (v instanceof Date) return v.getUTCDay() === 0 ? 7 : v.getUTCDay();
  const s = norm(v).replace(/[.,]/g, '');
  if (/^[1-7]$/.test(s)) return Number(s);
  for (const [num, names] of Object.entries(DAY_NAMES)) {
    if (names.includes(s)) return Number(num);
  }
  // "Dushanba (1-smena)" kabi qo'shimchali qiymatlar uchun prefiks bo'yicha
  for (const [num, names] of Object.entries(DAY_NAMES)) {
    if (names.some((n) => n.length > 3 && s.startsWith(n))) return Number(num);
  }
  return null;
}

function parseWeekType(v) {
  const s = norm(v);
  if (!s) return 'ALL';
  if (/toq|тоқ|ток|нечет|odd|^1$/.test(s)) return 'ODD';
  if (/juft|жуфт|чет|even|^2$/.test(s)) return 'EVEN';
  return 'ALL';
}

function detectColumns(row) {
  const map = {};
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const h = norm(cellValue(cell)).replace(/[:*]/g, '').trim();
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (!map[key] && aliases.includes(h)) map[key] = col;
    }
  });
  return map;
}

/** Tekis format: har bir qator = bitta dars, "O'qituvchi" ustuni bor */
// Tekis formatda guruhlar tartibi — fayldagi birinchi uchrashi bo'yicha
function groupList(text, sheet, orderMap) {
  return text
    .split(/[,;]/)
    .map((g) => g.trim())
    .filter(Boolean)
    .map((name) => {
      if (!orderMap.has(name)) orderMap.set(name, orderMap.size + 1);
      return { name, sheet, col: orderMap.get(name) };
    });
}

function parseFlatSheet(ws, headerRow, cols, lessons, errors) {
  const flatGroupOrder = new Map();
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (key) => (cols[key] ? cellValue(row.getCell(cols[key])) : null);

    const teacherRaw = asText(get('teacher'));
    const subject = asText(get('subject'));
    const dayRaw = get('day');
    if (!teacherRaw && !subject && !asText(dayRaw)) continue; // bo'sh qator

    const where = `"${ws.name}" varag'i, ${r}-qator`;
    const rowErrors = [];

    if (!teacherRaw) rowErrors.push("o'qituvchi ko'rsatilmagan");
    if (!subject) rowErrors.push("fan ko'rsatilmagan");

    const day = parseDay(dayRaw);
    if (!day) rowErrors.push(`kun noto'g'ri: "${asText(dayRaw)}"`);

    const pair = Number.parseInt(asText(get('pair')), 10) || null;
    const [start, end] = resolveTime(get('start'), get('end'), cols.time ? get('time') : null, pair);
    if (!start || !end) rowErrors.push('vaqt aniqlanmadi (vaqt yoki juftlik raqamini kiriting)');

    if (rowErrors.length) {
      errors.push({ where, message: rowErrors.join('; ') });
      continue;
    }

    // Bir katakda bir nechta o'qituvchi ";" bilan ajratilgan bo'lishi mumkin
    for (const teacherName of teacherRaw.split(';').map(asText).filter(Boolean)) {
      lessons.push({
        teacherName,
        teacherTitle: null,
        dayOfWeek: day,
        pairNumber: pair,
        startTime: start,
        endTime: end,
        subject,
        groupName: asText(get('group')) || null,
        room: asText(get('room')) || null,
        building: asText(get('building')) || null,
        lessonType: asText(get('lessonType')) || null,
        weekType: parseWeekType(get('weekType')),
        sheetName: ws.name,
        groups: groupList(asText(get('group')), ws.name, flatGroupOrder),
      });
    }
  }
}

function resolveTime(startRaw, endRaw, rangeRaw, pair) {
  let start = parseTime(startRaw);
  let end = parseTime(endRaw);
  if ((!start || !end) && rangeRaw != null) {
    const [s, e] = parseTimeRange(rangeRaw);
    start ||= s;
    end ||= e;
  }
  if ((!start || !end) && pair && PAIR_TIMES[pair]) {
    start ||= PAIR_TIMES[pair][0];
    end ||= PAIR_TIMES[pair][1];
  }
  if (start && !end) end = addMinutes(start, PAIR_DURATION_MIN);
  return [start, end];
}

// ---------- To'r (grid) format ----------
// Ustunlar: Kun | Juftlik | Vaqti | <guruh1> | <guruh2> ...
// Katak: "Fan nomi (A)\nkat.o'qit R.Sobirov\nXona: 401". Ma'ruzalar bir nechta guruh ustida birlashtirilgan (merge).

const LESSON_TYPES = {
  m: "Ma'ruza", a: 'Amaliy', s: 'Seminar', l: 'Laboratoriya', lab: 'Laboratoriya', t: 'Trening',
  л: "Ma'ruza", лк: "Ma'ruza", п: 'Amaliy', пр: 'Amaliy', с: 'Seminar', лаб: 'Laboratoriya',
};
// Faqat ma'lum tur belgilari — "(RU)" kabi qavslar fan nomining bir qismi bo'lib qoladi
const TYPE_CODES = 'lab|лаб|лк|пр|[masltлпс]';
const SKIP_CELL = /mustaqil|самостоят|bo'sh|kutubxona/i;
const UP = "A-ZА-ЯЁЎҚҒҲ";
const LOW = "a-zа-яёўқғҳ";
const APOS = "'ʻʼ‘’`´";
// "R.Sobirov", "Sh.Siddiqova", "O'.Begulov", "R.A.Sobirov" — qator oxirida
const TEACHER_RE = new RegExp(
  `((?:[${UP}][${LOW}]?[${APOS}]?\\.\\s*){1,2}[${UP}][^\\s.,;()]+(?:\\s*[${UP}]\\.)?)\\s*$`,
  'u'
);
const ROOM_RE = /^(?:xona|хона|ауд(?:итория)?|aud(?:itoriya)?)\s*[:.№-]?\s*(.+)$/i;
const SUBJECT_TYPE_RE = new RegExp(`\\(\\s*(${TYPE_CODES})\\s*\\)\\s*$`, 'iu');

// Katak matni Alt+Enter bilan qatorlarga bo'linmagan bo'lsa ham ishlashi uchun:
// "(A)" dan keyin va "Xona:" oldidan majburan yangi qator qo'yamiz
const SPLIT_AFTER_TYPE_RE = new RegExp(`(\\(\\s*(?:${TYPE_CODES})\\s*\\))\\s+(?=\\S)`, 'giu');
const SPLIT_BEFORE_ROOM_RE = /\s+(?=(?:xona|хона|ауд|aud)\s*[:.№])/gi;

const cellLines = (v) =>
  String(v ?? '')
    .replace(SPLIT_AFTER_TYPE_RE, '$1\n')
    .replace(SPLIT_BEFORE_ROOM_RE, '\n')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

function parseTeacherLine(line) {
  const m = line.match(TEACHER_RE);
  if (!m) return null;
  const name = m[1].replace(/\s+/g, '').replace(/[ʻʼ‘’`´]/g, "'");
  const title = line.slice(0, m.index).trim().replace(/[,:]$/, '') || null;
  return { name, title };
}

/** Bitta katak matnini darslarga ajratadi (katakda bir nechta kichik guruh bo'lishi mumkin) */
function parseGridCell(text) {
  const lines = cellLines(text);
  if (!lines.length || lines.every((l) => SKIP_CELL.test(l))) return { items: [], skipped: true };

  const items = [];
  let cur = null;
  let lastSubject = null;
  let part = 0; // "/" dan keyingi qism (toq/juft hafta)
  const flush = () => {
    if (cur && cur.teacher) items.push({ ...cur, part });
    cur = null;
  };

  for (const line of lines) {
    // "Dars A / Dars B" — toq va juft haftalarda navbatlashadigan darslar
    if (/^[/\\|]+$/.test(line)) {
      flush();
      part++;
      lastSubject = null;
      continue;
    }
    const room = line.match(ROOM_RE);
    if (room) {
      if (cur) cur.room = room[1].trim();
      flush();
      continue;
    }
    const teacher = !SUBJECT_TYPE_RE.test(line) && parseTeacherLine(line);
    if (teacher) {
      if (!cur) cur = { subject: lastSubject };
      if (cur.teacher) {
        // Bitta fanga ikkinchi o'qituvchi — alohida dars sifatida
        const prev = cur;
        flush();
        cur = { subject: prev.subject, lessonType: prev.lessonType };
      }
      cur.teacher = teacher;
      continue;
    }
    // Aks holda bu fan nomi. Uzun nom bir necha qatorga bo'lingan bo'lishi mumkin:
    // "Boshlang'ich dasturlash va" + "muammolarni yechish (A)"
    const continuing = cur && !cur.teacher && !cur.lessonType;
    if (!continuing) flush();
    const t = line.match(SUBJECT_TYPE_RE);
    const chunk = t ? line.slice(0, t.index).trim() : line;
    cur = {
      subject: continuing ? `${cur.subject} ${chunk}`.trim() : chunk,
      lessonType: t ? LESSON_TYPES[t[1].toLowerCase()] || t[1] : null,
    };
    lastSubject = cur.subject;
  }
  flush();
  const alternating = part > 0;
  return {
    items: items
      .filter((i) => i.subject)
      .map((i) => ({ ...i, weekType: alternating ? (i.part === 0 ? 'ODD' : 'EVEN') : 'ALL' })),
    skipped: false,
  };
}

function detectGridHeader(row) {
  const cols = {};
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const h = norm(cellValue(cell)).replace(/[:*]/g, '').trim();
    if (!cols.day && COLUMN_ALIASES.day.includes(h)) cols.day = col;
    else if (!cols.pair && COLUMN_ALIASES.pair.includes(h)) cols.pair = col;
    else if (!cols.time && COLUMN_ALIASES.time.includes(h)) cols.time = col;
  });
  return cols.day && (cols.pair || cols.time) ? cols : null;
}

function readGroups(ws, headerRow, cols) {
  const firstGroupCol = Math.max(cols.day, cols.pair || 0, cols.time || 0) + 1;
  const header = ws.getRow(headerRow);
  const groups = new Map(); // ustun -> guruh nomi
  for (let c = firstGroupCol; c <= ws.columnCount; c++) {
    const name = asText(cellValue(header.getCell(c)));
    if (name) groups.set(c, name);
  }
  return groups;
}

// "Xonalar bandligi" kabi varaqlar: ustunlarda guruh emas, xona raqamlari — darslar takrorlanmasligi uchun o'tkaziladi
const ROOM_SHEET_NAME_RE = /xona|хона|bandlig|аудитор|auditor/i;
function looksLikeRoomSheet(ws, groups) {
  if (ROOM_SHEET_NAME_RE.test(ws.name)) return true;
  const names = [...groups.values()];
  const numeric = names.filter((n) => /^\d{2,4}\s*[a-zа-я]?$/i.test(n)).length;
  return names.length > 0 && numeric / names.length >= 0.6;
}

function parseGridSheet(ws, headerRow, initialCols, lessons, errors) {
  let cols = initialCols;
  let groups = readGroups(ws, headerRow, cols);
  if (looksLikeRoomSheet(ws, groups)) return false;

  let lastDay = null;
  let blockOffset = 0; // varaqdagi har bir blok ustunlari alohida tartiblanadi
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    // Bitta varaqda bir nechta jadval bloki bo'lishi mumkin (masalan, 3-kurs va 4-kurs) — yangi sarlavha
    const again = detectGridHeader(row);
    if (again) {
      cols = again;
      blockOffset += 1000;
      groups = readGroups(ws, r, cols);
      lastDay = null;
      continue;
    }

    const dayRaw = cellValue(row.getCell(cols.day));
    const day = parseDay(dayRaw) || (asText(dayRaw) ? null : lastDay);
    if (asText(dayRaw) && !day) continue; // masalan, imzo/izoh qatori
    lastDay = day;
    if (!day) continue;

    const pair = cols.pair ? Number.parseInt(asText(cellValue(row.getCell(cols.pair))), 10) || null : null;
    const timeRaw = cols.time ? cellValue(row.getCell(cols.time)) : null;
    if (!pair && !asText(timeRaw)) continue; // sarlavha/izoh qatori, dars qatori emas
    const [start, end] = resolveTime(null, null, timeRaw, pair);

    // Birlashtirilgan kataklar: master manzili bo'yicha guruhlarni yig'amiz
    const cells = new Map(); // master address -> { text, groups[], address }
    for (const [c, groupName] of groups) {
      const cell = row.getCell(c);
      const master = cell.isMerged ? cell.master : cell;
      const text = cellValue(master);
      if (!asText(text)) continue;
      const entry = cells.get(master.address) || { text, groups: [], cols: [], address: master.address };
      entry.groups.push(groupName);
      entry.cols.push(c);
      cells.set(master.address, entry);
    }
    if (!cells.size) continue;

    for (const { text, groups: cellGroups, cols: cellCols, address } of cells.values()) {
      const where = `"${ws.name}" varag'i, ${address} katak`;
      const { items, skipped } = parseGridCell(text);
      if (skipped) continue;
      if (!items.length) {
        errors.push({ where, message: `o'qituvchi aniqlanmadi: "${asText(text).slice(0, 80)}"` });
        continue;
      }
      if (!start || !end) {
        errors.push({ where, message: 'vaqt aniqlanmadi' });
        continue;
      }
      for (const it of items) {
        lessons.push({
          teacherName: it.teacher.name,
          teacherTitle: it.teacher.title,
          dayOfWeek: day,
          pairNumber: pair,
          startTime: start,
          endTime: end,
          subject: it.subject,
          groupName: cellGroups.join(', '),
          room: it.room || null,
          building: null,
          lessonType: it.lessonType || null,
          weekType: it.weekType,
          sheetName: ws.name,
          groups: cellGroups.map((name, i) => ({ name, sheet: ws.name, col: blockOffset + cellCols[i] })),
        });
      }
    }
  }
  return true;
}

const joinUnique = (a, b) =>
  [...new Set([...(a || '').split(', '), ...(b || '').split(', ')].filter(Boolean))].join(', ') || null;

/** Bir xil dars (o'qituvchi, vaqt, fan, xona) bir necha katakda bo'lsa — guruhlarni birlashtiradi */
function mergeDuplicates(lessons) {
  const map = new Map();
  for (const l of lessons) {
    const key = [norm(l.teacherName), l.dayOfWeek, l.startTime, norm(l.subject), norm(l.room), l.weekType].join('|');
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...l, groups: [...(l.groups || [])] });
      continue;
    }
    // Birgalikda o'tiladigan dars (potok): guruhlar va kurslar birlashtiriladi
    prev.groupName = joinUnique(prev.groupName, l.groupName);
    prev.sheetName = joinUnique(prev.sheetName, l.sheetName);
    for (const g of l.groups || []) {
      if (!prev.groups.some((x) => x.sheet === g.sheet && x.name === g.name)) prev.groups.push(g);
    }
  }
  return [...map.values()];
}

/**
 * Excel faylini o'qiydi va dars qatorlarini qaytaradi. Barcha varaqlar ko'rib chiqiladi.
 * Ikki format avtomatik aniqlanadi:
 *  1) tekis — har bir qator bitta dars ("O'qituvchi", "Kun", "Fan" ... ustunlari);
 *  2) to'r — "Kun | Juftlik | Vaqti | guruhlar..." , kataklarda fan/o'qituvchi/xona.
 */
export async function parseScheduleWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const lessons = [];
  const errors = [];
  let sheetsWithHeader = 0;
  const skippedSheets = [];

  wb.eachSheet((ws) => {
    for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const flat = detectColumns(row);
      if (flat.teacher && flat.subject && flat.day) {
        sheetsWithHeader++;
        parseFlatSheet(ws, r, flat, lessons, errors);
        return;
      }
      const grid = detectGridHeader(row);
      if (grid) {
        if (parseGridSheet(ws, r, grid, lessons, errors)) sheetsWithHeader++;
        else skippedSheets.push(ws.name);
        return;
      }
    }
  });

  if (!sheetsWithHeader) {
    errors.unshift({
      where: 'Fayl',
      message:
        "Sarlavha qatori topilmadi. Jadvalda \"Kun\", \"Juftlik\"/\"Vaqti\" ustunlari (to'r format) yoki \"O'qituvchi\", \"Kun\", \"Fan\" ustunlari (tekis format) bo'lishi kerak.",
    });
  }

  return { lessons: mergeDuplicates(lessons), errors, skippedSheets };
}

/** Admin uchun namunaviy shablon fayl */
export async function buildTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Dars jadvali');
  ws.columns = [
    { header: "O'qituvchi", key: 'teacher', width: 32 },
    { header: 'Kun', key: 'day', width: 14 },
    { header: 'Juftlik', key: 'pair', width: 9 },
    { header: 'Boshlanish', key: 'start', width: 12 },
    { header: 'Tugash', key: 'end', width: 10 },
    { header: 'Fan', key: 'subject', width: 34 },
    { header: 'Guruh', key: 'group', width: 14 },
    { header: 'Xona', key: 'room', width: 10 },
    { header: 'Bino', key: 'building', width: 16 },
    { header: 'Turi', key: 'type', width: 12 },
    { header: 'Hafta', key: 'week', width: 10 },
  ];
  ws.addRows([
    { teacher: 'Karimov Alisher Bahodirovich', day: 'Dushanba', pair: 1, start: '08:30', end: '09:50', subject: 'Oliy matematika', group: 'KI-21', room: '204', building: '1-bino', type: "Ma'ruza", week: '' },
    { teacher: 'Karimov Alisher Bahodirovich', day: 'Dushanba', pair: 2, start: '', end: '', subject: 'Oliy matematika', group: 'KI-22', room: '310', building: '1-bino', type: 'Amaliy', week: 'toq' },
    { teacher: 'Rahimova Dilnoza Akramovna', day: 'Seshanba', pair: 3, start: '11:30', end: '12:50', subject: 'Ingliz tili', group: 'IQ-11', room: '105', building: '2-bino', type: 'Amaliy', week: 'juft' },
  ]);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const help = wb.addWorksheet("Yo'riqnoma");
  help.getColumn(1).width = 110;
  [
    "Har bir qator — bitta dars. Majburiy ustunlar: O'qituvchi, Kun, Fan va (Juftlik yoki Boshlanish/Tugash).",
    'Kun: Dushanba..Shanba (lotin/kirill/rus) yoki 1..7.',
    "Vaqt bo'sh qolsa, juftlik raqami bo'yicha standart vaqt qo'yiladi: 1) 08:30–09:50, 2) 10:00–11:20, 3) 11:30–12:50, 4) 13:30–14:50, 5) 15:00–16:20, 6) 16:30–17:50.",
    "Hafta: bo'sh = har hafta, 'toq' yoki 'juft'.",
    "O'qituvchi F.I.Sh. tizimdagi o'qituvchi bilan bir xil yozilishi kerak. Yangi ism uchun avtomatik login/parol yaratiladi.",
    "Bir darsni bir nechta o'qituvchi o'tsa, ismlarni ';' bilan ajrating.",
  ].forEach((t) => help.addRow([t]));

  return wb.xlsx.writeBuffer();
}

const STATUS_TEXT = {
  changed: "O'qituvchi o'zi o'zgartirgan",
  unknown: "Saqlanmagan — parolni tiklang",
};

/** O'qituvchilar login/parollari — admin chop etishi yoki tarqatishi uchun */
export async function buildCredentialsWorkbook(rows, site) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Login va parollar", {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  const columns = [
    { header: '№', key: 'n', width: 5 },
    { header: "F.I.Sh.", key: 'fullName', width: 32 },
    { header: 'Unvon', key: 'position', width: 14 },
    { header: 'Jadvaldagi nomi', key: 'scheduleName', width: 18 },
    { header: 'Login', key: 'username', width: 18 },
    { header: 'Parol', key: 'password', width: 30 },
    { header: 'Holat', key: 'active', width: 12 },
    { header: 'Darslar', key: 'lessons', width: 9 },
  ];
  ws.columns = columns.map(({ key, width }) => ({ key, width }));

  const last = String.fromCharCode(64 + columns.length);
  ws.mergeCells(`A1:${last}1`);
  ws.getCell('A1').value = "O'qituvchilar uchun login va parollar";
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  ws.mergeCells(`A2:${last}2`);
  ws.getCell('A2').value = [
    `Sana: ${new Date().toLocaleDateString('ru-RU')}`,
    site && `Kirish manzili: ${site}`,
    "Birinchi kirishdan keyin parolni Profil bo'limida o'zgartirish tavsiya etiladi.",
  ]
    .filter(Boolean)
    .join('   ·   ');
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } };

  const headerRow = ws.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } };
  });

  rows.forEach((r, i) => {
    const row = ws.addRow({
      n: i + 1,
      fullName: r.fullName,
      position: r.position || '',
      scheduleName: r.scheduleName && r.scheduleName !== r.fullName ? r.scheduleName : '',
      username: r.username,
      password: r.password || STATUS_TEXT[r.status] || STATUS_TEXT.unknown,
      active: r.isActive ? 'Faol' : 'Bloklangan',
      lessons: r.lessonsCount,
    });
    const mono = { name: 'Consolas', size: 11 };
    row.getCell('username').font = mono;
    row.getCell('password').font = r.password ? { ...mono, bold: true } : { italic: true, color: { argb: 'FF94A3B8' } };
    if (!r.isActive) row.getCell('active').font = { color: { argb: 'FFDC2626' } };
  });

  const thin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
  for (let r = 4; r <= ws.rowCount; r++) {
    ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
      c.border = { top: thin, left: thin, bottom: thin, right: thin };
    });
  }
  ws.autoFilter = { from: 'A4', to: `${last}4` };
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  ws.pageSetup.printTitlesRow = '4:4';

  return wb.xlsx.writeBuffer();
}
