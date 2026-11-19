import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TemplateMiniMap } from '@/components/TemplateMiniMap';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { addDayItem, dayItemName, getWeekPlan, removeDayItem, type DayItem } from '@/db/repos/schedule';
import { toast } from '@/components/ui/overlays';
import { createTemplate, getTemplates, MAX_TEMPLATES } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { today, weekday, WEEKDAYS_SHORT_TR, WEEKDAYS_TR } from '@/services/dates';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

export default function ProgramScreen() {
  const data = useDb(async () => ({ week: await getWeekPlan(), templates: await getTemplates() }), [], ['day_schedule_items', 'workout_templates', 'template_exercises']);
  const [assigning, setAssigning] = useState<number | null>(null);
  const todayWd = weekday(today());
  const day = assigning ?? 0;
  const dayItems = data?.week[day]?.items ?? [];
  const has = (kind: DayItem['kind'], templateId: number | null = null) => dayItems.some((i) => i.kind === kind && i.templateId === templateId);

  const newTemplate = async (assignTo?: number) => {
    let id: number;
    try { id = await createTemplate(t('Yeni antrenman')); } catch (e) {
      toast(e instanceof Error ? e.message : t('Şablon oluşturulamadı'));
      return;
    }
    if (assignTo != null) await addDayItem(assignTo, 'workout', id);
    setAssigning(null);
    router.push(`/template/${id}`);
  };

  return (
    <Screen>
      <Text style={type.hero}>{t('Program')}</Text>
      <View style={styles.card}>
        {data?.week.map((d) => {
          const workouts = d.items.filter((i) => i.kind === 'workout');
          const title = d.items.length ? d.items.map(dayItemName).join(' + ') : t('Plan yok');
          return (
            <Pressable key={d.weekday} onPress={() => setAssigning(d.weekday)} style={styles.row} accessibilityRole="button"
              accessibilityLabel={`${WEEKDAYS_TR[d.weekday]}: ${title}`}>
              <View style={[styles.dayBadge, d.weekday === todayWd && styles.today]}>
                <Text style={[styles.dayText, d.weekday === todayWd && styles.todayText]}>{WEEKDAYS_SHORT_TR[d.weekday]}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[type.subtitle, !d.items.length && styles.empty]} numberOfLines={2}>{title}</Text>
                {workouts.length ? <Text style={type.caption}>{workouts.reduce((a, w) => a + w.exerciseCount, 0)} hareket</Text> : null}
              </View>
              {workouts[0]?.templateId ? <TemplateMiniMap templateId={workouts[0].templateId} height={44} />
                : <Icon name={!d.items.length ? 'add' : d.items[0].kind === 'walk' ? 'directions_walk' : 'bedtime'} color={colors.textSecondary} size={20} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.titleRow}>
        <Text style={[type.title, styles.flex]}>{t('Şablonlar')}</Text>
        <Text style={type.caption}>{data?.templates.length ?? 0}/{MAX_TEMPLATES}</Text>
        <PillButton label={t('+ Yeni')} onPress={() => newTemplate()} disabled={(data?.templates.length ?? 0) >= MAX_TEMPLATES} />
      </View>
      <View style={styles.card}>
        {data?.templates.map((tp) => (
          <Pressable key={tp.id} onPress={() => router.push(`/template/${tp.id}`)} style={styles.row} accessibilityRole="button">
            <View style={styles.flex}>
              <Text style={type.subtitle} numberOfLines={1}>{tp.name}</Text>
              <Text style={type.caption}>{t('{n} hareket', { n: tp.exerciseCount })}</Text>
            </View>
            <Icon name="chevron_right" color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      <Sheet visible={assigning != null} onClose={() => setAssigning(null)} title={assigning != null ? WEEKDAYS_TR[assigning] : ''}>
        {dayItems.map((i) => (
          <SheetRow key={i.id} label={dayItemName(i)} value={t('Kaldır')} onPress={() => removeDayItem(i.id)} />
        ))}
        {dayItems.length ? <View style={styles.divider} /> : null}
        {data?.templates.filter((tp) => !has('workout', tp.id)).map((tp) => (
          <SheetRow key={tp.id} label={`+ ${tp.name}`} value={t('{n} hareket', { n: tp.exerciseCount })} onPress={() => addDayItem(day, 'workout', tp.id)} />
        ))}
        {has('walk') ? null : <SheetRow label={t('+ Yürüyüş')} onPress={() => addDayItem(day, 'walk')} />}
        {has('rest') ? null : <SheetRow label={t('Dinlenme günü')} onPress={() => addDayItem(day, 'rest')} />}
        <SheetRow label={t('+ Yeni şablon')} onPress={() => newTemplate(day)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  dayBadge: { width: 48, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  today: { backgroundColor: colors.primary },
  dayText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  todayText: { color: colors.onPrimary },
  empty: { color: colors.textSecondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider },
});

