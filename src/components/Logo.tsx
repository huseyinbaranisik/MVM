import Svg, { Defs, LinearGradient, Polyline, Rect, Stop } from 'react-native-svg';

/** Logo renkleri (tools/make_logo.py ile aynı): uygulama ikonu ve açılış ekranı temadan bağımsız. */
export const BRAND = { top: '#7A1F32', bottom: '#3A0C16', mark: '#F6EEE2', bg: '#0E0C0B' };

/** MVM logosu: yuvarlatılmış kare zemin üzerinde tek çizgi "M". Renk verilmezse marka renkleri. */
export function Logo({ size = 72, color, mark }: { size?: number; color?: string; mark?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="MVM">
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color ?? BRAND.top} />
          <Stop offset="1" stopColor={color ?? BRAND.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="26" fill="url(#logoBg)" />
      <Polyline points="24,72 24,30 50,56 76,30 76,72" fill="none" stroke={mark ?? BRAND.mark} strokeWidth={13}
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
