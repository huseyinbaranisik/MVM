import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { colors, radius, spacing, type } from '@/theme';
import { customPalette, derive, hsl, loadCustomColors, PALETTES, themeId, type CustomColors } from '@/theme/colors';
import { setCustomTheme } from '@/theme/select';

type Slot = keyof CustomColors;
const SLOTS: { key: Slot; label: string }[] = [
  { key: 'bg', label: 'Arka plan' }, { key: 'primary', label: 'Birincil' }, { key: 'highlight', label: 'Vurgu' },
];

const HUES = 16;
// Çemberdeki hazır renkler: dıştan içe canlı, koyu, açık halkalar; ortada siyah ve beyaz
const RINGS = [
  { r0: 0.7, r1: 1, s: 72, l: 50 },
  { r0: 0.45, r1: 0.7, s: 55, l: 24 },
  { r0: 0.22, r1: 0.45, s: 70, l: 80 },
].map((ring) => ({ ...ring, colors: Array.from({ length: HUES }, (_, i) => hsl((i * 360) / HUES, ring.s, ring.l)) }));
const CENTER = ['#0E0C0B', '#F7F4EE'];

/** Halka dilimi (merkez c, iç/dış yarıçap, açı aralığı) için SVG path. */
function sector(c: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1} ${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`;
}

function initial(): CustomColors {
  const saved = loadCustomColors();
  if (saved) return saved;
  const p = themeId === 'custom' ? PALETTES.sarap : PALETTES[themeId];
  return { bg: p.bg, primary: p.primary, highlight: p.highlight };
}

/** Özel tema: üç renk yuvası, hazır renklerden oluşan çember ve temanın mini önizlemesi. */
export function CustomThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [c, setC] = useState(initial);
  const [slot, setSlot] = useState<Slot>('bg');
  const wheel = Math.min(220, width - spacing.lg * 2 - 120 - spacing.md - spacing.lg * 2);
  const half = wheel / 2;
  const pick = (hex: string) => setC({ ...c, [slot]: hex });
  // dokunulan noktanın merkeze uzaklığı halkayı, açısı dilimi belirler
  const pickAt = (x: number, y: number) => {
    const dx = x - half;
    const dy = y - half;
    const d = Math.hypot(dx, dy) / (half - 2);
    if (d > 1) return;
    if (d < 0.22) { pick(CENTER[dx < 0 ? 0 : 1]); return; }
    const ring = RINGS.find((r) => d >= r.r0 && d <= r.r1);
    const turn = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    if (ring) pick(ring.colors[Math.round((turn / (2 * Math.PI)) * HUES) % HUES]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Özel tema">
      <View style={styles.slots}>
        {SLOTS.map((s) => (
          <Pressable key={s.key} onPress={() => setSlot(s.key)} style={styles.slot} accessibilityRole="button"
            accessibilityState={{ selected: slot === s.key }} accessibilityLabel={`${s.label}: ${c[s.key]}`}>
            <View style={[styles.ring, slot === s.key && styles.ringOn]}>
              <View style={[styles.dot, { backgroundColor: c[s.key] }]} />
            </View>
            <Text style={[type.caption, slot === s.key && styles.on]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <Preview c={c} />
        <Pressable onPress={(e) => pickAt(e.nativeEvent.locationX, e.nativeEvent.locationY)} accessibilityRole="adjustable"
          accessibilityLabel="Renk çemberi">
        <Svg width={wheel} height={wheel} pointerEvents="none">
          {RINGS.flatMap((ring, ri) => ring.colors.map((hex, i) => {
            const a0 = ((i - 0.5) / HUES) * 2 * Math.PI - Math.PI / 2;
            const a1 = ((i + 0.5) / HUES) * 2 * Math.PI - Math.PI / 2;
            const on = c[slot] === hex;
            return (
              <Path key={`${ri}-${i}`} d={sector(half, ring.r0 * (half - 2), ring.r1 * (half - 2), a0, a1)} fill={hex}
                stroke={on ? colors.textPrimary : colors.surface} strokeWidth={on ? 3 : 1} />
            );
          }))}
          {CENTER.map((hex, i) => (
            <Path key={hex} d={sector(half, 0.001, 0.22 * (half - 2), Math.PI / 2 + i * Math.PI, Math.PI * 1.5 + i * Math.PI)} fill={hex}
              stroke={c[slot] === hex ? colors.textPrimary : colors.surface} strokeWidth={c[slot] === hex ? 3 : 1} />
          ))}
          <Circle cx={half} cy={half} r={half - 1} fill="none" stroke={colors.divider} strokeWidth={1} />
        </Svg>
        </Pressable>
      </View>

      <PillButton label="Kaydet ve uygula" variant="primary" onPress={() => setCustomTheme(c)} />
    </Sheet>
  );
}

/** Seçilen renklerle ana ekranın küçük taslağı. */
function Preview({ c }: { c: CustomColors }) {
  const t = derive(customPalette(c));
  return (
    <View style={[styles.phone, { backgroundColor: t.background, borderColor: t.surfaceElevated }]} accessibilityLabel="Önizleme">
      <View style={styles.pHeader}>
        <View style={[styles.pAvatar, { backgroundColor: t.primary }]} />
        <View style={[styles.pLine, { backgroundColor: t.textPrimary }]} />
      </View>
      <View style={[styles.pCard, { backgroundColor: t.surface }]}>
        <View style={[styles.pTitle, { backgroundColor: t.textSecondary }]} />
        <View style={[styles.pTrack, { backgroundColor: t.surfaceElevated }]}>
          <View style={[styles.pFill, { backgroundColor: t.primaryLight }]} />
        </View>
        <View style={[styles.pButton, { backgroundColor: t.primary }]}>
          <View style={[styles.pBtnText, { backgroundColor: t.onPrimary }]} />
        </View>
      </View>
      <View style={styles.pRow}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.pSmall, { backgroundColor: t.surface }]}>
            <View style={[styles.pRing, { borderColor: i ? t.accent : t.primaryLight }]} />
          </View>
        ))}
      </View>
      <View style={[styles.pTabs, { backgroundColor: t.surface }]}>
        <View style={[styles.pTab, { backgroundColor: t.primary }]} />
        {[0, 1, 2].map((i) => <View key={i} style={[styles.pTabOff, { backgroundColor: t.textSecondary }]} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  slot: { alignItems: 'center', gap: spacing.xs, minWidth: 72 },
  ring: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.textPrimary },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.divider },
  on: { color: colors.textPrimary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  phone: { width: 120, height: 220, borderRadius: 20, borderWidth: 4, padding: 8, gap: 6, overflow: 'hidden' },
  pHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pAvatar: { width: 14, height: 14, borderRadius: 7 },
  pLine: { height: 6, width: 50, borderRadius: 3, opacity: 0.8 },
  pCard: { borderRadius: 10, padding: 8, gap: 6 },
  pTitle: { height: 5, width: 40, borderRadius: 3 },
  pTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  pFill: { height: 6, width: '60%', borderRadius: 3 },
  pButton: { height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pBtnText: { height: 4, width: 30, borderRadius: 2 },
  pRow: { flexDirection: 'row', gap: 6 },
  pSmall: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  pTabs: {
    position: 'absolute', left: 6, right: 6, bottom: 6, height: 24, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  pTab: { width: 16, height: 16, borderRadius: 8 },
  pTabOff: { width: 8, height: 8, borderRadius: 4, opacity: 0.6 },
});
