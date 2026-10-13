# idu-planning — Dars jadvali

O'qituvchilar o'z darslarining kuni, vaqti va joyini telefon yoki kompyuterdan ko'rib turishi uchun web ilova.

- **Admin** Excel (.xlsx) faylidan dars jadvalini yuklaydi, o'qituvchilarga login/parol beradi.
- **O'qituvchi** login qilib, bugungi va haftalik darslarini ko'radi (hozirgi / keyingi dars, qolgan vaqt, xona, bino, guruh).
- Interfeys Ant Design asosida, telefon va kompyuterga moslashgan; **yorug' / qorong'i / tizim** mavzusi sarlavhadagi tugma yoki Profil sahifasidan tanlanadi.

## Texnologiyalar

| Qism     | Stack                                                      |
| -------- | ---------------------------------------------------------- |
| Backend  | Node.js 22.18+, Express 5, Prisma 7, PostgreSQL, JWT       |
| Frontend | React 19, Vite, Ant Design 6 (light/dark mavzu), React Router (mobile-first) |
| Excel    | exceljs                                                    |

## Ishga tushirish

```bash
# 1. Bog'liqliklar
npm install && npm run install:all

# 2. Sozlamalar
cp server/.env.example server/.env      # DATABASE_URL, JWT_SECRET, admin login/parol
cp client/.env.example client/.env      # ixtiyoriy: semestr boshlanish sanasi (toq/juft hafta uchun)

# 3. Baza (PostgreSQL'da bo'sh baza yaratilgan bo'lishi kerak)
npm run db:migrate

# 4. Dev rejim: API :4010, web :5173
npm run dev
```

Birinchi ishga tushishda `.env` dagi `ADMIN_USERNAME` / `ADMIN_PASSWORD` bilan admin yaratiladi (standart: `admin` / `admin123` — productionda albatta o'zgartiring).

Telefondan sinash: kompyuter va telefon bir Wi‑Fi tarmoqda bo'lsa, `npm run dev` chiqargan `Network:` manzilini telefonda oching.

### Production

Serverga o'rnatish (nginx, PM2, PostgreSQL, HTTPS) — [DEPLOY.md](DEPLOY.md). Yangilash: `bash deploy/deploy.sh`.

## Excel formati

Import har bir varaq uchun formatni avtomatik aniqlaydi. Avval **tekshiriladi** (dry-run): nechta dars, mavjud/yangi o'qituvchilar va xato kataklar ko'rsatiladi; tasdiqlangandan keyin saqlanadi.

### 1. Fakultet jadvali (to'r ko'rinishi) — asosiy format

| Kun | Juftlik | Vaqti | Uz-11-26 | Uz-12-26 | ... |
| --- | --- | --- | --- | --- | --- |
| Dushanba | 1 | 8:00-9:20 | Kompyuter faniga kirish (A)<br>kat.o'qit R.Sobirov<br>Xona: 401 | Hisoblash matematikasi-0 (A)<br>o'qit J.Sharipov<br>Xona: 403 | |

- Sarlavha qatori (`Kun`, `Juftlik`, `Vaqti`) fayl boshidagi 15 qator ichida qidiriladi; undan keyingi ustunlar — guruhlar.
- Katak: 1-qator fan va turi (`M` ma'ruza, `A` amaliy, `S` seminar, `L` laboratoriya), 2-qator unvon + o'qituvchi (`kat.o'qit R.Sobirov`), 3-qator `Xona: 401`. Bitta katakda bir nechta kichik guruh bo'lishi mumkin.
- Bir nechta guruh ustida birlashtirilgan (merge) katak — bitta dars, barcha guruhlari bilan.
- Kun ustuni vertikal birlashtirilgan bo'lishi mumkin. `MUSTAQIL TA'LIM` va `Самостоятельное образование` o'tkazib yuboriladi.
- Uzun fan nomi bir necha qatorga bo'lingan bo'lsa ham (`Boshlang'ich dasturlash va` / `muammolarni yechish (A)`) bitta nom deb o'qiladi.
- Katakdagi `Dars A / Dars B` — navbatlashadigan darslar: birinchisi **toq**, ikkinchisi **juft** haftaga yoziladi.
- Barcha varaqlar (kurslar) o'qiladi, har bir darsda varaq nomi saqlanadi; admin jadvalni kurs bo'yicha filtrlay oladi. Bitta varaqda bir nechta jadval bloki bo'lishi mumkin.
- Birgalikda o'tiladigan dars (potok) — bir xil o'qituvchi, vaqt, fan va xona bo'lsa, turli kataklar va hatto turli varaqlardagi guruhlar bitta darsga birlashtiriladi.
- Ustunlarida xona raqamlari bo'lgan varaqlar (masalan, **Xonalar bandligi**) avtomatik o'tkazib yuboriladi.

### 2. Ro'yxat ko'rinishi (shablon)

Admin panelidagi **Import → Shablon** tugmasi namunaviy fayl beradi: har bir qator — bitta dars (`O'qituvchi`, `Kun`, `Juftlik`/`Boshlanish`/`Tugash`, `Fan`, `Guruh`, `Xona`, `Bino`, `Turi`, `Hafta`).

### O'qituvchilarni moslash

- Har bir o'qituvchida **jadvaldagi nomi** (`R.Sobirov`) saqlanadi va import shu nom bo'yicha moslaydi. Admin keyin to'liq F.I.Sh.ni o'zgartirsa ham bog'lanish yo'qolmaydi.
- Tizimda yo'q nom uchun login (`sobirov.r`, `siddiqova.sh`) va parol avtomatik yaratiladi va bir marta ko'rsatiladi (CSV qilib yuklab olish mumkin).
- Juftlik vaqti katakda yo'q bo'lsa, standart qiymat olinadi: `server/src/config.js` → `PAIR_TIMES`.

## Login/parollarni Excel'ga chiqarish

**O'qituvchilar → Excel** tugmasi barcha o'qituvchilarning F.I.Sh., unvon, login, parol, holat va darslar sonini `.xlsx` qilib beradi (chop etishga tayyor).

- Admin bergan **boshlang'ich parol** (import, qo'shish yoki parolni tiklashda) `PASSWORD_SECRET` kaliti bilan AES-256-GCM orqali shifrlanib saqlanadi; kirish uchun esa bcrypt hash ishlatiladi.
- O'qituvchi parolini **Profil** bo'limida o'zgartirsa, boshlang'ich parol bazadan o'chiriladi va Excel'da "O'qituvchi o'zi o'zgartirgan" deb yoziladi.
- `PASSWORD_SECRET` o'zgartirilsa, saqlangan boshlang'ich parollar o'qilmay qoladi — ularni qayta tiklash kerak bo'ladi.

## Tuzilma

```
server/
  prisma/schema.prisma     # User, Upload, Lesson
  src/excel.js             # Excel parser va shablon
  src/routes/auth.js       # login, me, parol o'zgartirish
  src/routes/teacher.js    # /api/me/lessons
  src/routes/admin.js      # o'qituvchilar, jadval, import
client/
  src/pages/teacher/       # Bugun, Hafta
  src/pages/admin/         # Panel, Import, O'qituvchilar, Jadval
```
