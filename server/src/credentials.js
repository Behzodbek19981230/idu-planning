import crypto from 'node:crypto';

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

const slug = (s) =>
  s
    .toLowerCase()
    .split('')
    .map((ch) => CYR[ch] ?? ch)
    .join('')
    .replace(/[^a-z]/g, '');

/** "Karimov Alisher Bahodirovich" -> "karimov.a", "Sh.Siddiqova" -> "siddiqova.sh" */
export function baseUsername(fullName) {
  const short = fullName.trim().match(/^((?:[^.\s]{1,3}\.\s*){1,2})(\S+)$/u);
  if (short) {
    const initial = slug(short[1].split('.')[0]);
    const last = slug(short[2]) || 'teacher';
    return initial ? `${last}.${initial}` : last;
  }
  const [last = '', first = ''] = fullName.trim().split(/\s+/);
  const l = slug(last) || 'teacher';
  const f = slug(first).slice(0, 1);
  return f ? `${l}.${f}` : l;
}

/** O'qish oson, chalkash belgilarsiz (0/O, 1/l) parol */
export function generatePassword(length = 8) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
