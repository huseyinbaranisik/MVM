import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { ACTIVITY_TABLES, getActivity } from '@/db/repos/activity';
import { useDb } from '@/db/useDb';
import { monthCells } from '@/services/calendar';
import { formatLongTR, MONTHS_TR, today, WEEKDAYS_SHORT_TR } from '@/services/dates';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_BG = { completed: colors.primary, frozen: colors.ice, missed: colors.surfaceElevated } as const;

/** Ay takvimi: gün rengi seri durumu, altındaki noktalar o gün yapılanlar (antrenman, su, adım, alışkanlık). */
export function MiniCalendar() {
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7));
  const [open, setOpen] = useState<string | null>(null);
  const cells = monthCells(month);
  const days = cells.filter((c): c is string => !!c);
  const data = useDb(() => getActivity(days[0], days.at(-1)!), [month], ACTIVITY_TABLES);
  const [y, m] = month.split('-').map(Number);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const sel = open ? data?.days.get(open) : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Önceki ay">
          <Icon name="chevron_left" color={colors.textPrimary} />
        </Pressable>
        <Text style={type.subtitle}>{MONTHS_TR[m - 1]} {y}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Sonraki ay">
          <Icon name="chevron_right" color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS_SHORT_TR.map((w) => <Text key={w} style={[type.caption, styles.cell, styles.center]}>{w.charAt(0)}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const a = data?.days.get(d);
          const dots = a ? [
            a.workouts.length > 0 && colors.primaryLight,
            a.water >= (data?.waterGoal ?? Infinity) && colors.ice,
            a.steps >= (data?.stepGoal ?? Infinity) && colors.success,
            a.habits > 0 && colors.warning,
          ].filter(Boolean) as string[] : [];
          const done = a?.streak === 'completed';
          return (
            <Pressable key={d} style={styles.cell} onPress={() => setOpen(d)} disabled={d > now}
              accessibilityRole="button" accessibilityLabel={formatLongTR(d)}>
              {/* Fabric: zemin her hücrede çizili, rengi değişir */}
              <View style={[styles.day, { backgroundColor: a?.streak ? DAY_BG[a.streak] : 'transparent' }, d === now && styles.today]}>
                <Text style={[styles.dayText, done && styles.dayTextOn, d > now && styles.future]}>{Number(d.slice(8))}</Text>
              </View>
              <View style={styles.dots}>{dots.map((c) => <View key={c} style={[styles.dot, { backgroundColor: c }]} />)}</View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color={colors.primaryLight} label="Antrenman" />
        <Legend color={colors.ice} label="Su" />
        <Legend color={colors.success} label="Adım" />
        <Legend color={colors.warning} label="Görev" />
      </View>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open ? formatLongTR(open) : ''}>
        <SheetRow label="Antrenman" value={sel?.workouts.length ? sel.workouts.join(', ') : '—'} />
        <SheetRow label="Su" value={sel?.water ? `${fmtInt(sel.water)} ml` : '—'} />
        <SheetRow label="Adım" value={sel?.steps ? fmtInt(sel.steps) : '—'} />
        <SheetRow label="Görevler" value={sel?.habits ? String(sel.habits) : '—'} />
        <SheetRow label="Seri" value={sel?.streak === 'completed' ? 'Tamamlandı' : sel?.streak === 'frozen' ? 'Donduruldu' : sel?.streak === 'missed' ? 'Kaçırıldı' : '—'} />
      </Sheet>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, minHeight: 44 },
  center: { textAlign: 'center' },
  day: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  today: { borderColor: colors.accent },
  dayText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  dayTextOn: { color: colors.onPrimary },
  future: { color: colors.textSecondary, opacity: 0.5 },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
