import { saveFile } from './exportTimetable.jsx';
import { API_BASE, api } from './api.js';

/** Brauzer ulashish oynasini o'zi ochishga ruxsat bermadi — foydalanuvchi tugmani bosishi kerak */
export class NeedsClickError extends Error {}

/** Faylni serverga yuklab, ochiq havolasini qaytaradi (Telegram'da havola sifatida ulashish uchun) */
export async function uploadForLink(file) {
  const body = new FormData();
  body.append('file', file, file.name);
  const { token } = await api.post('/groups/shared', body);
  return `${API_BASE || window.location.origin}/api/public/shared/${token}`;
}

/** Havolalarni Telegram'ning ulashish oynasida ochish */
function shareLinks({ links, text }) {
  const [first, ...rest] = links;
  const message = [text, ...rest].filter(Boolean).join('\n');
  const win = window.open(
    `https://t.me/share/url?url=${encodeURIComponent(first)}&text=${encodeURIComponent(message)}`,
    '_blank'
  );
  if (!win) throw new NeedsClickError();
  win.opener = null;
  return 'shared';
}

/**
 * Fayllarni Telegram orqali yuborish.
 * Telefon va Windows/macOS Chrome/Edge — tizim "Ulashish" oynasi: Telegram → guruh tanlanadi, fayl o'zi yuboriladi.
 * Fayl ulashib bo'lmaydigan brauzerda — fayl yuklab olinadi va Telegram'ning ulashish oynasi ochiladi
 * (u yerda faylni qo'lda biriktirish kerak).
 *
 * Qaytaradi: 'shared' | 'cancelled' | 'fallback'
 */
export async function shareToTelegram({ files, text, links }) {
  if (links?.length) return shareLinks({ links, text });
  // Kompyuterdagi tizim "Ulashish" oynasida Telegram odatda chiqmaydi — u yerda faylni yuklab, Telegram ilovasini ochamiz
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile) {
    files.forEach(saveFile);
    window.location.href = `tg://msg?text=${encodeURIComponent(text)}`;
    return 'fallback';
  }
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: text, text });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // Fayl tayyorlanguncha "bosish" faolligi tugab qolgan bo'lsa
      if (err.name === 'NotAllowedError') throw new NeedsClickError();
      throw err;
    }
  }
  const win = window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, '_blank');
  if (!win) throw new NeedsClickError();
  win.opener = null;
  files.forEach(saveFile);
  return 'fallback';
}
