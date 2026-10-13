import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: '7d',
  passwordSecret: process.env.PASSWORD_SECRET || process.env.JWT_SECRET || 'dev-secret-change-me',
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    fullName: process.env.ADMIN_FULL_NAME || 'Administrator',
  },
};

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
