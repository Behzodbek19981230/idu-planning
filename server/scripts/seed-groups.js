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

// Guruh nomi import qilingan Excel jadvalida boshqacha yozilgan bo'lsa — qaysi ustunga mos kelishi.
// Bu yerda bo'lmaganlari uchun "/" o'rniga "-" qo'yiladi: "Uz-5/26" -> "Uz-5-26"
const TIMETABLE_NAMES = {
  'Kechki-1/26': 'Uz-1-26 (kechki)',
  'Kechki-2/26': 'Uz-2-26 (kechki)',
  'Kiber-4/26': 'Kiber 4-25',
  'Kiber-5/26': 'Kiber 5-25',
  'Kiber-6/26': 'Kiber 6-25',
  'Suniy-1/25': 'SI 1-25',
  'Kechki-1/25': 'Kiber 1-25, SI 1-25 (kechki)',
  'Kiber-1/24': 'Kiber 1-24',
  'Ru-1': 'Ru-1-26',
  'Ru-2': 'Ru-2-26',
  'Ru-3': 'Ru-3-26',
  'Kiber-1': 'Kiber 1-25',
  'Kiber-2': 'Kiber 2-25',
  'Kiber-3': 'Kiber 3-25',
  'Kiber-RU': 'Kiber 1-25 (RU)',
  'RBB-RU': 'RBB 1-25 (RU)',
  'RBB-UZB': 'RBB 1-25',
};
const timetableName = (name) => TIMETABLE_NAMES[name] ?? name.replace('/', '-');

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
        create: { name, course: Number(course), curatorId: user.id, timetableName: timetableName(name) },
        update: { course: Number(course), curatorId: user.id, timetableName: timetableName(name) },
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
