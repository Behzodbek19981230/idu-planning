import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureAdmin, ensureSuperadmin, prisma } from './db.js';
import authRoutes from './routes/auth.js';
import teacherRoutes from './routes/teacher.js';
import adminRoutes from './routes/admin.js';
import groupRoutes from './routes/groups.js';
import publicRoutes from './routes/public.js';
import superadminRoutes from './routes/superadmin.js';

const app = express();
// nginx orqali kelgan so'rovlarda haqiqiy IP (X-Forwarded-For) loglarga yozilishi uchun
app.set('trust proxy', 'loopback');

const allowedOrigins = [
  'https://idu-schedule.universal-uz.uz',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/me', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Topilmadi' }));

// Production: build qilingan frontendni shu serverdan berish
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (config.serveClient && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

try {
  await ensureAdmin();
  await ensureSuperadmin();
} catch (err) {
  console.error(`[startup] ${err.message}`);
  process.exit(1);
}

// Telegram uchun yaratilgan havola fayllari 30 kundan keyin o'chiriladi
const SHARED_FILE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const cleanSharedFiles = () =>
  prisma.sharedFile
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - SHARED_FILE_TTL_MS) } } })
    .catch((err) => console.error(`[cleanup] ${err.message}`));
cleanSharedFiles();
setInterval(cleanSharedFiles, 6 * 60 * 60 * 1000).unref();

app
  .listen(config.port, config.host, () => {
    console.log(`Server http://${config.host}:${config.port} manzilida ishlamoqda`);
  })
  .on('error', (err) => {
    console.error(
      err.code === 'EADDRINUSE'
        ? `[startup] ${config.port}-port band — server/.env da boshqa PORT tanlang (va nginx proxy_pass ni ham o'zgartiring)`
        : `[startup] ${err.message}`
    );
    process.exit(1);
  });
