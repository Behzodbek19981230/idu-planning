import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ExportTimetable from '../components/ExportTimetable.jsx';
import { api } from './api.js';

export const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'png', label: 'Rasm' },
];

const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'dars-jadvali';

// Safari'da canvas maydoni ~16.7 mln pikseldan oshsa bo'sh rasm chiqadi
const MAX_CANVAS_AREA = 16_000_000;

/**
 * Jadvalni ekrandan tashqarida chizib, canvas'ga oladi. Canvas pikselidagi o'lchovlar:
 * rows — har bir qator pastki chegarasi, days — har bir kun oxiri, header — [sarlavha qatori tepasi, pasti]
 */
async function renderCanvas(grid, title) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;';
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    let node = null;
    flushSync(() => root.render(<ExportTimetable ref={(n) => (node = n)} title={title} grid={grid} />));
    await document.fonts?.ready;
    const { width, height, top } = node.getBoundingClientRect();
    const scale = Math.min(2, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
    const bottom = (el) => (el.getBoundingClientRect().bottom - top) * scale;
    const thead = node.querySelector('thead').getBoundingClientRect();
    const layout = {
      rows: [...node.querySelectorAll('tbody tr')].map(bottom),
      days: [...node.querySelectorAll('tbody tr[data-day-end]')].map(bottom),
      header: [(thead.top - top) * scale, (thead.bottom - top) * scale],
    };
    const { toCanvas } = await import('html-to-image');
    const canvas = await toCanvas(node, { pixelRatio: scale, backgroundColor: '#ffffff' });
    return { canvas, layout, scale };
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Canvas'ni A4 sahifalarga bo'ladi: iloji boricha kunlar orasidan, bo'lmasa qatorlar orasidan.
 * Ikkinchi sahifadan boshlab tepada sarlavha qatori takrorlanadi — uning balandligi joydan ayiriladi.
 */
function paginate(canvas, { rows, days, header }, pageHeight) {
  const headerHeight = header[1] - header[0];
  const lastBefore = (list, from, limit) => list.filter((b) => b > from + 1 && b <= limit).at(-1);
  const slices = [];
  for (let start = 0; start < canvas.height - 1; ) {
    const limit = start + pageHeight - (slices.length ? headerHeight : 0);
    const end = limit >= canvas.height ? canvas.height : (lastBefore(days, start, limit) ?? lastBefore(rows, start, limit) ?? limit);
    slices.push([start, end]);
    start = end;
  }
  return slices;
}

async function toPdf({ canvas, layout, scale }) {
  const { jsPDF } = await import('jspdf');
  const margin = 8;
  const PX_MM = 25.4 / 96; // 1 CSS piksel — mm

  // Ikki yo'nalishdan qaysi biri kamroq sahifa beradi — o'shani tanlaymiz
  const layouts = ['landscape', 'portrait'].map((orientation) => {
    const [w, h] = orientation === 'landscape' ? [297, 210] : [210, 297];
    const mm = Math.min((w - 2 * margin) / canvas.width, PX_MM / scale);
    return { orientation, mm, slices: paginate(canvas, layout, (h - 2 * margin) / mm) };
  });
  const best = layouts.reduce((a, b) => (b.slices.length < a.slices.length ? b : a));

  const doc = new jsPDF({ orientation: best.orientation, unit: 'mm', format: 'a4', compress: true });
  const [headTop, headBottom] = layout.header;
  best.slices.forEach(([from, to], i) => {
    const head = i ? headBottom - headTop : 0;
    const part = document.createElement('canvas');
    part.width = canvas.width;
    part.height = Math.ceil(head + to - from);
    const ctx = part.getContext('2d');
    if (head) ctx.drawImage(canvas, 0, headTop, canvas.width, head, 0, 0, canvas.width, head);
    ctx.drawImage(canvas, 0, from, canvas.width, to - from, 0, head, canvas.width, to - from);
    if (i) doc.addPage();
    doc.addImage(part, 'PNG', margin, margin, part.width * best.mm, part.height * best.mm, undefined, 'FAST');
  });
  return doc.output('blob');
}

/**
 * Tanlangan guruhlar jadvalini fayl qilib yaratadi.
 * grid — /groups/timetable natijasi (PDF va rasm uchun), groupIds — Excel uchun.
 */
export async function generateTimetableFile({ format, groupIds, grid, title, name = title }) {
  let blob;
  if (format === 'xlsx') {
    blob = await api.blob(`/groups/timetable/xlsx?groupIds=${groupIds.join(',')}&title=${encodeURIComponent(title)}`);
  } else {
    const rendered = await renderCanvas(grid, title);
    blob =
      format === 'png'
        ? await new Promise((resolve) => rendered.canvas.toBlob(resolve, 'image/png'))
        : await toPdf(rendered);
  }
  return new File([blob], `${safeName(name)}.${format}`, { type: blob.type });
}

export function saveFile(file) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
