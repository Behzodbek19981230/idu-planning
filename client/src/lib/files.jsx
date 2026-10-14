import { FileExcelOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { API_BASE } from './api.js';

export const SCHEDULE_FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,.pdf,.xlsx,.xls';
export const SCHEDULE_FILE_MAX_MB = 10;

/** Guruh jadvali fayli — login talab qilinmaydi, talabalar ham ochadi */
export const fileUrl = (id, download = false) => `${API_BASE}/api/public/files/${id}${download ? '?download=1' : ''}`;

export function fileKind(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'excel';
}

export const FILE_ICONS = {
  image: <FileImageOutlined style={{ color: '#13a8a8' }} />,
  pdf: <FilePdfOutlined style={{ color: '#f5222d' }} />,
  excel: <FileExcelOutlined style={{ color: '#389e0d' }} />,
};

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
