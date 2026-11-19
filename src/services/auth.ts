import { t, tList } from '@/i18n';
// Giriş/kayıt formunun saf doğrulamaları.

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** 0–4 arası şifre gücü: uzunluk, büyük/küçük harf, rakam, sembol. */
export function passwordStrength(p: string) {
  if (p.length < 6) return 0;
  let score = 1;
  if (p.length >= 10) score++;
  if (/[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(p)) score++;
  else if (/\d/.test(p) || /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(p)) score += 0.5;
  return Math.min(4, Math.floor(score));
}

export const STRENGTH_LABELS = tList(['Çok kısa', 'Zayıf', 'Orta', 'İyi', 'Güçlü']);

const ERRORS: [RegExp, string][] = [
  [/Invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/Email not confirmed/i, 'E-posta henüz onaylanmadı. Gelen kutunu kontrol et.'],
  [/already registered|already exists/i, 'Bu e-postayla hesap zaten var.'],
  [/Email address .* is invalid/i, 'Bu e-posta adresi kullanılamıyor.'],
  [/rate limit|too many|security purposes/i, 'Çok fazla deneme. Biraz sonra tekrar dene.'],
  [/Password should be/i, 'Şifre en az 6 karakter olmalı.'],
  [/network|fetch/i, 'Sunucuya ulaşılamadı.'],
];

/** Supabase hata mesajını Türkçeye çevirir. */
export function authError(message: string) {
  return t(ERRORS.find(([re]) => re.test(message))?.[1] ?? 'Bir şeyler ters gitti, tekrar dene.');
}
