/**
 * Fayllarni Telegramga ulashish.
 * Telefon (va Windows/macOS Chrome) — tizim "Ulashish" oynasi ochiladi, Telegram va guruh tanlanadi, fayl o'zi yuboriladi.
 * Fayl ulashib bo'lmaydigan brauzerda — Telegram'ning t.me/share oynasi havola bilan ochiladi.
 *
 * Qaytaradi: 'shared' | 'cancelled'. Brauzer ruxsat bermasa (foydalanuvchi bosishi kerak) — NeedsClickError.
 */
export class NeedsClickError extends Error {}

export async function shareToTelegram({ files, text, links }) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title: text, text: [text, ...links].join('\n') });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled';
      // Fayl tayyorlanguncha "bosish" faolligi tugab qolgan bo'lsa
      if (err.name === 'NotAllowedError') throw new NeedsClickError();
      throw err;
    }
  }
  const [url, ...rest] = links;
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent([text, ...rest].join('\n'))}`;
  const win = window.open(share, '_blank');
  // Popup bloklangan — foydalanuvchi tugmani bosib ochishi kerak
  if (!win) throw new NeedsClickError();
  win.opener = null;
  return 'shared';
}
