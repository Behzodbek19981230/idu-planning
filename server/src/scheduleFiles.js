// Guruh jadvali sifatida qabul qilinadigan fayllar. Turi brauzer aytganiga emas,
// kengaytma va faylning boshidagi baytlarga qarab aniqlanadi.
const TYPES = [
  { ext: ['png'], mime: 'image/png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  { ext: ['jpg', 'jpeg'], mime: 'image/jpeg', magic: [[0xff, 0xd8, 0xff]] },
  { ext: ['webp'], mime: 'image/webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  { ext: ['pdf'], mime: 'application/pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
  {
    ext: ['xlsx'],
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    magic: [[0x50, 0x4b, 0x03, 0x04]],
  },
  { ext: ['xls'], mime: 'application/vnd.ms-excel', magic: [[0xd0, 0xcf, 0x11, 0xe0]] },
];

export const SCHEDULE_FILE_MAX_BYTES = 10 * 1024 * 1024;

/** Fayl ruxsat etilgan turdami — MIME turini qaytaradi, aks holda null */
export function detectScheduleFileType(filename, buffer) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const type = TYPES.find((t) => t.ext.includes(ext));
  if (!type) return null;
  const ok = type.magic.some((sig) => sig.every((b, i) => buffer[i] === b));
  return ok ? type.mime : null;
}

/** Multer latin1 deb o'qigan fayl nomini UTF-8 ga qaytarish ("Жадвал.pdf") */
export const decodeFilename = (name) => Buffer.from(name, 'latin1').toString('utf8');

/** Faylni brauzerga berish: rasm/PDF — ochiladi, Excel yoki ?download=1 — yuklab olinadi */
export function sendScheduleFile(res, file, download) {
  const inline = !download && (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf');
  const ascii = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', file.data.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`
  );
  res.send(Buffer.from(file.data));
}
