import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureAdmin } from './db.js';
import authRoutes from './routes/auth.js';
import teacherRoutes from './routes/teacher.js';
import adminRoutes from './routes/admin.js';

const app = express();

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
} catch (err) {
  console.error(`[startup] ${err.message}`);
  process.exit(1);
}

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
