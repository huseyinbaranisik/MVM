import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/ui/PillButton';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { getCalorieHistory } from '@/db/repos/foods';
import { getSleepRange } from '@/db/repos/sleep';
import { getLatestMeasurement, getTrackerHistory, getTrackerSettings, type TrackerType } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { addDays, today } from '@/services/dates';
import { formatDuration, type SleepDisplay } from '@/services/sleep';
import { niceAxis } from '@/services/stats';
import { fmtDec, stepsToKm, strideCm, waterToDisplay, type StepUnit, type WaterUnit } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

const TITLES: Record<TrackerType, string> = { water: t('Su geçmişi'), steps: t('Adım geçmişi'), sleep: t('Uyku geçmişi'), calories: t('Kalori geçmişi') };
const BAR_COLOR: Record<TrackerType, string> = { water: colors.accent, steps: colors.primaryLight, sleep: colors.primary, calories: colors.warning };

export default function TrackerHistory() {
  const { type: t } = useLocalSearchParams<{ type: TrackerType }>();
  const kind: TrackerType = t === 'steps' || t === 'sleep' || t === 'calories' ? t : 'water';
  const [days, setDays] = useState<'14' | '30'>('14');
  const { width } = useWindowDimensions();
  const to = today();
  const from = addDays(to, -(Number(days) - 1));

  const data = useDb(async () => {
    const s = await getTrackerSettings(kind);
    const raw = kind === 'sleep'
      ? (await getSleepRange(from, to)).map((l) => ({ date: l.date, value: l.duration_min }))
      : kind === 'calories' ? await getCalorieHistory(from, to)
      : await getTrackerHistory(kind, from, to);
    return { s, raw, height: await getLatestMeasurement('height') };
  }, [kind, from, to], ['tracker_settings', 'daily_trackers', 'sleep_logs', 'food_logs', 'user_foods', 'body_measurements']);

  if (!data?.s) return <LoadingScreen blocks={[44, 260, 90]} />;
  const s = data.s;
  // saklanan değeri gösterim birimine çevir
  const conv = (v: number) => {
    if (kind === 'water') return waterToDisplay(v, s.display_unit as WaterUnit, s.unit_size ?? 250);
    if (kind === 'steps') return (s.display_unit as StepUnit) === 'km' ? stepsToKm(v, strideCm(s.unit_size, data.height)) : v;
    if (kind === 'calories') return v;
    return v / 60; // uyku: saat
  };
  const unitLabel = kind === 'water' ? (s.display_unit === 'glass' ? 'bardak' : 'L')
    : kind === 'steps' ? (s.display_unit === 'km' ? 'km' : t('adım')) : kind === 'calories' ? 'kcal' : t('saat');
  // kaloride hedef bir üst sınır: kayıtlı ve hedefi aşmayan gün başarılı
  const met = (v: number) => (kind === 'calories' ? v > 0 && v <= s.goal : v >= s.goal);

  const n = Number(days);
  const byDate = new Map(data.raw.map((r) => [r.date, r.value]));
  const bars = Array.from({ length: n }, (_, i) => {
    const d = addDays(from, i);
    const v = conv(byDate.get(d) ?? 0);
    return {
      value: v,
      label: i % (n > 14 ? 5 : 2) === 0 ? String(Number(d.slice(8))) : '',
      frontColor: met(byDate.get(d) ?? 0) ? BAR_COLOR[kind] : colors.accentMuted,
    };
  });
  const goal = conv(s.goal);
  const logged = data.raw.filter((r) => r.value > 0);
  const avg = logged.length ? logged.reduce((a, r) => a + r.value, 0) / logged.length : 0;
  const hit = logged.filter((r) => met(r.value)).length;

  const chartW = width - spacing.lg * 2 - spacing.lg * 2 - 40;
  const spacingPx = 4;
  const barW = Math.max(4, (chartW - spacingPx * n) / n);
  const axis = niceAxis(0, Math.max(goal * 1.1, ...bars.map((b) => b.value)) || 1, 4);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Geri')}>
          <Icon name="arrow_back" color={colors.textPrimary} />
        </Pressable>
        <Text style={type.title}>{TITLES[kind]}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.segment}>
          <SegmentedControl options={[{ value: '14', label: t('2 hafta') }, { value: '30', label: t('1 ay') }]} value={days} onChange={setDays} />
        </View>
        <View style={styles.card}>
          <BarChart
            data={bars}
            width={chartW}
            height={200}
            barWidth={barW}
            spacing={spacingPx}
            initialSpacing={spacingPx}
            maxValue={axis.max}
            stepValue={axis.step}
            noOfSections={4}
            barBorderRadius={3}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={colors.divider}
            rulesColor={colors.divider}
            yAxisTextStyle={styles.axis}
            xAxisLabelTextStyle={styles.axis}
            yAxisLabelTexts={axis.labels.map((v) => fmtDec(v, Number.isInteger(v) ? 0 : 1))}
            showReferenceLine1
            referenceLine1Position={goal}
            referenceLine1Config={{ color: colors.accent, dashWidth: 6, dashGap: 4, thickness: 1 }}
            isAnimated
          />
          <Text style={type.caption}>{t('Kesikli çizgi: hedef')} ({kind === 'sleep' ? formatDuration(s.goal, s.display_unit as SleepDisplay) : `${fmtDec(goal, 2)} ${unitLabel}`})</Text>
        </View>
        <View style={styles.stats}>
          <Stat label={t('Kayıtlı gün ortalaması')}
            value={kind === 'sleep' ? formatDuration(Math.round(avg), s.display_unit as SleepDisplay) : `${fmtDec(conv(avg), 1)} ${unitLabel}`} />
          <Stat label={t('Hedefe ulaşılan gün')} value={`${hit} / ${n}`} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  segment: { flexDirection: 'row', gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  axis: { color: colors.textSecondary, fontSize: 10 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
});
