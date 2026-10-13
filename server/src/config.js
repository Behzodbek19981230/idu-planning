import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 4000,
  // Production'da faqat 127.0.0.1 — tashqaridan nginx orqali kiriladi
  host: process.env.HOST || (isProduction ? '127.0.0.1' : '0.0.0.0'),
  // Frontend domen(lar)i, vergul bilan: https://idu-schedule.universal-uz.uz
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Frontend alohida domenda nginx orqali berilsa — false
  serveClient: process.env.SERVE_CLIENT !== 'false',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '7d',
  passwordSecret: process.env.PASSWORD_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    fullName: process.env.ADMIN_FULL_NAME || 'Administrator',
  },
};

// Production'da standart (xavfsiz bo'lmagan) qiymatlar bilan ishga tushirmaymiz
if (isProduction) {
  const weak = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('change-me')) weak.push('JWT_SECRET');
  if (!process.env.PASSWORD_SECRET || process.env.PASSWORD_SECRET.startsWith('change-me')) weak.push('PASSWORD_SECRET');
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123') weak.push('ADMIN_PASSWORD');
  if (weak.length) {
    throw new Error(`server/.env da quyidagilarni o'rnating (uzun tasodifiy qiymat): ${weak.join(', ')}`);
  }
}

// Juftlik raqami bo'yicha standart vaqtlar (Excelda vaqt ko'rsatilmagan bo'lsa ishlatiladi)
export const PAIR_TIMES = {
  1: ['08:30', '09:50'],
  2: ['10:00', '11:20'],
  3: ['11:30', '12:50'],
  4: ['13:30', '14:50'],
  5: ['15:00', '16:20'],
  6: ['16:30', '17:50'],
  7: ['18:00', '19:20'],
};

// Faqat boshlanish vaqti berilganda tugash vaqtini hisoblash uchun (daqiqa)
export const PAIR_DURATION_MIN = 80;
