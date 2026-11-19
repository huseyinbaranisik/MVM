// Uygulama dili. Metinler Türkçe yazılır ve t() ile sarılır; İngilizcede en.ts'teki karşılığı gösterilir,
// karşılığı yoksa Türkçe metin kalır. Dil açılışta bir kez seçilir (sabit metinler modül yüklenirken oluşur),
// değiştirince uygulama yeniden başlar (setLanguage).
import { LANG_KEY, type Lang } from '@/services/devicePrefs';

import en from './en';

export type { Lang };

function deviceLang(): Lang {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

function savedLang(): Lang {
  try {
    // dil ilk okunan şeylerden: localStorage'ı burada kur (colors.ts ile aynı)
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- koşullu yükleme: Jest'te yerel modül yok
    if (process.env.NODE_ENV !== 'test') require('expo-sqlite/localStorage/install');
    const v = globalThis.localStorage?.getItem(LANG_KEY);
    if (v === 'tr' || v === 'en') return v;
  } catch { /* yoksa cihaz dili */ }
  return process.env.NODE_ENV === 'test' ? 'tr' : deviceLang();
}

export const lang: Lang = savedLang();
export const isEn = lang === 'en';
/** Sayı ve tarih biçimi için yerel ayar */
export const locale = isEn ? 'en-US' : 'tr-TR';

type Vars = Record<string, string | number>;

/**
 * Türkçe metni seçili dile çevirir. {ad} yer tutucuları vars ile doldurulur.
 * İngilizce karşılık 'tekil|çoğul' biçimindeyse vars.n === 1 tekili seçer.
 */
export function t(tr: string, vars?: Vars): string {
  let s = isEn ? (en[tr] ?? tr) : tr;
  if (isEn && s.includes('|') && vars && 'n' in vars) {
    const [one, other] = s.split('|');
    s = Number(vars.n) === 1 ? one : other;
  }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}

/** Sabit listeler için: her öğeyi çevirir. */
export const tList = (items: readonly string[]) => items.map((s) => t(s));
