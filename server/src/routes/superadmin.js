import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('SUPERADMIN'));

const ACTIONS = ['LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PAGE_VIEW'];
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

// ---------- Loglar ----------

router.get('/logs', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const q = String(req.query.q || '').trim();

  const where = {};
  if (req.query.userId) where.userId = Number(req.query.userId);
  if (ACTIONS.includes(req.query.action)) where.action = req.query.action;
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { path: { contains: q, mode: 'insensitive' } },
      { ip: { contains: q } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { fullName: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, fullName: true, username: true, role: true },
    orderBy: { fullName: 'asc' },
  });
  res.json({ users });
});

// ---------- Hisobotlar ----------

router.get('/reports', async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * DAY_MS);
  const period = { createdAt: { gte: since } };

  const [byAction, activeUsers, daily, topPages, perUser, users] = await Promise.all([
    prisma.activityLog.groupBy({ by: ['action'], where: period, _count: { _all: true } }),
    prisma.activityLog.findMany({
      where: { ...period, action: { in: ['LOGIN', 'PAGE_VIEW'] }, userId: { not: null } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.$queryRaw`
      SELECT to_char((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tashkent')::date, 'YYYY-MM-DD') AS day,
             COUNT(*) FILTER (WHERE action = 'LOGIN')::int AS logins,
             COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED')::int AS failed,
             COUNT(*) FILTER (WHERE action = 'PAGE_VIEW')::int AS "pageViews",
             COUNT(DISTINCT user_id)::int AS users
      FROM activity_logs
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1`,
    // /admin/teachers/12 kabi manzillar bitta sahifa sifatida sanaladi
    prisma.$queryRaw`
      SELECT regexp_replace(path, '/[0-9]+', '/:id', 'g') AS path,
             COUNT(*)::int AS views,
             COUNT(DISTINCT user_id)::int AS users
      FROM activity_logs
      WHERE action = 'PAGE_VIEW' AND created_at >= ${since}
      GROUP BY 1
      ORDER BY views DESC
      LIMIT 20`,
    prisma.activityLog.groupBy({
      by: ['userId', 'action'],
      where: { ...period, userId: { not: null } },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: { not: 'SUPERADMIN' } },
      select: { id: true, fullName: true, username: true, role: true, isActive: true },
    }),
  ]);

  const count = (a) => byAction.find((r) => r.action === a)?._count._all ?? 0;

  const stats = new Map();
  for (const r of perUser) {
    const s = stats.get(r.userId) ?? { logins: 0, failed: 0, pageViews: 0, lastLogin: null, lastSeen: null };
    const n = r._count._all;
    const last = r._max.createdAt;
    if (r.action === 'LOGIN') Object.assign(s, { logins: n, lastLogin: last });
    if (r.action === 'LOGIN_FAILED') s.failed = n;
    if (r.action === 'PAGE_VIEW') s.pageViews = n;
    if (r.action !== 'LOGIN_FAILED' && (!s.lastSeen || last > s.lastSeen)) s.lastSeen = last;
    stats.set(r.userId, s);
  }

  res.json({
    days,
    summary: {
      logins: count('LOGIN'),
      failed: count('LOGIN_FAILED'),
      pageViews: count('PAGE_VIEW'),
      activeUsers: activeUsers.length,
      totalUsers: users.length,
    },
    daily,
    topPages,
    users: users
      .map((u) => ({ ...u, ...(stats.get(u.id) ?? { logins: 0, failed: 0, pageViews: 0, lastLogin: null, lastSeen: null }) }))
      .sort((a, b) => (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0) || a.fullName.localeCompare(b.fullName)),
  });
});

export default router;
