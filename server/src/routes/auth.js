import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { publicUser, requireAuth, signToken } from '../auth.js';
import { logActivity } from '../activity.js';

const router = Router();

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Login va parolni kiriting' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await logActivity(req, { user, username, action: 'LOGIN_FAILED' });
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  if (!user.isActive) {
    await logActivity(req, { user, action: 'LOGIN_FAILED' });
    return res.status(403).json({ error: 'Hisobingiz bloklangan' });
  }

  await logActivity(req, { user, action: 'LOGIN' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', requireAuth, async (req, res) => {
  await logActivity(req, { user: req.user, action: 'LOGOUT' });
  res.json({ ok: true });
});

// Frontend har bir sahifa ochilganda yuboradi
router.post('/page-view', requireAuth, async (req, res) => {
  const path = String(req.body?.path || '');
  if (!path.startsWith('/')) return res.status(400).json({ error: "Sahifa noto'g'ri" });
  // Superadminning o'z yurishlari hisobotni to'ldirib yubormasligi uchun yozilmaydi
  if (req.user.role === 'SUPERADMIN') return res.json({ ok: true });
  await logActivity(req, { user: req.user, action: 'PAGE_VIEW', path });
  res.json({ ok: true });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (next.length < 6) {
    return res.status(400).json({ error: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak" });
  }
  if (!(await bcrypt.compare(current, req.user.passwordHash))) {
    return res.status(400).json({ error: "Joriy parol noto'g'ri" });
  }
  await prisma.user.update({
    where: { id: req.user.id },
    // O'qituvchi o'z parolini qo'ydi — boshlang'ich parol endi kerak emas va saqlanmaydi
    data: { passwordHash: await bcrypt.hash(next, 10), initialPassword: null, passwordChanged: true },
  });
  res.json({ ok: true });
});

export default router;
