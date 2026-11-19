import { StyleSheet, Text, View } from 'react-native';

import { getLevel, XP_TABLES } from '@/db/repos/xp';
import { useDb } from '@/db/useDb';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

/** Rank, seviye ve seviye içindeki XP çubuğu. */
export function LevelBar() {
  const lv = useDb(getLevel, [], XP_TABLES);
  if (!lv) return <View style={styles.placeholder} />;
  const ratio = lv.needed ? lv.intoLevel / lv.needed : 0;
  return (
    <View style={styles.wrap} accessibilityLabel={t('{rank}, seviye {level}, {into} / {needed} XP', { rank: lv.rank, level: lv.level, into: lv.intoLevel, needed: lv.needed })}>
      <View style={styles.row}>
        <Text style={styles.rank}>{lv.rank}</Text>
        <Text style={type.subtitle}>{t('Sv {n}', { n: lv.level })}</Text>
        <Text style={[type.caption, styles.end]}>{fmtInt(lv.intoLevel)} / {fmtInt(lv.needed)} XP</Text>
      </View>
      {/* Fabric: dolgu her zaman çizili, genişliği değişir */}
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(2, ratio * 100)}%` }]} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  placeholder: { height: 34 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: {
    fontSize: 12, fontWeight: '800', color: colors.onPrimary, backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden',
  },
  end: { marginLeft: 'auto' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primaryLight },
});
