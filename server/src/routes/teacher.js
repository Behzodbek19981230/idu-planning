import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

export const lessonSelect = {
  id: true,
  dayOfWeek: true,
  pairNumber: true,
  startTime: true,
  endTime: true,
  subject: true,
  groupName: true,
  room: true,
  building: true,
  lessonType: true,
  weekType: true,
  sheetName: true,
};

export const lessonOrder = [{ dayOfWeek: 'asc' }, { startTime: 'asc' }];

// Joriy foydalanuvchining barcha darslari
router.get('/lessons', requireAuth, async (req, res) => {
  const lessons = await prisma.lesson.findMany({
    where: { teacherId: req.user.id },
    select: lessonSelect,
    orderBy: lessonOrder,
  });
  res.json({ lessons });
});

export default router;
