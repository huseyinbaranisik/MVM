import { StyleSheet, Text, View } from 'react-native';

import { addDays, weekday, WEEKDAYS_SHORT_TR } from '@/services/dates';
import { colors, radius, spacing } from '@/theme';

/** Son 7 günün mini çubuk grafiği (bugün en sağda); hedefi tutan gün açık renk, boş gün ince çizgi. */
export function WeekBars({ date, values, goal, height = 40 }: {
  date: string; values: Map<string, number>; goal: number; height?: number;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const max = Math.max(goal, ...days.map((d) => values.get(d) ?? 0), 1);
  return (
    <View accessibilityLabel="Son 7 gün">
      <View style={[styles.bars, { height }]}>
        {days.map((d) => {
          const v = values.get(d) ?? 0;
          return (
            <View key={d} style={styles.slot}>
              {/* Fabric: çubuk her gün çizili, yüksekliği ve rengi değişir */}
              <View style={[styles.bar, {
                height: v ? Math.max(4, (v / max) * height) : 3,
                backgroundColor: !v ? colors.divider : v >= goal ? colors.primaryLight : colors.primary,
              }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((d) => (
          <Text key={d} style={[styles.label, d === date && styles.today]}>{WEEKDAYS_SHORT_TR[weekday(d)].charAt(0)}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: spacing.xs },
  slot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: radius.sm / 3 },
  labels: { flexDirection: 'row', gap: 4, marginTop: 2 },
  label: { flex: 1, textAlign: 'center', fontSize: 10, color: colors.textSecondary },
  today: { color: colors.textPrimary, fontWeight: '800' },
});
