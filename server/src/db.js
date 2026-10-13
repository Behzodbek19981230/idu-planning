import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';
import { config } from './config.js';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

export async function ensureAdmin() {
  const exists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (exists) return;
  const { username, password, fullName } = config.admin;
  await prisma.user.create({
    data: { fullName, username: username.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), role: 'ADMIN' },
  });
  console.log(`Admin yaratildi: login="${username}"`);
}
