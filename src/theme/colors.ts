// Tüm renkler burada. Bileşenlerde sabit renk kodu kullanma; temayı değiştirmek için sadece bu dosyayı düzenle.
export const colors = {
  background: '#0E0C0B',
  surface: '#1A1716',
  surfaceElevated: '#241F1D',
  primary: '#7A1F2B',
  primaryLight: '#A33545',
  accent: '#E8DCC4',
  accentMuted: '#B8AA90',
  textPrimary: '#F3EDE2',
  textSecondary: '#9C9286',
  divider: '#2E2826',
  success: '#6E8B5B',
  warning: '#C9A25A',
  ice: '#8FB3C2', // streak dondurulan gün
  overlay: 'rgba(14, 12, 11, 0.72)',
  // Vücut haritasında varsayılan kas tonları (koyudan açığa)
  muscleTones: ['#2A2523', '#312B28', '#38312E', '#3F3734', '#473E3A', '#4F4641', '#5C534C'],
} as const;

export type ColorToken = Exclude<keyof typeof colors, 'muscleTones'>;
