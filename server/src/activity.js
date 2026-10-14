import { prisma } from './db.js';

/** Faoliyatni log jadvaliga yozish. Xatolik asosiy so'rovni buzmasligi kerak. */
export async function logActivity(req, { user, username, action, path }) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: user?.id ?? null,
        username: user?.username ?? username ?? '',
        action,
        path: path ? String(path).slice(0, 300) : null,
        ip: req.ip || null,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300) || null,
      },
    });
  } catch (err) {
    console.error('[activity]', err.message);
  }
}
