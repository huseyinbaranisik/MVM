import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { colors, radius, spacing, type } from '@/theme';
import { customPalette, derive, loadCustomColors, PALETTES, themeId, type CustomColors } from '@/theme/colors';
import { setCustomTheme } from '@/theme/select';

type Slot = keyof CustomColors;
const SLOTS: { key: Slot; label: string }[] = [
  { key: 'bg', label: 'Arka plan' }, { key: 'primary', label: 'Birincil' }, { key: 'highlight', label: 'Vurgu' },
];

// Renk çemberi: 12'den saat yönünde 10 renk ailesi; her ailede dıştan içe koyudan açığa 5 ton, ortada beyaz
const FAMILIES = [
  ['#5BA33B', '#9CC63B', '#C3D83C', '#DDE54A', '#F3EA45'], // sarı-yeşil
  ['#0F5E2E', '#13803C', '#1F9E48', '#3DBA59', '#7BD38A'], // yeşil
  ['#1A8FD0', '#22A7C4', '#4FB4E4', '#8CCBEE', '#BFE3F6'], // camgöbeği
  ['#7E2A86', '#5E3592', '#2B2F72', '#2F45A6', '#5C7FD0'], // mor-lacivert
  ['#9C1755', '#C92B68', '#E43C87', '#EA4D9C', '#F29BC0'], // pembe
  ['#B5122B', '#E02424', '#F05A28', '#F7941D', '#FBB441'], // kırmızı-turuncu
  ['#8E1B1F', '#C93434', '#E0683D', '#F2A83A', '#F8D26A'], // vişne-altın
  ['#8C8C8C', '#A9A9A9', '#C4C4C4', '#DADADA', '#ECECEC'], // gri
  ['#0E0E0E', '#262626', '#404040', '#5E5E5E', '#7C7C7C'], // siyah
  ['#3F2414', '#5E3720', '#7E5232', '#A07A55', '#C8A97F'], // kahve
];
const RING = [1, 0.84, 0.68, 0.52, 0.36, 0.2]; // halka sınırları (dış → iç); 0.2 altı beyaz merkez
const WHITE = '#FFFFFF';
const SPAN = (2 * Math.PI) / FAMILIES.length;

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
    if (d < RING[5]) { pick(WHITE); return; }
    const ring = RING.findIndex((r, i) => i < 5 && d <= r && d > RING[i + 1]);
    const turn = (Math.atan2(dy, dx) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
    if (ring >= 0) pick(FAMILIES[Math.floor(turn / SPAN) % FAMILIES.length][ring]);
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
          {FAMILIES.flatMap((fam, fi) => fam.map((hex, ri) => {
            const a0 = fi * SPAN - Math.PI / 2;
            return (
              <Path key={`${fi}-${ri}`} d={sector(half, RING[ri + 1] * (half - 2), RING[ri] * (half - 2), a0, a0 + SPAN)} fill={hex}
                stroke={WHITE} strokeWidth={1.2} />
            );
          }))}
          <Circle cx={half} cy={half} r={RING[5] * (half - 2)} fill={WHITE} stroke={colors.divider} strokeWidth={1} />
          {/* seçili renk: çerçevesi en üstte */}
          {FAMILIES.flatMap((fam, fi) => fam.map((hex, ri) => (c[slot] === hex ? (
            <Path key="sel" d={sector(half, RING[ri + 1] * (half - 2), RING[ri] * (half - 2), fi * SPAN - Math.PI / 2, (fi + 1) * SPAN - Math.PI / 2)}
              fill="none" stroke={colors.textPrimary} strokeWidth={3} />
          ) : null)))}
          {c[slot] === WHITE ? <Circle cx={half} cy={half} r={RING[5] * (half - 2)} fill="none" stroke={colors.textPrimary} strokeWidth={3} /> : null}
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
