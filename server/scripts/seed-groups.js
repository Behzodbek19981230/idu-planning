// Zam dekanlar va ularga biriktirilgan guruhlarni bazaga yozish.
// Qayta ishga tushirsa bo'ladi: mavjud zam dekan (F.I.Sh. bo'yicha) va guruhlar (nomi bo'yicha) yangilanadi.
//   npm run db:seed-groups
import bcrypt from 'bcryptjs';
import { prisma } from '../src/db.js';
import { baseUsername, generatePassword } from '../src/credentials.js';
import { encrypt } from '../src/secret.js';

const VICE_DEANS = [
  {
    fullName: 'Ismoli',
    courses: {
      1: ['Uz-5/26', 'Uz-6/26', 'Uz-7/26', 'Uz-8/26', 'Kechki-1/26', 'Kechki-2/26'],
      2: ['Kiber-4/26', 'Kiber-5/26', 'Kiber-6/26', 'Suniy-1/25', 'Kechki-1/25'],
    },
  },
  {
    fullName: 'Behruz',
    courses: {
      1: ['Uz-13/26', 'Uz-14/26', 'Uz-15/26', 'Uz-16/26'],
      3: ['Kiber-1/24', 'RBB-24'],
    },
  },
  {
    fullName: 'Zohid',
    courses: {
      1: ['Uz-1/26', 'Uz-2/26', 'Uz-3/26', 'Uz-4/26', 'Ru-1', 'Ru-2', 'Ru-3'],
      2: ['Kiber-1', 'Kiber-2', 'Kiber-3', 'Kiber-RU', 'RBB-RU', 'RBB-UZB'],
    },
  },
  {
    fullName: 'Bektosh',
    courses: {
      1: ['Uz-9/26', 'Uz-10/26', 'Uz-11/26', 'Uz-12/26'],
    },
  },
];

const taken = new Set((await prisma.user.findMany({ select: { username: true } })).map((u) => u.username));
const created = [];
let groupsCount = 0;

for (const vd of VICE_DEANS) {
  let user = await prisma.user.findFirst({ where: { fullName: vd.fullName, role: 'VICE_DEAN' } });
  if (!user) {
    const base = baseUsername(vd.fullName);
    let username = base;
    for (let i = 2; taken.has(username); i++) username = `${base}${i}`;
    taken.add(username);
    const password = generatePassword();
    user = await prisma.user.create({
      data: {
        fullName: vd.fullName,
        username,
        role: 'VICE_DEAN',
        passwordHash: await bcrypt.hash(password, 10),
        initialPassword: encrypt(password),
      },
    });
    created.push({ fullName: vd.fullName, username, password });
  }

  for (const [course, names] of Object.entries(vd.courses)) {
    for (const name of names) {
      await prisma.group.upsert({
        where: { name },
        create: { name, course: Number(course), curatorId: user.id },
        update: { course: Number(course), curatorId: user.id },
      });
      groupsCount++;
    }
  }
}

console.log(`Guruhlar: ${groupsCount} ta yozildi`);
if (created.length) {
  console.log('Yangi zam dekanlar (parolni keyin Admin → Xodimlar bo\'limidan ham ko\'rish mumkin):');
  console.table(created);
} else {
  console.log("Yangi zam dekan yaratilmadi — hammasi avvaldan mavjud");
}
await prisma.$disconnect();
