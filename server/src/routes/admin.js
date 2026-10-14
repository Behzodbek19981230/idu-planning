import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { buildCredentialsWorkbook, buildTemplateWorkbook, parseScheduleWorkbook } from '../excel.js';
import { baseUsername, generatePassword } from '../credentials.js';
import { decrypt, encrypt } from '../secret.js';
import { lessonOrder, lessonSelect } from './teacher.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.xlsx$/i.test(file.originalname)),
});

/** Parolni bcrypt hash va shifrlangan boshlang'ich parol sifatida saqlash uchun maydonlar */
const passwordFields = async (password) => ({
  passwordHash: await bcrypt.hash(password, 10),
  initialPassword: encrypt(password),
  passwordChanged: false,
});

const passwordStatus = (t) => (t.passwordChanged ? 'changed' : t.initialPassword ? 'initial' : 'unknown');

const nameKey = (s) => s.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'").replace(/\s+/g, ' ').trim();

function uniqueUsername(fullName, taken) {
  const base = baseUsername(fullName);
  let candidate = base;
  for (let i = 2; taken.has(candidate); i++) candidate = `${base}${i}`;
  taken.add(candidate);
  return candidate;
}

// ---------- Statistika ----------

router.get('/stats', async (_req, res) => {
  const [teachers, lessons, lastUpload] = await Promise.all([
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.lesson.count(),
    prisma.upload.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { fullName: true } } },
    }),
  ]);
  res.json({ teachers, lessons, lastUpload });
});

// ---------- O'qituvchilar ----------

router.get('/teachers', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const teachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { scheduleName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true,
      fullName: true,
      scheduleName: true,
      position: true,
      username: true,
      isActive: true,
      createdAt: true,
      initialPassword: true,
      passwordChanged: true,
      _count: { select: { lessons: true } },
    },
    orderBy: { fullName: 'asc' },
  });
  // Qidiruvdan qat'i nazar — paroli saqlanmagan barcha o'qituvchilar soni
  const missingPasswords = await prisma.user.count({
    where: { role: 'TEACHER', initialPassword: null, passwordChanged: false },
  });
  res.json({
    missingPasswords,
    teachers: teachers.map(({ _count, initialPassword, passwordChanged, ...t }) => ({
      ...t,
      lessonsCount: _count.lessons,
      passwordStatus: passwordStatus({ initialPassword, passwordChanged }),
    })),
  });
});

// Login/parollar ro'yxati Excel fayl ko'rinishida
router.get('/teachers/export', async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: {
      fullName: true,
      scheduleName: true,
      position: true,
      username: true,
      isActive: true,
      initialPassword: true,
      passwordChanged: true,
      _count: { select: { lessons: true } },
    },
    orderBy: { fullName: 'asc' },
  });
  const rows = teachers.map((t) => ({
    fullName: t.fullName,
    scheduleName: t.scheduleName,
    position: t.position,
    username: t.username,
    password: t.passwordChanged ? null : decrypt(t.initialPassword),
    status: passwordStatus(t),
    isActive: t.isActive,
    lessonsCount: t._count.lessons,
  }));
  const site = /^https?:\/\/[^\s]+$/.test(String(req.query.site || '')) ? req.query.site : null;
  const buffer = await buildCredentialsWorkbook(rows, site);
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="oqituvchilar-login-parol-${date}.xlsx"`);
  res.send(Buffer.from(buffer));
});

// Bu funksiyadan oldin yaratilgan (paroli saqlanmagan) o'qituvchilarga yangi parol berish
router.post('/teachers/regenerate-missing', async (_req, res) => {
  const targets = await prisma.user.findMany({
    where: { role: 'TEACHER', initialPassword: null, passwordChanged: false },
    select: { id: true },
  });
  for (const t of targets) {
    await prisma.user.update({ where: { id: t.id }, data: await passwordFields(generatePassword()) });
  }
  res.json({ updated: targets.length });
});

router.post('/teachers', async (req, res) => {
  const fullName = String(req.body?.fullName || '').replace(/\s+/g, ' ').trim();
  if (!fullName) return res.status(400).json({ error: 'F.I.Sh. kiritilishi shart' });

  let username = String(req.body?.username || '').trim().toLowerCase();
  if (username) {
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: "Login 3–32 ta lotin harf, raqam, '.', '_' yoki '-' bo'lishi kerak" });
    }
    if (await prisma.user.findUnique({ where: { username } })) {
      return res.status(409).json({ error: 'Bu login band' });
    }
  } else {
    const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username));
    username = uniqueUsername(fullName, taken);
  }

  const password = String(req.body?.password || '') || generatePassword();
  const scheduleName = String(req.body?.scheduleName || '').replace(/\s+/g, ' ').trim() || null;
  if (scheduleName && (await prisma.user.findUnique({ where: { scheduleName } }))) {
    return res.status(409).json({ error: "Bu jadvaldagi nom boshqa o'qituvchiga biriktirilgan" });
  }
  const teacher = await prisma.user.create({
    data: {
      fullName,
      scheduleName,
      position: String(req.body?.position || '').trim() || null,
      username,
      ...(await passwordFields(password)),
      role: 'TEACHER',
    },
  });
  res.status(201).json({ teacher: { id: teacher.id, fullName, username }, password });
});

router.patch('/teachers/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = {};
  if (req.body?.fullName !== undefined) {
    data.fullName = String(req.body.fullName).replace(/\s+/g, ' ').trim();
    if (!data.fullName) return res.status(400).json({ error: "F.I.Sh. bo'sh bo'lmasligi kerak" });
  }
  if (req.body?.username !== undefined) {
    data.username = String(req.body.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(data.username)) {
      return res.status(400).json({ error: "Login formati noto'g'ri" });
    }
    const other = await prisma.user.findUnique({ where: { username: data.username } });
    if (other && other.id !== id) return res.status(409).json({ error: 'Bu login band' });
  }
  if (req.body?.position !== undefined) data.position = String(req.body.position).trim() || null;
  if (req.body?.scheduleName !== undefined) {
    data.scheduleName = String(req.body.scheduleName).replace(/\s+/g, ' ').trim() || null;
    if (data.scheduleName) {
      const other = await prisma.user.findUnique({ where: { scheduleName: data.scheduleName } });
      if (other && other.id !== id) return res.status(409).json({ error: 'Bu jadvaldagi nom boshqa o\'qituvchiga biriktirilgan' });
    }
  }
  if (req.body?.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

  const result = await prisma.user.updateMany({ where: { id, role: 'TEACHER' }, data });
  if (!result.count) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  res.json({ ok: true });
});

router.post('/teachers/:id/reset-password', async (req, res) => {
  const password = generatePassword();
  const result = await prisma.user.updateMany({
    where: { id: Number(req.params.id), role: 'TEACHER' },
    data: await passwordFields(password),
  });
  if (!result.count) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  res.json({ password });
});

router.delete('/teachers/:id', async (req, res) => {
  const result = await prisma.user.deleteMany({ where: { id: Number(req.params.id), role: 'TEACHER' } });
  if (!result.count) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  res.json({ ok: true });
});

router.get('/teachers/:id/lessons', async (req, res) => {
  const teacher = await prisma.user.findFirst({
    where: { id: Number(req.params.id), role: 'TEACHER' },
    select: { id: true, fullName: true, username: true, scheduleName: true, position: true },
  });
  if (!teacher) return res.status(404).json({ error: "O'qituvchi topilmadi" });
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: teacher.id },
    select: lessonSelect,
    orderBy: lessonOrder,
  });
  res.json({ teacher, lessons });
});

// ---------- Dekan va zam dekanlar ----------

const STAFF_ROLES = ['DEAN', 'VICE_DEAN'];

router.get('/staff', async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      isActive: true,
      initialPassword: true,
      passwordChanged: true,
      curatedGroups: { select: { id: true, name: true, course: true } },
    },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });
  res.json({
    staff: staff.map(({ initialPassword, passwordChanged, curatedGroups, ...u }) => ({
      ...u,
      groups: curatedGroups.sort((a, b) => naturalSort(a.name, b.name)),
      // Hali o'zgartirilmagan boshlang'ich parol — admin xodimga qayta berishi uchun
      password: passwordChanged ? null : decrypt(initialPassword),
      passwordStatus: passwordStatus({ initialPassword, passwordChanged }),
    })),
  });
});

router.post('/staff', async (req, res) => {
  const fullName = String(req.body?.fullName || '').replace(/\s+/g, ' ').trim();
  if (!fullName) return res.status(400).json({ error: 'F.I.Sh. kiritilishi shart' });
  const role = req.body?.role;
  if (!STAFF_ROLES.includes(role)) return res.status(400).json({ error: "Lavozim noto'g'ri" });

  let username = String(req.body?.username || '').trim().toLowerCase();
  if (username) {
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: "Login 3–32 ta lotin harf, raqam, '.', '_' yoki '-' bo'lishi kerak" });
    }
    if (await prisma.user.findUnique({ where: { username } })) {
      return res.status(409).json({ error: 'Bu login band' });
    }
  } else {
    const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username));
    username = uniqueUsername(fullName, taken);
  }

  const password = String(req.body?.password || '') || generatePassword();
  const user = await prisma.user.create({
    data: { fullName, username, role, ...(await passwordFields(password)) },
  });
  res.status(201).json({ user: { id: user.id, fullName, username }, password });
});

router.patch('/staff/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = {};
  if (req.body?.fullName !== undefined) {
    data.fullName = String(req.body.fullName).replace(/\s+/g, ' ').trim();
    if (!data.fullName) return res.status(400).json({ error: "F.I.Sh. bo'sh bo'lmasligi kerak" });
  }
  if (req.body?.username !== undefined) {
    data.username = String(req.body.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(data.username)) {
      return res.status(400).json({ error: "Login formati noto'g'ri" });
    }
    const other = await prisma.user.findUnique({ where: { username: data.username } });
    if (other && other.id !== id) return res.status(409).json({ error: 'Bu login band' });
  }
  if (req.body?.role !== undefined) {
    if (!STAFF_ROLES.includes(req.body.role)) return res.status(400).json({ error: "Lavozim noto'g'ri" });
    data.role = req.body.role;
  }
  if (req.body?.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

  const result = await prisma.user.updateMany({ where: { id, role: { in: STAFF_ROLES } }, data });
  if (!result.count) return res.status(404).json({ error: 'Xodim topilmadi' });
  // Dekan bo'lib qolgan foydalanuvchi endi guruhlarga mas'ul emas
  if (data.role === 'DEAN') await prisma.group.updateMany({ where: { curatorId: id }, data: { curatorId: null } });
  res.json({ ok: true });
});

router.post('/staff/:id/reset-password', async (req, res) => {
  const password = generatePassword();
  const result = await prisma.user.updateMany({
    where: { id: Number(req.params.id), role: { in: STAFF_ROLES } },
    data: await passwordFields(password),
  });
  if (!result.count) return res.status(404).json({ error: 'Xodim topilmadi' });
  res.json({ password });
});

router.delete('/staff/:id', async (req, res) => {
  const result = await prisma.user.deleteMany({ where: { id: Number(req.params.id), role: { in: STAFF_ROLES } } });
  if (!result.count) return res.status(404).json({ error: 'Xodim topilmadi' });
  res.json({ ok: true });
});

// ---------- Dars jadvali ----------

const naturalSort = (a, b) => a.localeCompare(b, 'uz', { numeric: true, sensitivity: 'base' });

/** Eski importlarda groups bo'lmasa, groupName/sheetName dan tiklaymiz */
const lessonGroups = (l) =>
  Array.isArray(l.groups) && l.groups.length
    ? l.groups
    : (l.groupName || '')
        .split(', ')
        .filter(Boolean)
        .map((name) => ({ name, sheet: l.sheetName || 'Jadval', col: null }));

/**
 * Excel ko'rinishidagi umumiy jadval: tanlangan kurs (varaq) uchun
 * ustunlar — guruhlar, qatorlar — kun × juftlik, darslar — o'z guruhlari ustida.
 */
router.get('/timetable', async (req, res) => {
  const all = await prisma.lesson.findMany({
    select: { ...lessonSelect, groups: true, teacher: { select: { id: true, fullName: true } } },
    orderBy: lessonOrder,
  });

  const sheets = [...new Set(all.flatMap((l) => lessonGroups(l).map((g) => g.sheet)))].sort(naturalSort);
  const sheet = sheets.includes(req.query.sheet) ? req.query.sheet : sheets[0];
  if (!sheet) return res.json({ sheets, sheet: null, groups: [], slots: [], lessons: [] });

  const groupCols = new Map(); // nom -> ustun tartibi
  const lessons = [];
  for (const { groups, ...l } of all) {
    const own = lessonGroups({ ...l, groups }).filter((g) => g.sheet === sheet);
    if (!own.length) continue;
    for (const g of own) if (!groupCols.has(g.name)) groupCols.set(g.name, g.col ?? Infinity);
    lessons.push({ ...l, columns: own.map((g) => g.name) });
  }

  const groups = [...groupCols]
    .sort(([an, ac], [bn, bc]) => (ac === bc ? naturalSort(an, bn) : ac - bc))
    .map(([name]) => name);

  const slotMap = new Map();
  for (const l of lessons) {
    const key = `${l.startTime}-${l.endTime}`;
    if (!slotMap.has(key)) slotMap.set(key, { startTime: l.startTime, endTime: l.endTime, pairNumber: l.pairNumber });
  }
  const slots = [...slotMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));

  res.json({ sheets, sheet, groups, slots, lessons });
});

router.delete('/lessons', async (_req, res) => {
  const { count } = await prisma.lesson.deleteMany();
  res.json({ deleted: count });
});

router.get('/uploads', async (_req, res) => {
  const uploads = await prisma.upload.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { uploadedBy: { select: { fullName: true } } },
  });
  res.json({ uploads });
});

router.get('/schedule/template', async (_req, res) => {
  const buffer = await buildTemplateWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="dars-jadvali-shablon.xlsx"');
  res.send(Buffer.from(buffer));
});

/**
 * Excel faylidan jadval import qilish.
 * body: file (xlsx), mode = "replace" | "append", dryRun = "true" | "false"
 * dryRun=true bo'lsa hech narsa saqlanmaydi, faqat tahlil natijasi qaytadi.
 */
router.post('/schedule/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Faqat .xlsx formatidagi fayl qabul qilinadi' });
  const mode = req.body.mode === 'append' ? 'append' : 'replace';
  const dryRun = req.body.dryRun !== 'false';

  let parsed;
  try {
    parsed = await parseScheduleWorkbook(req.file.buffer);
  } catch {
    return res.status(400).json({ error: "Faylni o'qib bo'lmadi. U haqiqiy .xlsx fayl ekanini tekshiring." });
  }
  const { lessons, errors, skippedSheets } = parsed;

  const sheets = {};
  for (const l of lessons) {
    for (const name of (l.sheetName || '').split(', ').filter(Boolean)) sheets[name] = (sheets[name] || 0) + 1;
  }

  // Avval "jadvaldagi nomi", keyin F.I.Sh. bo'yicha moslanadi
  const existing = await prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: { id: true, fullName: true, scheduleName: true },
  });
  const teacherIds = new Map(existing.filter((t) => t.scheduleName).map((t) => [nameKey(t.scheduleName), t.id]));
  for (const t of existing) if (!teacherIds.has(nameKey(t.fullName))) teacherIds.set(nameKey(t.fullName), t.id);

  const newTeachers = new Map(); // key -> { name, title }
  const matched = new Set();
  for (const l of lessons) {
    const key = nameKey(l.teacherName);
    if (teacherIds.has(key)) matched.add(key);
    else if (!newTeachers.has(key)) newTeachers.set(key, { name: l.teacherName, title: l.teacherTitle });
  }

  const summary = {
    filename: req.file.originalname,
    mode,
    lessonsCount: lessons.length,
    matchedTeachers: matched.size,
    newTeachers: [...newTeachers.values()].map((t) => t.name).sort(),
    errors: errors.slice(0, 200),
    errorsCount: errors.length,
    sheets,
    skippedSheets,
  };

  if (dryRun || !lessons.length) {
    return res.status(lessons.length || dryRun ? 200 : 400).json({
      ...summary,
      dryRun: true,
      ...(!lessons.length && !dryRun && { error: 'Import qilinadigan dars topilmadi' }),
    });
  }

  const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username));
  const created = [];
  for (const [key, { name: fullName, title }] of newTeachers) {
    const password = generatePassword();
    created.push({
      key,
      fullName,
      title,
      username: uniqueUsername(fullName, taken),
      password,
      ...(await passwordFields(password)),
    });
  }

  const result = await prisma.$transaction(
    async (tx) => {
      if (mode === 'replace') await tx.lesson.deleteMany();

      for (const t of created) {
        const user = await tx.user.create({
          data: {
            fullName: t.fullName,
            scheduleName: t.fullName,
            position: t.title,
            username: t.username,
            passwordHash: t.passwordHash,
            initialPassword: t.initialPassword,
            passwordChanged: false,
            role: 'TEACHER',
          },
        });
        teacherIds.set(t.key, user.id);
      }

      const uploadRow = await tx.upload.create({
        data: { filename: req.file.originalname, uploadedById: req.user.id, rowsCount: lessons.length, mode },
      });

      await tx.lesson.createMany({
        data: lessons.map(({ teacherName, teacherTitle: _title, ...l }) => ({
          ...l,
          teacherId: teacherIds.get(nameKey(teacherName)),
          uploadId: uploadRow.id,
        })),
      });
      return uploadRow;
    },
    { timeout: 60_000 }
  );

  res.json({
    ...summary,
    dryRun: false,
    uploadId: result.id,
    credentials: created.map(({ fullName, username, password }) => ({ fullName, username, password })),
  });
});

export default router;
