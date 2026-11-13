import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { getWorkoutDates } from '@/db/repos/sessions';
import { useDb } from '@/db/useDb';
import { addDays, diffDays, MONTHS_TR, today, weekday, WEEKDAYS_SHORT_TR, type DateStr } from '@/services/dates';
import { colors, radius, spacing, type } from '@/theme';

const SWIPE_PX = 40;

const mondayOf = (d: DateStr) => addDays(d, -weekday(d));

function weekLabel(monday: DateStr) {
  const delta = diffDays(monday, mondayOf(today())) / 7;
  if (delta === 0) return 'Bu hafta';
  if (delta === -1) return 'Geçen hafta';
  if (delta === 1) return 'Gelecek hafta';
  const sunday = addDays(monday, 6);
  const m1 = MONTHS_TR[Number(monday.slice(5, 7)) - 1];
  const m2 = MONTHS_TR[Number(sunday.slice(5, 7)) - 1];
  return `${Number(monday.slice(8))}${m1 === m2 ? '' : ` ${m1}`} – ${Number(sunday.slice(8))} ${m2}`;
}

/**
 * Haftalık gün seçici kartı: oklarla veya yana kaydırarak hafta değişir.
 * Seçili gün bordo daire + bej yazı; antrenmanı bitirilmiş günlerin altında nokta.
 */
export function DaySelector({ value, onChange }: { value: DateStr; onChange: (d: DateStr) => void }) {
  const [monday, setMonday] = useState(() => mondayOf(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    // seçili gün dışarıdan başka bir haftaya taşındıysa o haftayı göster
    setPrevValue(value);
    if (mondayOf(value) !== monday) setMonday(mondayOf(value));
  }
  const t = today();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const trained = useDb((db) => getWorkoutDates(db, days[0], days[6]), [days]) ?? new Set<string>();

  const shift = (weeks: number) => {
    const next = addDays(monday, weeks * 7);
    setMonday(next);
    onChange(addDays(next, weekday(value))); // haftanın aynı günü seçili kalsın
  };
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > SWIPE_PX) shift(g.dx < 0 ? 1 : -1); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [monday, value]);

  return (
    <View style={styles.card} {...swipe.panHandlers}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Önceki hafta">
          <Icon name="chevron_left" color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => { setMonday(mondayOf(t)); onChange(t); }} accessibilityRole="button" accessibilityLabel="Bugüne dön">
          <Text style={type.caption}>{weekLabel(monday)}</Text>
        </Pressable>
        <Pressable onPress={() => shift(1)} hitSlop={12} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Sonraki hafta">
          <Icon name="chevron_right" color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {days.map((d, i) => {
          const selected = d === value;
          const isToday = d === t;
          return (
            <Pressable key={d} onPress={() => onChange(d)} style={styles.day}
              accessibilityRole="button" accessibilityState={{ selected }}
              accessibilityLabel={`${d}${trained.has(d) ? ', antrenman yapıldı' : ''}`}>
              <Text style={[styles.wd, isToday && styles.todayText]}>{WEEKDAYS_SHORT_TR[i]}</Text>
              <View style={[styles.num, selected && styles.selected, !selected && isToday && styles.todayRing]}>
                <Text style={[styles.numText, selected && styles.selText]}>{Number(d.slice(8))}</Text>
              </View>
              <View style={[styles.dot, trained.has(d) && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  arrow: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  day: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: 72 },
  wd: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
  todayText: { color: colors.accent },
  num: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.primary },
  todayRing: { borderWidth: 1.5, borderColor: colors.accentMuted },
  numText: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  selText: { color: colors.accent },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotOn: { backgroundColor: colors.primaryLight },
});
