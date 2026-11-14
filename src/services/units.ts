// Saklama birimi sabittir (su: ml, adım: adet); burada sadece gösterim dönüşümü yapılır.

export type WaterUnit = 'glass' | 'liter';
export type StepUnit = 'steps' | 'km';

// shortcut: boy kaydı yoksa ortalama adım uzunluğu; profilde boy girilince otomatik hesap devreye girer
export const DEFAULT_STRIDE_CM = 72;
export const STRIDE_FACTOR = 0.415;

export const fmtInt = (n: number) => Math.round(n).toLocaleString('tr-TR');
export const fmtDec = (n: number, digits = 1) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export function waterToDisplay(ml: number, unit: WaterUnit, glassMl: number) {
  return unit === 'glass' ? ml / glassMl : ml / 1000;
}
export function waterFromDisplay(v: number, unit: WaterUnit, glassMl: number) {
  return unit === 'glass' ? v * glassMl : v * 1000;
}
export function formatWater(ml: number, unit: WaterUnit, glassMl: number) {
  return fmtDec(waterToDisplay(ml, unit, glassMl), unit === 'glass' ? 1 : 2);
}
export const waterUnitLabel = (unit: WaterUnit) => (unit === 'glass' ? 'bardak' : 'L');

export function strideCm(manualCm: number | null, heightCm: number | null) {
  return manualCm ?? (heightCm ? Math.round(heightCm * STRIDE_FACTOR) : DEFAULT_STRIDE_CM);
}
export const stepsToKm = (steps: number, stride: number) => (steps * stride) / 100_000;
export const kmToSteps = (km: number, stride: number) => Math.round((km * 100_000) / stride);

export function formatSteps(steps: number, unit: StepUnit, stride: number) {
  return unit === 'steps' ? fmtInt(steps) : fmtDec(stepsToKm(steps, stride), 2);
}
export const stepUnitLabel = (unit: StepUnit) => (unit === 'steps' ? 'adım' : 'km');

/** "6,5" veya "6.5" gibi kullanıcı girişini sayıya çevirir; geçersizse null. */
export function parseNumber(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) ? n : null;
}

/** Vücut kitle indeksi: kg / m² */
export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2;
/** Dünya Sağlık Örgütü yetişkin sınıfları */
export const bmiLabel = (v: number) => (v < 18.5 ? 'Zayıf' : v < 25 ? 'Normal' : v < 30 ? 'Fazla kilolu' : 'Obez');
