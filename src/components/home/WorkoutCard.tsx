import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { RingGauge } from '@/components/RingGauge';
import { TemplateMiniMap } from '@/components/TemplateMiniMap';
import { PillButton } from '@/components/ui/PillButton';
import { getDayPlan } from '@/db/repos/schedule';
import { getDayWorkoutProgress, startSession } from '@/db/repos/sessions';
import { getTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { today, weekday, WEEKDAYS_TR } from '@/services/dates';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

export function WorkoutCard({ date }: { date: string }) {
  const db = useSQLiteContext();
  const data = useDb(async (db) => {
    const plan = await getDayPlan(db, weekday(date));
    return {
      plan,
      progress: await getDayWorkoutProgress(db, date, plan?.templateId ?? null),
      stepGoal: (await getTrackerSettings(db, 'steps'))?.goal ?? 0,
    };
  }, [date]);
  if (!data?.plan) return null;
  const { plan, progress } = data;
  const dayLabel = date === today() ? 'Bugünün' : `${WEEKDAYS_TR[weekday(date)]} günü`;

  if (plan.kind !== 'workout') {
    return (
      <View style={[styles.card, styles.row]}>
        <View style={styles.iconBox}><Icon name="directions_walk" size={32} color={colors.accent} /></View>
        <View style={styles.flex}>
          <Text style={type.caption}>{dayLabel} planı</Text>
          <Text style={type.title}>{plan.kind === 'walk' ? 'Yürüyüş günü' : 'Dinlenme günü'}</Text>
          <Text style={type.caption}>Adım hedefin: {fmtInt(data.stepGoal)}</Text>
        </View>
      </View>
    );
  }

  const ratio = progress.finished ? 1 : progress.totalSets ? progress.doneSets / progress.totalSets : 0;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={type.caption}>{dayLabel} antrenmanı</Text>
          <Text style={type.title}>{plan.templateName}</Text>
          <Text style={type.caption}>{plan.exerciseCount} hareket · {progress.totalSets} set</Text>
        </View>
        {plan.templateId ? <TemplateMiniMap templateId={plan.templateId} /> : null}
        <RingGauge size={76} stroke={7} progress={ratio} color={colors.primaryLight}>
          <Text style={styles.pct}>%{Math.round(ratio * 100)}</Text>
        </RingGauge>
      </View>
      <PillButton
        label={progress.finished ? 'Tamamlandı ✓' : progress.doneSets ? 'Devam et' : 'Başla'}
        variant="primary"
        disabled={progress.finished || date > today()}
        onPress={async () => router.push(`/workout/${await startSession(db, plan.templateId!, date)}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1, gap: spacing.xs },
  iconBox: {
    width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  pct: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
});
