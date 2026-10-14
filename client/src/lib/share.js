import { saveFile } from './exportTimetable.jsx';

/** Brauzer ulashish oynasini o'zi ochishga ruxsat bermadi — foydalanuvchi tugmani bosishi kerak */
export class NeedsClickError extends Error {}

/**
 * Fayllarni Telegram orqali yuborish.
 * Telefon va Windows/macOS Chrome/Edge — tizim "Ulashish" oynasi: Telegram → guruh tanlanadi, fayl o'zi yuboriladi.
 * Fayl ulashib bo'lmaydigan brauzerda — fayl yuklab olinadi va Telegram'ning ulashish oynasi ochiladi
 * (u yerda faylni qo'lda biriktirish kerak).
 *
 * Qaytaradi: 'shared' | 'cancelled' | 'fallback'
 */
export async function shareToTelegram({ files, text }) {
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
