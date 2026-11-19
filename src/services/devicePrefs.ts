// Görünüm tercihleri (tema, özel renkler, dil) açılışta eşzamanlı okunduğu için cihazda (localStorage) tutulur;
// hesaba da 'appearance' ayarı olarak yazılır ki telefon değişince geri gelsin (PrefsSync).

export type Lang = 'tr' | 'en';

export const THEME_KEY = 'mvm.theme';
export const CUSTOM_KEY = 'mvm.customTheme';
export const LANG_KEY = 'mvm.lang';

/** Ham, doğrulanmamış değerler: karşılaştırma ham değerle yapılır, yoksa geçersiz bir değer sonsuz yeniden başlatmaya yol açar. */
export interface DevicePrefs { theme: string | null; custom: string | null; lang: string | null }

const ls = () => globalThis.localStorage as Storage | undefined;

export function readDevicePrefs(): DevicePrefs {
  try {
    const s = ls();
    return { theme: s?.getItem(THEME_KEY) ?? null, custom: s?.getItem(CUSTOM_KEY) ?? null, lang: s?.getItem(LANG_KEY) ?? null };
  } catch {
    return { theme: null, custom: null, lang: null };
  }
}

export function writeDevicePrefs(p: DevicePrefs) {
  const s = ls();
  if (!s) return;
  const put = (k: string, v: string | null) => (v == null ? s.removeItem(k) : s.setItem(k, v));
  put(THEME_KEY, p.theme);
  put(CUSTOM_KEY, p.custom);
  put(LANG_KEY, p.lang);
}

export const samePrefs = (a: DevicePrefs, b: DevicePrefs) =>
  a.theme === b.theme && a.custom === b.custom && a.lang === b.lang;

/** Sunucudan gelen değeri DevicePrefs'e çevirir; tanınmayan biçim null döner. */
export function parsePrefs(v: unknown): DevicePrefs | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' ? x : null);
  return { theme: str(o.theme), custom: str(o.custom), lang: str(o.lang) };
}
