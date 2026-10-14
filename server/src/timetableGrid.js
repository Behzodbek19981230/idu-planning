import { prisma } from './db.js';
import { lessonGroups, lessonOrder, lessonSelect } from './routes/teacher.js';

const key = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const naturalSort = (a, b) => a.localeCompare(b, 'uz', { numeric: true, sensitivity: 'base' });

// Excel'dagi kabi qisqa belgi: "Fan (A)"
const TYPE_SHORT = { "Ma'ruza": 'M', Amaliy: 'A', Seminar: 'S', Laboratoriya: 'L' };

/** Import qilingan jadvaldagi barcha guruh ustunlari — guruhni bog'lash uchun tanlov ro'yxati */
export async function timetableColumns() {
  const lessons = await prisma.lesson.findMany({ select: { groups: true, groupName: true, sheetName: true } });
  const map = new Map();
  for (const l of lessons) for (const g of lessonGroups(l)) if (!map.has(g.name)) map.set(g.name, g.sheet);
  return [...map]
    .map(([name, sheet]) => ({ name, sheet }))
    .sort((a, b) => naturalSort(a.sheet, b.sheet) || naturalSort(a.name, b.name));
}

/**
 * Tanlangan guruhlar uchun Excel ko'rinishidagi jadval:
 * ustunlar — guruhlar, qatorlar — kun × juftlik. Bir nechta yonma-yon guruhga
 * birgalikda o'tiladigan dars bitta birlashtirilgan katakda turadi.
 *
 * Natija: { columns: [nom], days: [{ day, rows: [{ startTime, endTime, pairNumber, cells: [{ span, lessons }] }] }], missing: [nom] }
 */
export async function buildGroupTimetable(groups) {
  const columns = groups.map((g) => g.name);
  const colsByName = new Map();
  groups.forEach((g, i) => {
    if (!g.timetableName) return;
    const k = key(g.timetableName);
    colsByName.set(k, [...(colsByName.get(k) ?? []), i]);
  });

  const all = await prisma.lesson.findMany({
    select: { ...lessonSelect, groups: true, teacher: { select: { fullName: true, scheduleName: true, position: true } } },
    orderBy: lessonOrder,
  });

  const lessons = [];
  for (const l of all) {
    const cols = [...new Set(lessonGroups(l).flatMap((g) => colsByName.get(key(g.name)) ?? []))];
    if (!cols.length) continue;
    lessons.push({
      cols: new Set(cols),
      day: l.dayOfWeek,
      slot: `${l.startTime}-${l.endTime}`,
      lesson: {
        id: l.id,
        subject: l.subject,
        type: TYPE_SHORT[l.lessonType] ?? l.lessonType,
        weekType: l.weekType,
        teacher: [l.teacher.position, l.teacher.scheduleName || l.teacher.fullName].filter(Boolean).join(' '),
        room: l.room,
        building: l.building,
      },
    });
  }

  const slotMap = new Map();
  for (const l of all) {
    const k = `${l.startTime}-${l.endTime}`;
    if (lessons.some((x) => x.slot === k) && !slotMap.has(k)) {
      slotMap.set(k, { startTime: l.startTime, endTime: l.endTime, pairNumber: l.pairNumber });
    }
  }
  const slots = [...slotMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  // Darsi yo'q kun chiqarilmaydi — PDF'da bo'sh sahifa bo'lib qolmasin
  const days = [...new Set(lessons.map((l) => l.day))].sort((a, b) => a - b);

  const weekOrder = { ODD: 0, ALL: 1, EVEN: 2 };
  const grid = days.map((day) => ({
    day,
    rows: slots.map((slot) => {
      const here = lessons.filter((l) => l.day === day && l.slot === `${slot.startTime}-${slot.endTime}`);
      const perCol = columns.map((_, i) =>
        here
          .filter((l) => l.cols.has(i))
          .map((l) => l.lesson)
          .sort((a, b) => weekOrder[a.weekType] - weekOrder[b.weekType])
      );
      const cells = [];
      for (const list of perCol) {
        const id = list.map((l) => l.id).join(',');
        const last = cells[cells.length - 1];
        if (id && last?.id === id) last.span++;
        else cells.push({ id, span: 1, lessons: list });
      }
      return { ...slot, cells: cells.map(({ span, lessons: ls }) => ({ span, lessons: ls })) };
    }),
  }));

  const covered = new Set(lessons.flatMap((l) => [...l.cols]));
  return {
    columns,
    days: grid,
    missing: groups.filter((_, i) => !covered.has(i)).map((g) => ({ name: g.name, linked: Boolean(g.timetableName) })),
  };
}
