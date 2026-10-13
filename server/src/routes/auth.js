import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { publicUser, requireAuth, signToken } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Login va parolni kiriting' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  }
  if (!user.isActive) return res.status(403).json({ error: 'Hisobingiz bloklangan' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
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
