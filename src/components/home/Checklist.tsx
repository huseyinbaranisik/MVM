import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { confirm } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { ALL_DAYS, archiveHabit, getHabitsForDate, saveHabit, setHabitDone, type Habit } from '@/db/repos/habits';
import { useDb } from '@/db/useDb';
import { WEEKDAYS_SHORT_TR } from '@/services/dates';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing, type } from '@/theme';

type IconName = Parameters<typeof Icon>[0]['name'];

const HABIT_ICONS: IconName[] = [
  'check_circle', 'no_food', 'egg', 'self_improvement', 'directions_walk', 'water_drop',
  'bedtime', 'menu_book', 'fitness_center', 'spa', 'smoke_free', 'nutrition', 'medication', 'sunny',
];

export function Checklist({ date }: { date: string }) {
  const db = useSQLiteContext();
  const loaded = useDb((db) => getHabitsForDate(db, date), [date], ['habits', 'habit_logs']);
  const habits = loaded ?? [];
  const [editing, setEditing] = useState<Partial<Habit> | null>(null);
  const done = habits.filter((h) => h.done).length;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[type.title, styles.flex]}>Bugün</Text>
        <Text style={styles.count}>{done}/{habits.length}</Text>
        <Pressable onPress={() => setEditing({})} style={styles.addBtn} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Alışkanlık ekle">
          <Icon name="add" size={22} color={colors.accent} />
        </Pressable>
      </View>
      {!loaded ? <Skeleton height={224} /> : habits.length === 0 ? (
        <Text style={type.caption}>Bu gün için alışkanlık yok. + ile ekleyebilirsin.</Text>
      ) : (
        <View style={styles.list}>
          {habits.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setHabitDone(db, h.id, date, !h.done);
              }}
              onLongPress={() => setEditing(h)}
              style={styles.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!h.done }}
              accessibilityLabel={h.name}
              accessibilityHint="Düzenlemek için basılı tut">
              <Icon name={h.icon as IconName} size={22} color={h.done ? colors.accent : colors.textSecondary} />
              <Text style={[type.body, styles.flex, h.done ? styles.doneText : null]}>{h.name}</Text>
              <View style={[styles.check, h.done ? styles.checkOn : null]}>
                {h.done ? <Icon name="check" size={18} color={colors.accent} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
      <HabitSheet habit={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

function HabitSheet({ habit, onClose }: { habit: Partial<Habit> | null; onClose: () => void }) {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(HABIT_ICONS[0]);
  const [days, setDays] = useState(ALL_DAYS);
  const [prev, setPrev] = useState<Partial<Habit> | null>(null);
  if (habit !== prev) {
    setPrev(habit);
    if (habit) {
      setName(habit.name ?? '');
      setIcon(habit.icon ?? HABIT_ICONS[0]);
      setDays(habit.weekdays ?? ALL_DAYS);
    }
  }
  const valid = name.trim().length > 0 && days !== 0;
  const habitId = habit?.id; // closure'larda null olabilen habit'e dokunmamak için

  return (
    <Sheet visible={!!habit} onClose={onClose} title={habit?.id ? 'Alışkanlığı düzenle' : 'Yeni alışkanlık'}>
      <TextInput
        value={name} onChangeText={setName} placeholder="ör. Esneme" placeholderTextColor={colors.textSecondary}
        style={styles.input} maxLength={40} accessibilityLabel="Alışkanlık adı" />
      <Text style={type.caption}>İkon</Text>
      <View style={styles.icons}>
        {HABIT_ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconChoice, icon === i && styles.iconOn]}
            accessibilityRole="button" accessibilityState={{ selected: icon === i }} accessibilityLabel={i}>
            <Icon name={i} size={24} color={icon === i ? colors.accent : colors.textPrimary} />
          </Pressable>
        ))}
      </View>
      <Text style={type.caption}>Hangi günler</Text>
      <View style={styles.days}>
        {WEEKDAYS_SHORT_TR.map((d, i) => (
          <PillButton key={d} label={d} active={(days & (1 << i)) !== 0} onPress={() => setDays(days ^ (1 << i))}
            style={styles.day} />
        ))}
      </View>
      <PillButton label="Kaydet" variant="primary" disabled={!valid}
        onPress={async () => { await saveHabit(db, { id: habitId, name: name.trim(), icon, weekdays: days }); onClose(); }} />
      {habit?.id ? (
        <PillButton label="Sil" onPress={async () => {
          if (!(await confirm({ title: 'Silinsin mi?', message: `"${habit.name}" listeden kaldırılacak. Geçmiş kayıtlar istatistiklerde kalır.`, confirmLabel: 'Sil', destructive: true }))) return;
          if (habitId) await archiveHabit(db, habitId);
          onClose();
        }} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
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
  iconChoice: {
    width: 48, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
  },
  iconOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  days: { flexDirection: 'row', gap: spacing.xs },
  day: { flex: 1, paddingHorizontal: 0 },
});
