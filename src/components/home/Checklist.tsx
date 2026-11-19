import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { confirm } from '@/components/ui/overlays';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { ALL_DAYS, archiveHabit, getHabitsForDate, saveHabit, setHabitDone, type Habit } from '@/db/repos/habits';
import { useDb, useOptimistic } from '@/db/useDb';
import { play } from '@/services/sounds';
import { formatLongTR, WEEKDAYS_SHORT_TR } from '@/services/dates';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

type IconName = Parameters<typeof Icon>[0]['name'];

/** Alışkanlık simgeleri: tek renkli Material Symbols, gruplu. Ara sürümde emoji seçilmiş kayıtlar da çizilir (HabitIcon). */
const ICON_GROUPS: { label: string; items: IconName[] }[] = [
  { label: t('Spor'), items: ['fitness_center', 'directions_run', 'directions_walk', 'directions_bike', 'pool', 'self_improvement', 'sports_soccer', 'sports_basketball', 'sports_martial_arts', 'hiking', 'sports_tennis', 'rowing'] },
  { label: t('Sağlık'), items: ['water_drop', 'bedtime', 'medication', 'monitor_heart', 'smoke_free', 'spa', 'healing', 'sunny'] },
  { label: t('Beslenme'), items: ['restaurant', 'nutrition', 'egg', 'no_food', 'local_cafe', 'emoji_food_beverage', 'set_meal', 'bakery_dining'] },
  { label: t('Zihin'), items: ['menu_book', 'edit_note', 'psychology', 'headphones', 'track_changes', 'phonelink_erase', 'eco', 'favorite'] },
  { label: t('Ev & İş'), items: ['cleaning_services', 'bed', 'local_laundry_service', 'cooking', 'laptop', 'school', 'savings', 'call', 'check_circle'] },
];
const DEFAULT_ICON: IconName = 'check_circle';
const isSymbolName = (v: string) => /^[a-z_]+$/.test(v);

function HabitIcon({ icon, done }: { icon: string; done?: boolean }) {
  return isSymbolName(icon)
    ? <Icon name={icon as IconName} size={22} color={done ? colors.accent : colors.textSecondary} />
    : <Text style={[styles.emoji, done && styles.emojiDone]}>{icon}</Text>; // ara sürümde seçilmiş emoji
}

export function Checklist({ date }: { date: string }) {
  const fetched = useDb(() => getHabitsForDate(date), [date], ['habits', 'habit_logs']);
  const [loaded, applyHabits] = useOptimistic(fetched);
  const habits = loaded ?? [];
  const [editing, setEditing] = useState<Partial<Habit> | null>(null);
  const [removing, setRemoving] = useState(false);
  const done = habits.filter((h) => h.done).length;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[type.title, styles.flex]}>{t('Bugün')}</Text>
        <Text style={styles.count}>{done}/{habits.length}</Text>
        {habits.length ? (
          <Pressable onPress={() => setRemoving(!removing)} style={[styles.addBtn, styles.editBtn, removing && styles.editOn]} hitSlop={8}
            accessibilityRole="button" accessibilityState={{ selected: removing }} accessibilityLabel={t('Görevleri düzenle')}>
            <Icon name={removing ? 'check' : 'edit'} size={20} color={removing ? colors.onPrimary : colors.textPrimary} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => setEditing({})} style={styles.addBtn} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={t('Alışkanlık ekle')}>
          <Icon name="add" size={22} color={colors.onPrimary} />
        </Pressable>
      </View>
      {!loaded ? <Skeleton height={224} /> : habits.length === 0 ? (
        <Text style={type.caption}>{t('Alışkanlık yok.')}</Text>
      ) : (
        <View style={styles.list}>
          {habits.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => {
                if (removing) { setEditing(h); return; }
                Haptics.selectionAsync().catch(() => {});
                if (!h.done) play('check');
                applyHabits(habits.map((x) => (x.id === h.id ? { ...x, done: h.done ? 0 : 1 } : x)), () => setHabitDone(h.id, date, !h.done));
              }}
              onLongPress={() => setEditing(h)}
              style={styles.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!h.done }}
              accessibilityLabel={h.name}
              accessibilityHint={t('Düzenlemek için basılı tut')}>
              <HabitIcon icon={h.icon} done={!!h.done} />
              <Text style={[type.body, styles.flex, h.done ? styles.doneText : null]}>{h.name}</Text>
              {removing ? (
                <Pressable onPress={() => removeHabit(h)} hitSlop={10} style={styles.remove}
                  accessibilityRole="button" accessibilityLabel={t('{name} kaldır', { name: h.name })}>
                  <Icon name="remove_circle" size={26} color={colors.warning} />
                </Pressable>
              ) : (
                <View style={[styles.check, h.done ? styles.checkOn : null]}>
                  {h.done ? <Icon name="check" size={18} color={colors.onPrimary} /> : null}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
      <HabitSheet habit={editing} date={date} onClose={() => setEditing(null)} />
    </View>
  );
}

async function removeHabit(h: Pick<Habit, 'id' | 'name'>) {
  if (!(await confirm({ title: t('Silinsin mi?'), message: t('"{name}" listeden kaldırılacak. Geçmiş kayıtlar istatistiklerde kalır.', { name: h.name }), confirmLabel: t('Sil'), destructive: true }))) return false;
  await archiveHabit(h.id);
  return true;
}

function HabitSheet({ habit, date, onClose }: { habit: Partial<Habit> | null; date: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'daily' | 'weekly'>('weekly');
  const [icon, setIcon] = useState<string>(DEFAULT_ICON);
  const [days, setDays] = useState(ALL_DAYS);
  const [prev, setPrev] = useState<Partial<Habit> | null>(null);
  if (habit !== prev) {
    setPrev(habit);
    if (habit) {
      setName(habit.name ?? '');
      setIcon(habit.icon ?? DEFAULT_ICON);
      setDays(habit.weekdays ?? ALL_DAYS);
      setKind(habit.only_date ? 'daily' : 'weekly');
    }
  }
  const valid = name.trim().length > 0 && (kind === 'daily' || days !== 0);
  const habitId = habit?.id; // closure'larda null olabilen habit'e dokunmamak için

  return (
    <Sheet visible={!!habit} onClose={onClose} title={habit?.id ? t('Alışkanlığı düzenle') : t('Yeni alışkanlık')}>
      <TextInput
        value={name} onChangeText={setName} placeholder={t('ör. Esneme')} placeholderTextColor={colors.textSecondary}
        style={styles.input} maxLength={40} accessibilityLabel={t('Alışkanlık adı')} />
      <View style={styles.days}>
        <SegmentedControl<'daily' | 'weekly'> options={[{ value: 'daily', label: t('Günlük') }, { value: 'weekly', label: t('Haftalık') }]}
          value={kind} onChange={setKind} />
      </View>
      {ICON_GROUPS.map((g) => (
        <View key={g.label} style={styles.group}>
          <Text style={type.caption}>{g.label}</Text>
          <View style={styles.icons}>
            {g.items.map((i) => (
              <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconChoice, icon === i && styles.iconOn]}
                accessibilityRole="button" accessibilityState={{ selected: icon === i }} accessibilityLabel={i}>
                <Icon name={i} size={24} color={icon === i ? colors.onPrimary : colors.textPrimary} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      {kind === 'daily' ? (
        <Text style={type.caption}>{formatLongTR(habit?.only_date ?? date)}</Text>
      ) : (
        <>
          <Text style={type.caption}>{t('Hangi günler')}</Text>
          <View style={styles.days}>
            {WEEKDAYS_SHORT_TR.map((d, i) => (
              <PillButton key={d} label={d} active={(days & (1 << i)) !== 0} onPress={() => setDays(days ^ (1 << i))}
                style={styles.day} />
            ))}
          </View>
        </>
      )}
      <PillButton label={t('Kaydet')} variant="primary" disabled={!valid}
        onPress={async () => {
          await saveHabit({ id: habitId, name: name.trim(), icon, weekdays: days, only_date: kind === 'daily' ? habit?.only_date ?? date : null });
          onClose();
        }} />
      {habit?.id ? (
        <PillButton label={t('Sil')} onPress={async () => {
          if (habitId && await removeHabit({ id: habitId, name: habit.name ?? '' })) onClose();
        }} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  editBtn: { backgroundColor: colors.surface },
  editOn: { backgroundColor: colors.primary },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 16, fontWeight: '700', color: colors.accentMuted },
  addBtn: {
    width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  doneText: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  check: {
    width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: {
    minHeight: 52, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 16,
  },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  group: { gap: spacing.xs },
  emoji: { fontSize: 20, width: 24, textAlign: 'center' },
  emojiDone: { opacity: 0.5 },
  iconChoice: {
    width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
  },
  iconOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, paddingHorizontal: 0 },
});
