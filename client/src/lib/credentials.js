/** Login/parollar ro'yxatini Excel ochadigan CSV fayl sifatida yuklab beradi */
export function downloadCredentialsCsv(rows, filename = 'oqituvchilar-login-parol.csv') {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [["F.I.Sh.", 'Login', 'Parol'], ...rows.map((r) => [r.fullName, r.username, r.password])];
  // BOM — Excel UTF-8 ni to'g'ri ochishi uchun; ";" — Excel'ning mahalliy ajratgichi
  const csv = '﻿' + lines.map((l) => l.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
