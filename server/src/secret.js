import crypto from 'node:crypto';
import { config } from './config.js';

// Boshlang'ich parollar admin Excel'ga chiqarishi uchun qaytariladigan shifr bilan saqlanadi (AES-256-GCM)
const key = crypto.createHash('sha256').update(config.passwordSecret).digest();

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

/** Kalit o'zgargan yoki ma'lumot buzilgan bo'lsa null qaytaradi */
export function decrypt(payload) {
  if (!payload) return null;
  try {
    const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
