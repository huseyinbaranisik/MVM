import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TemplateMiniMap } from '@/components/TemplateMiniMap';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { getWeekPlan, type DayPlan } from '@/db/repos/schedule';
import { createTemplate, getTemplates, setDaySchedule } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { today, weekday, WEEKDAYS_SHORT_TR, WEEKDAYS_TR } from '@/services/dates';
import { colors, radius, spacing, type } from '@/theme';

export default function ProgramScreen() {
  const data = useDb(async () => ({ week: await getWeekPlan(), templates: await getTemplates() }), [], ['day_schedule', 'workout_templates', 'template_exercises']);
  const [assigning, setAssigning] = useState<DayPlan | null>(null);
  const todayWd = weekday(today());
  // React Compiler closure bağımlılıklarını render sırasında okur: null olabilen state'ten alanları burada güvenle çıkar
  const day = assigning?.weekday ?? 0;
  const dayTemplateId = assigning?.kind === 'workout' ? assigning.templateId : null;

  const newTemplate = async (assignTo?: number) => {
    const id = await createTemplate('Yeni antrenman');
    if (assignTo != null) await setDaySchedule(assignTo, 'workout', id);
    setAssigning(null);
    router.push(`/template/${id}`);
  };

  return (
    <Screen>
      <Text style={type.hero}>Program</Text>
      <Text style={type.caption}>Bir güne dokunarak antrenman ata</Text>
      <View style={styles.card}>
        {data?.week.map((d) => (
          <Pressable key={d.weekday} onPress={() => setAssigning(d)} style={styles.row} accessibilityRole="button"
            accessibilityLabel={`${WEEKDAYS_TR[d.weekday]}: ${d.kind === 'workout' ? d.templateName : d.kind === 'walk' ? 'Yürüyüş' : 'Dinlenme'}`}>
            <View style={[styles.dayBadge, d.weekday === todayWd && styles.today]}>
              <Text style={[styles.dayText, d.weekday === todayWd && styles.todayText]}>{WEEKDAYS_SHORT_TR[d.weekday]}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={type.subtitle} numberOfLines={1}>{d.kind === 'workout' ? d.templateName : d.kind === 'walk' ? 'Yürüyüş günü' : 'Dinlenme günü'}</Text>
              {d.kind === 'workout' ? <Text style={type.caption}>{d.exerciseCount} hareket</Text> : null}
            </View>
            {d.kind === 'workout' && d.templateId ? <TemplateMiniMap templateId={d.templateId} height={44} />
              : <Icon name={d.kind === 'walk' ? 'directions_walk' : 'bedtime'} color={colors.textSecondary} size={20} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.titleRow}>
        <Text style={[type.title, styles.flex]}>Şablonlar</Text>
        <PillButton label="+ Yeni" onPress={() => newTemplate()} />
      </View>
      <View style={styles.card}>
        {data?.templates.map((t) => (
          <Pressable key={t.id} onPress={() => router.push(`/template/${t.id}`)} style={styles.row} accessibilityRole="button">
            <View style={styles.flex}>
              <Text style={type.subtitle} numberOfLines={1}>{t.name}</Text>
              <Text style={type.caption}>{t.exerciseCount} hareket</Text>
            </View>
            <Icon name="chevron_right" color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      <Sheet visible={!!assigning} onClose={() => setAssigning(null)} title={assigning ? WEEKDAYS_TR[assigning.weekday] : ''}>
        {data?.templates.map((t) => (
          <SheetRow key={t.id} label={t.name} value={assigning?.templateId === t.id ? '✓' : `${t.exerciseCount} hareket`}
            onPress={async () => { await setDaySchedule(day, 'workout', t.id); setAssigning(null); }} />
        ))}
        <SheetRow label="Yürüyüş günü" value={assigning?.kind === 'walk' ? '✓' : ''}
          onPress={async () => { await setDaySchedule(day, 'walk', null); setAssigning(null); }} />
        <SheetRow label="Dinlenme günü" value={assigning?.kind === 'rest' ? '✓' : ''}
          onPress={async () => { await setDaySchedule(day, 'rest', null); setAssigning(null); }} />
        <SheetRow label="+ Yeni şablon oluştur ve ata" onPress={() => newTemplate(day)} />
        {dayTemplateId ? (
          <SheetRow label="Bu günün şablonunu düzenle" onPress={() => { setAssigning(null); router.push(`/template/${dayTemplateId}`); }} />
        ) : null}
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
  todayText: { color: colors.accent },
});
