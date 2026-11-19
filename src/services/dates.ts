import { isEn } from '@/i18n';
// Takvim günleri her yerde yerel 'YYYY-MM-DD' metni olarak taşınır.
// Gün aritmetiği UTC üzerinden yapılır: sadece takvim hesabıdır, saat dilimi/DST etkilemez.

export type DateStr = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Cihazın yerel saatine göre verilen anın takvim günü. */
export function toDateStr(d: Date = new Date()): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): DateStr {
  return toDateStr(new Date());
}

function toUtc(s: DateStr): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = new Date(toUtc(s) + n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUtc(a) - toUtc(b)) / 86_400_000);
}

/** 0 = Pazartesi … 6 = Pazar */
export function weekday(s: DateStr): number {
  return (new Date(toUtc(s)).getUTCDay() + 6) % 7;
}

// Adlar tarihsel olarak _TR; seçili dilde gelir.
export const WEEKDAYS_TR = isEn
  ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  : ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const WEEKDAYS_SHORT_TR = isEn
  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const MONTHS_TR = isEn
  ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  : ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** '2026-11-02' → '2 Kasım, Pazartesi' (İngilizce: 'November 2, Monday') */
export const formatLongTR = (s: DateStr) => isEn
  ? `${MONTHS_TR[Number(s.slice(5, 7)) - 1]} ${Number(s.slice(8))}, ${WEEKDAYS_TR[weekday(s)]}`
  : `${Number(s.slice(8))} ${MONTHS_TR[Number(s.slice(5, 7)) - 1]}, ${WEEKDAYS_TR[weekday(s)]}`;
