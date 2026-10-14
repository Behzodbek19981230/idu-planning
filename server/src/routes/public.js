import { Router } from 'express';
import { prisma } from '../db.js';
import { sendScheduleFile } from '../scheduleFiles.js';

// Talabalar uchun — loginsiz: guruhlar ro'yxati va ularga yuborilgan jadvallar
const router = Router();

const publicFile = { id: true, filename: true, mimeType: true, size: true, note: true, createdAt: true };

router.get('/groups', async (_req, res) => {
  const groups = await prisma.group.findMany({
    select: {
      id: true,
      name: true,
      course: true,
      files: { select: publicFile, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  res.json({
    groups: groups
      .sort(
        (a, b) =>
          (a.course ?? 99) - (b.course ?? 99) || a.name.localeCompare(b.name, 'uz', { numeric: true, sensitivity: 'base' })
      )
      .map(({ files, ...g }) => ({ ...g, latestFile: files[0] ?? null })),
  });
});

router.get('/files/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Fayl topilmadi' });
  const file = await prisma.scheduleFile.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, data: true },
  });
  if (!file) return res.status(404).json({ error: 'Fayl topilmadi' });
  sendScheduleFile(res, file, req.query.download === '1');
});

export default router;
