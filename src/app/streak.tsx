import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/ui/PillButton';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getStreakDays, getStreakState } from '@/db/repos/streak';
import { useDb } from '@/db/useDb';
import { addDays, MONTHS_TR, today, weekday, WEEKDAYS_SHORT_TR } from '@/services/dates';
import { MAX_FREEZES, type StreakRule } from '@/services/streakService';
import { colors, radius, spacing, type } from '@/theme';

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_COLOR = { completed: colors.primaryLight, frozen: colors.ice, missed: colors.surface } as const;

export default function StreakScreen() {
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7)); // 'YYYY-MM'
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${pad(daysInMonth)}`;

  const data = useDb(async () => ({
    state: await getStreakState(),
    days: await getStreakDays(first, last),
    rule: await getSetting('streakRule'),
  }), [first, last], ['streak_state', 'streak_days', 'settings']);

  if (!data?.state) return <LoadingScreen blocks={[120, 320, 90]} />;
  const rule = data.rule;
  const status = new Map(data.days.map((d) => [d.date, d.status]));
  const cells = [...Array<null>(weekday(first)).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Geri">
          <Icon name="arrow_back" color={colors.textPrimary} />
        </Pressable>
        <Text style={type.title}>Seri</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.stats}>
          <Stat icon="local_fire_department" color={colors.primaryLight} label="Güncel seri" value={`${data.state.current} gün`} />
          <Stat icon="emoji_events" color={colors.warning} label="En uzun" value={`${data.state.longest} gün`} />
          <Stat icon="ac_unit" color={colors.ice} label="Dondurma hakkı" value={`${data.state.freezes_available} / ${MAX_FREEZES}`} />
        </View>

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
            {WEEKDAYS_SHORT_TR.map((w) => <Text key={w} style={[type.caption, styles.cell, styles.center]}>{w}</Text>)}
            {cells.map((d, i) => {
              const s = d ? status.get(d) : undefined;
              return (
                <View key={d ?? `e${i}`} style={styles.cell}>
                  {d ? (
                    <View style={[styles.day, s && { backgroundColor: DAY_COLOR[s] }, d === now && styles.today]}
                      accessibilityLabel={`${Number(d.slice(8))}: ${s === 'completed' ? 'tamamlandı' : s === 'frozen' ? 'donduruldu' : s === 'missed' ? 'kaçırıldı' : 'kayıt yok'}`}>
                      <Text style={[styles.dayText, s === 'missed' && styles.muted]}>{Number(d.slice(8))}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <Legend color={DAY_COLOR.completed} label="Tamamlandı" />
            <Legend color={DAY_COLOR.frozen} label="Donduruldu" />
            <Legend color={DAY_COLOR.missed} label="Kaçırıldı" />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={type.subtitle}>Kurallar</Text>
          <Text style={type.caption}>
            Antrenman günü: antrenmanı bitir. Dinlenme / yürüyüş günü aşağıdaki seçimle tamamlanır.
            Her 7 tamamlanan günde 1 dondurma hakkı kazanırsın (en fazla {MAX_FREEZES}); kaçırılan gün hakkın varsa seriyi bozmaz.
          </Text>
          <View style={styles.segment}>
            <SegmentedControl<StreakRule['restDayMode']>
              options={[{ value: 'stepsOrChecklist', label: 'Adım veya liste' }, { value: 'steps', label: 'Adım' }, { value: 'checklist', label: 'Liste' }]}
              value={rule.restDayMode}
              onChange={(v) => setSetting('streakRule', { ...rule, restDayMode: v })}
            />
          </View>
          <Text style={type.caption}>{`Liste: günlük alışkanlıkların en az %${Math.round(rule.checklistThreshold * 100)}'i.`}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type IconName = Parameters<typeof Icon>[0]['name'];
function Stat({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={22} color={color} />
      <Text style={type.subtitle} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3, justifyContent: 'center' },
  center: { textAlign: 'center', aspectRatio: undefined },
  day: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  today: { borderWidth: 2, borderColor: colors.accent },
  dayText: { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
  muted: { color: colors.textSecondary },
  legend: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  swatch: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.divider },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
