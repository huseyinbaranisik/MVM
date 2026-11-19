import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { RingGauge } from '@/components/RingGauge';
import { TemplateMiniMap } from '@/components/TemplateMiniMap';
import { PillButton } from '@/components/ui/PillButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { getDayItems, type DayItem } from '@/db/repos/schedule';
import { getDayWorkoutProgress, startSession } from '@/db/repos/sessions';
import { getTrackerSettings, getTrackerValue } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { today, weekday, WEEKDAYS_TR } from '@/services/dates';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { isEn, t } from '@/i18n';

type Progress = Awaited<ReturnType<typeof getDayWorkoutProgress>>;

/** Günün planı tek kutuda; birden fazla öğe varsa yana kaydırılır, altta sayfa noktaları. */
export function WorkoutCard({ date }: { date: string }) {
  const data = useDb(async () => {
    const items = await getDayItems(weekday(date));
    return {
      items,
      progress: await Promise.all(items.map((i) => (i.kind === 'workout' ? getDayWorkoutProgress(date, i.templateId) : null))),
      stepGoal: (await getTrackerSettings('steps'))?.goal ?? 0,
      steps: items.some((i) => i.kind === 'walk') ? await getTrackerValue('steps', date) : 0,
    };
  }, [date], ['day_schedule_items', 'workout_templates', 'template_exercises', 'workout_sessions', 'session_sets', 'tracker_settings', 'daily_trackers']);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  if (!data) return <Skeleton height={220} />;
  const dayLabel = date === today() ? t('Bugünün') : isEn ? `${WEEKDAYS_TR[weekday(date)]}'s` : `${WEEKDAYS_TR[weekday(date)]} günü`;

  if (!data.items.length) {
    return (
      <View style={[styles.card, styles.pad, styles.row]}>
        <View style={styles.iconBox}><Icon name="event_busy" size={32} color={colors.textSecondary} /></View>
        <View style={styles.flex}>
          <Text style={type.caption}>{t('{day} planı', { day: dayLabel })}</Text>
          <Text style={type.title}>{t('Plan yok.')}</Text>
        </View>
        <PillButton label={t('Plan ekle')} onPress={() => router.navigate('/program')} />
      </View>
    );
  }

  const many = data.items.length > 1;
  return (
    <View style={styles.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEnabled={many}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))}>
        {data.items.map((item, i) => (
          <View key={item.id} style={[styles.pad, styles.slide, { width: width || undefined }]}>
            <ItemPage item={item} date={date} dayLabel={dayLabel} progress={data.progress[i]} stepGoal={data.stepGoal} steps={data.steps} />
          </View>
        ))}
      </ScrollView>
      {many ? (
        <View style={styles.dots} accessibilityLabel={t('{n} plandan {i}.', { n: data.items.length, i: page + 1 })}>
          {data.items.map((item, i) => <View key={item.id} style={[styles.dot, i === page && styles.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

function ItemPage({ item, date, dayLabel, progress, stepGoal, steps }: {
  item: DayItem; date: string; dayLabel: string; progress: Progress | null; stepGoal: number; steps: number;
}) {
  if (item.kind !== 'workout' || !progress) {
    const walk = item.kind === 'walk';
    const ratio = walk && stepGoal ? Math.min(1, steps / stepGoal) : 0;
    return (
      <View style={styles.page}>
        <View style={styles.flex}>
          <Text style={type.caption}>{t('{day} planı', { day: dayLabel })}</Text>
          <Text style={type.title}>{walk ? t('Yürüyüş') : t('Dinlenme günü')}</Text>
          {walk ? <Text style={type.caption}>{t('Hedef {n} adım', { n: fmtInt(stepGoal) })}</Text> : null}
        </View>
        <View style={styles.big}>
          {walk ? (
            <RingGauge size={184} stroke={14} progress={ratio} color={colors.primaryLight}>
              <Icon name="directions_walk" size={36} color={colors.accent} />
              <Text style={styles.bigValue}>{fmtInt(steps)}</Text>
              <Text style={type.caption}>%{Math.round(ratio * 100)}</Text>
            </RingGauge>
          ) : (
            <View style={styles.restCircle}><Icon name="bedtime" size={72} color={colors.accent} /></View>
          )}
        </View>
      </View>
    );
  }
  const templateId = item.templateId;
  const ratio = progress.finished ? 1 : progress.totalSets ? progress.doneSets / progress.totalSets : 0;
  return (
    <View style={styles.page}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={type.caption}>{t('{day} antrenmanı', { day: dayLabel })}</Text>
          <Text style={type.title} numberOfLines={2}>{item.templateName}</Text>
          <Text style={type.caption}>{t('{n} hareket', { n: item.exerciseCount })} · {t('{n} set', { n: progress.totalSets })}</Text>
        </View>
        <RingGauge size={76} stroke={7} progress={ratio} color={colors.primaryLight}>
          <Text style={styles.pct}>%{Math.round(ratio * 100)}</Text>
        </RingGauge>
      </View>
      {templateId ? <View style={styles.maps}><TemplateMiniMap templateId={templateId} height={120} /></View> : null}
      <PillButton
        label={progress.finished ? t('Tamamlandı ✓') : date < today() ? t('Yapılmadı') : progress.doneSets ? t('Devam et') : t('Başla')}
        variant="primary"
        // geçmiş günlere sonradan kayıt girilmez, gelecek günler de bugünden başlatılamaz
        disabled={progress.finished || date !== today()}
        onPress={async () => { if (templateId) router.push(`/workout/${await startSession(templateId, date)}`); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  pad: { padding: spacing.xl },
  slide: { justifyContent: 'center' },
  page: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  maps: { alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background },
  flex: { flex: 1, gap: spacing.xs },
  iconBox: {
    width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  big: { alignItems: 'center', paddingVertical: spacing.md },
  bigValue: { fontSize: 30, fontWeight: '800', color: colors.textPrimary },
  restCircle: {
    width: 184, height: 184, borderRadius: 92, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
  },
  pct: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: spacing.lg, marginTop: -spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.divider },
  dotOn: { backgroundColor: colors.primaryLight },
});
