import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { SCHEDULE_FILE_MAX_BYTES, decodeFilename, detectScheduleFileType } from '../scheduleFiles.js';
import { buildGroupTimetable, timetableColumns } from '../timetableGrid.js';
import { buildTimetableWorkbook } from '../excel.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN', 'DEAN', 'VICE_DEAN'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: SCHEDULE_FILE_MAX_BYTES } });

// Admin va dekan — barcha guruhlar; zam dekan — faqat o'ziga biriktirilganlar
const canManage = (user) => user.role === 'ADMIN' || user.role === 'DEAN';
const groupScope = (user) => (canManage(user) ? {} : { curatorId: user.id });

export const fileMeta = {
  id: true,
  filename: true,
  mimeType: true,
  size: true,
  note: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
};

const naturalSort = (a, b) => a.localeCompare(b, 'uz', { numeric: true, sensitivity: 'base' });
const cleanName = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const parseIds = (v) => [...new Set(String(v || '').split(',').map(Number).filter(Number.isInteger))];

function parseCourse(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : NaN;
}

async function parseCurator(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const user = await prisma.user.findFirst({ where: { id: Number(v), role: 'VICE_DEAN' }, select: { id: true } });
  return user ? user.id : NaN;
}

router.get('/', async (req, res) => {
  const groups = await prisma.group.findMany({
    where: groupScope(req.user),
    select: {
      id: true,
      name: true,
      course: true,
      timetableName: true,
      curator: { select: { id: true, fullName: true } },
      files: { select: fileMeta, orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { files: true } },
    },
  });
  const curators = canManage(req.user)
    ? await prisma.user.findMany({
        where: { role: 'VICE_DEAN' },
        select: { id: true, fullName: true, isActive: true },
        orderBy: { fullName: 'asc' },
      })
    : [];
  res.json({
    canManage: canManage(req.user),
    curators,
    timetableColumns: canManage(req.user) ? await timetableColumns() : [],
    groups: groups
      .sort((a, b) => (a.course ?? 99) - (b.course ?? 99) || naturalSort(a.name, b.name))
      .map(({ files, _count, ...g }) => ({ ...g, latestFile: files[0] ?? null, filesCount: _count.files })),
  });
});

router.post('/', requireRole('ADMIN', 'DEAN'), async (req, res) => {
  const name = cleanName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Guruh nomini kiriting' });
  const course = parseCourse(req.body?.course);
  if (Number.isNaN(course)) return res.status(400).json({ error: "Kurs 1–6 oralig'ida bo'lishi kerak" });
  const curatorId = await parseCurator(req.body?.curatorId);
  if (Number.isNaN(curatorId)) return res.status(400).json({ error: 'Zam dekan topilmadi' });
  if (await prisma.group.findUnique({ where: { name } })) {
    return res.status(409).json({ error: 'Bunday nomli guruh mavjud' });
  }
  const timetableName = cleanName(req.body?.timetableName) || null;
  const group = await prisma.group.create({
    data: { name, course: course ?? null, curatorId: curatorId ?? null, timetableName },
  });
  res.status(201).json({ group });
});

router.patch('/:id', requireRole('ADMIN', 'DEAN'), async (req, res) => {
  const id = Number(req.params.id);
  const data = {};
  if (req.body?.name !== undefined) {
    data.name = cleanName(req.body.name);
    if (!data.name) return res.status(400).json({ error: "Guruh nomi bo'sh bo'lmasligi kerak" });
    const other = await prisma.group.findUnique({ where: { name: data.name } });
    if (other && other.id !== id) return res.status(409).json({ error: 'Bunday nomli guruh mavjud' });
  }
  const course = parseCourse(req.body?.course);
  if (Number.isNaN(course)) return res.status(400).json({ error: "Kurs 1–6 oralig'ida bo'lishi kerak" });
  if (course !== undefined) data.course = course;
  const curatorId = await parseCurator(req.body?.curatorId);
  if (Number.isNaN(curatorId)) return res.status(400).json({ error: 'Zam dekan topilmadi' });
  if (curatorId !== undefined) data.curatorId = curatorId;
  if (req.body?.timetableName !== undefined) data.timetableName = cleanName(req.body.timetableName) || null;

  const result = await prisma.group.updateMany({ where: { id }, data });
  if (!result.count) return res.status(404).json({ error: 'Guruh topilmadi' });
  res.json({ ok: true });
});

router.delete('/:id', requireRole('ADMIN', 'DEAN'), async (req, res) => {
  const result = await prisma.group.deleteMany({ where: { id: Number(req.params.id) } });
  if (!result.count) return res.status(404).json({ error: 'Guruh topilmadi' });
  // Hech qaysi guruhga tegishli bo'lmay qolgan fayllar ham o'chiriladi
  await prisma.scheduleFile.deleteMany({ where: { groups: { none: {} } } });
  res.json({ ok: true });
});

/** ?groupIds=1,2 — ruxsat etilgan guruhlar, so'rovdagi tartibda */
async function scopedGroups(req, res) {
  const ids = parseIds(req.query.groupIds);
  if (!ids.length) {
    res.status(400).json({ error: 'Kamida bitta guruhni tanlang' });
    return null;
  }
  const groups = await prisma.group.findMany({
    where: { id: { in: ids }, ...groupScope(req.user) },
    select: { id: true, name: true, timetableName: true },
  });
  if (groups.length !== ids.length) {
    res.status(403).json({ error: "Tanlangan guruhlardan ba'zilari sizga biriktirilmagan" });
    return null;
  }
  return ids.map((id) => groups.find((g) => g.id === id));
}

// Import qilingan umumiy jadvaldan tanlangan guruhlar uchun Excel ko'rinishidagi jadval
router.get('/timetable', async (req, res) => {
  const groups = await scopedGroups(req, res);
  if (groups) res.json(await buildGroupTimetable(groups));
});

router.get('/timetable/xlsx', async (req, res) => {
  const groups = await scopedGroups(req, res);
  if (!groups) return;
  const grid = await buildGroupTimetable(groups);
  const title = cleanName(req.query.title).slice(0, 200) || `Dars jadvali: ${grid.columns.join(', ')}`;
  const buffer = await buildTimetableWorkbook({ ...grid, title });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="dars-jadvali.xlsx"');
  res.send(Buffer.from(buffer));
});

// Guruhga yuborilgan barcha jadvallar (eng yangisi birinchi)
router.get('/:id/files', async (req, res) => {
  const group = await prisma.group.findFirst({
    where: { id: Number(req.params.id), ...groupScope(req.user) },
    select: { id: true, name: true },
  });
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  const files = await prisma.scheduleFile.findMany({
    where: { groups: { some: { id: group.id } } },
    select: { ...fileMeta, groups: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ group, files });
});

/**
 * Jadvalni bir yoki bir nechta guruhga yuborish.
 * body: file (rasm / PDF / Excel), groupIds = "1,2,3", note (ixtiyoriy)
 */
router.post('/files', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Fayl hajmi ${SCHEDULE_FILE_MAX_BYTES / 1024 / 1024} MB dan oshmasligi kerak` });
    }
    next(err);
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Faylni tanlang' });
  const filename = decodeFilename(req.file.originalname).slice(0, 200);
  const mimeType = detectScheduleFileType(filename, req.file.buffer);
  if (!mimeType) {
    return res.status(400).json({ error: 'Faqat rasm (PNG, JPG, WEBP), PDF yoki Excel (XLSX, XLS) fayl qabul qilinadi' });
  }

  const ids = parseIds(req.body.groupIds);
  if (!ids.length) return res.status(400).json({ error: 'Kamida bitta guruhni tanlang' });
  const allowed = await prisma.group.count({ where: { id: { in: ids }, ...groupScope(req.user) } });
  if (allowed !== ids.length) {
    return res.status(403).json({ error: "Tanlangan guruhlardan ba'zilari sizga biriktirilmagan" });
  }

  const file = await prisma.scheduleFile.create({
    data: {
      filename,
      mimeType,
      size: req.file.size,
      data: req.file.buffer,
      note: cleanName(req.body.note).slice(0, 300) || null,
      uploadedById: req.user.id,
      groups: { connect: ids.map((id) => ({ id })) },
    },
    select: fileMeta,
  });
  res.status(201).json({ file, groupsCount: ids.length });
});

/** Faylni havola sifatida ulashish (Telegram uchun): ochiq havola tokeni qaytaradi */
router.post('/shared', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Fayl hajmi ${SCHEDULE_FILE_MAX_BYTES / 1024 / 1024} MB dan oshmasligi kerak` });
    }
    next(err);
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Faylni tanlang' });
  const filename = decodeFilename(req.file.originalname).slice(0, 200);
  const mimeType = detectScheduleFileType(filename, req.file.buffer);
  if (!mimeType) return res.status(400).json({ error: 'Fayl turi qabul qilinmaydi' });
  const { token } = await prisma.sharedFile.create({
    data: {
      token: randomBytes(16).toString('hex'),
      filename,
      mimeType,
      size: req.file.size,
      data: req.file.buffer,
      uploadedById: req.user.id,
    },
    select: { token: true },
  });
  res.status(201).json({ token });
});

router.delete('/files/:id', async (req, res) => {
  const file = await prisma.scheduleFile.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, uploadedById: true },
  });
  if (!file) return res.status(404).json({ error: 'Fayl topilmadi' });
  if (!canManage(req.user) && file.uploadedById !== req.user.id) {
    return res.status(403).json({ error: "Faqat o'zingiz yuborgan faylni o'chira olasiz" });
  }
  await prisma.scheduleFile.delete({ where: { id: file.id } });
  res.json({ ok: true });
});

export default router;
