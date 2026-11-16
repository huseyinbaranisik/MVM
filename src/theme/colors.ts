// Tüm renkler burada. Bileşenlerde sabit renk kodu kullanma.
// Tema uygulama açılırken bir kez seçilir (StyleSheet'ler modül yüklenirken oluşur); değiştirince uygulama yeniden başlar.

export type ThemeId = 'bordo' | 'gece' | 'sarap' | 'erik' | 'karpuz' | 'domates' | 'mandalina' | 'deniz' | 'mocha';

/** Paletin ham renkleri: zemin, ana renk (dolgu), vurgu. */
interface Palette { name: string; bg: string; primary: string; highlight: string; light: boolean }

export const PALETTES: Record<Exclude<ThemeId, 'bordo'>, Palette> = {
  gece: { name: 'Gece & Kiremit', bg: '#050517', primary: '#CF5C36', highlight: '#EFC88B', light: false },
  sarap: { name: 'Şarap', bg: '#0A0908', primary: '#49111C', highlight: '#F2F4F3', light: false },
  // iki renkli paletler: üçüncü renk (ana dolgu / vurgu) uyumlu olarak eklendi
  erik: { name: 'Erik & Bal', bg: '#3C153B', primary: '#A8456B', highlight: '#F0C987', light: false },
  karpuz: { name: 'Karpuz', bg: '#F3D9B1', primary: '#C33149', highlight: '#A8C256', light: true },
  domates: { name: 'Domates', bg: '#F2E7CB', primary: '#C64F2D', highlight: '#EFBF43', light: true },
  mandalina: { name: 'Mandalina', bg: '#E9E8CA', primary: '#006732', highlight: '#FE7A25', light: true },
  deniz: { name: 'Deniz', bg: '#E9D9CA', primary: '#4D6080', highlight: '#F4721E', light: true },
  mocha: { name: 'Mocha', bg: '#FFEDE3', primary: '#49251E', highlight: '#D08C60', light: true },
};

const BORDO = {
  dark: true,
  background: '#0E0C0B',
  surface: '#1A1716',
  surfaceElevated: '#241F1D',
  primary: '#7A1F2B',
  primaryLight: '#A33545',
  /** vurgu: koyu/açık zemin üstünde ikon, halka, öne çıkan yazı */
  accent: '#E8DCC4',
  /** ana renk dolgusunun (bordo düğme vb.) üstündeki yazı/ikon */
  onPrimary: '#E8DCC4',
  accentMuted: '#B8AA90',
  textPrimary: '#F3EDE2',
  textSecondary: '#9C9286',
  divider: '#2E2826',
  success: '#6E8B5B',
  warning: '#C9A25A',
  ice: '#8FB3C2', // streak dondurulan gün
  overlay: 'rgba(14, 12, 11, 0.72)',
  /** her zeminde fark edilen nötr, yarı saydam gri (ör. renk örneklerinin zemini) */
  neutral: 'rgba(128, 128, 128, 0.3)',
  // Vücut haritasında varsayılan kas tonları (zeminden uzağa)
  muscleTones: ['#2A2523', '#312B28', '#38312E', '#3F3734', '#473E3A', '#4F4641', '#5C534C'],
};

export type Colors = typeof BORDO;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** a'dan b'ye t oranında karışım (0 = a, 1 = b) */
export function mix(a: string, b: string, t: number) {
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** 3 renklik paletten uygulamanın tüm renk değerlerini türetir. */
export function derive(p: Palette): Colors {
  const text = p.light ? mix(p.primary, '#000000', 0.72) : mix(p.highlight, '#FFFFFF', 0.5);
  const [r, g, b] = hex(p.bg);
  return {
    dark: !p.light,
    background: p.bg,
    surface: mix(p.bg, text, p.light ? 0.05 : 0.07),
    surfaceElevated: mix(p.bg, text, p.light ? 0.1 : 0.12),
    primary: p.primary,
    primaryLight: p.light ? p.highlight : mix(p.primary, '#FFFFFF', 0.2),
    // açık zeminde parlak vurgu okunmuyor: metne doğru koyulaştır
    accent: p.light ? mix(p.highlight, text, 0.35) : p.highlight,
    onPrimary: p.light ? p.bg : p.highlight,
    accentMuted: mix(p.light ? p.primary : p.highlight, p.bg, 0.35),
    textPrimary: text,
    textSecondary: mix(text, p.bg, 0.42),
    divider: mix(p.bg, text, p.light ? 0.15 : 0.18),
    success: BORDO.success,
    warning: BORDO.warning,
    ice: BORDO.ice,
    overlay: p.light ? 'rgba(0, 0, 0, 0.45)' : `rgba(${r}, ${g}, ${b}, 0.72)`,
    neutral: BORDO.neutral,
    muscleTones: [0.12, 0.15, 0.18, 0.21, 0.24, 0.27, 0.32].map((t) => mix(p.bg, text, t)),
  };
}

export const THEME_KEY = 'mvm.theme';

function savedTheme(): ThemeId {
  try {
    // renkler her şeyden önce yüklenir: localStorage'ı burada kur (supabase.ts'ten önce çalışabilir)
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- koşullu yükleme: Jest'te yerel modül yok
    if (process.env.NODE_ENV !== 'test') require('expo-sqlite/localStorage/install');
    const v = globalThis.localStorage?.getItem(THEME_KEY);
    return v && (v === 'bordo' || v in PALETTES) ? (v as ThemeId) : 'bordo';
  } catch {
    return 'bordo'; // testlerde/localStorage yokken varsayılan
  }
}

export const themeId: ThemeId = savedTheme();
export const colors: Colors = themeId === 'bordo' ? BORDO : derive(PALETTES[themeId]);

export type ColorToken = Exclude<keyof Colors, 'muscleTones' | 'dark'>;
