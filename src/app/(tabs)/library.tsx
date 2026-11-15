import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyMap, FlipView, useFlip, type MapMode } from '@/components/BodyMap';
import { EQUIPMENT_TR, ExerciseRow } from '@/components/exercise';
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar';
import { Icon } from '@/components/Icon';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { filterGroups } from '@/data/muscleMap';
import { getExerciseList } from '@/db/repos/exercises';
import { useDb } from '@/db/useDb';
import { colors, radius, spacing, type } from '@/theme';

const EQUIPMENT_FILTERS = ['dumbbell', 'machine', 'bodyweight'] as const;

export default function LibraryScreen() {
  const { width } = useWindowDimensions();
  const list = useDb((db) => getExerciseList(db), [], ['exercises', 'exercise_muscles']);
  const { side, flip, style } = useFlip();
  const [mode, setMode] = useState<MapMode>('region');
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const regionIds = group ? filterGroups.find((g) => g.label === group)!.regionIds : null;
    return (list ?? []).filter((e) =>
      (!q || e.name_tr.toLocaleLowerCase('tr-TR').includes(q) || (e.name_en ?? '').toLowerCase().includes(q)) &&
      (!equipment || e.equipment === equipment) &&
      (!regionIds || e.regions.split(',').some((r) => regionIds.includes(r))));
  }, [list, query, group, equipment]);

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.titleRow}>
        <Text style={[type.hero, styles.flex]}>Kütüphane</Text>
        <Pressable onPress={() => router.push('/exercise/new')} style={styles.addBtn} hitSlop={8}
          accessibilityRole="button" accessibilityLabel="Kendi hareketini ekle">
          <Icon name="add" color={colors.accent} />
        </Pressable>
      </View>
      <View style={styles.controls}>
        <PillButton label="Çevir" onPress={flip} accessibilityLabel={side === 'front' ? 'Arka görünüme çevir' : 'Ön görünüme çevir'} />
        <View style={styles.segment}>
          <SegmentedControl<MapMode> options={[{ value: 'region', label: 'Bölge' }, { value: 'part', label: 'Parça' }]} value={mode} onChange={setMode} />
        </View>
      </View>
      <Text style={[type.caption, styles.center]}>{side === 'front' ? 'Ön' : 'Arka'} · bir {mode === 'region' ? 'bölgeye' : 'kasa'} dokun</Text>
      <FlipView style={style}>
        <BodyMap side={side} mode={mode} width={Math.min(width * 0.62, 280)}
          onPress={(id) => router.push(`/muscle/${id}`)} />
      </FlipView>

      <TextInput value={query} onChangeText={setQuery} placeholder="Hareket ara" placeholderTextColor={colors.textSecondary}
        style={styles.search} accessibilityLabel="Hareket ara" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {filterGroups.map((g) => (
          <PillButton key={g.label} label={g.label} active={group === g.label} onPress={() => setGroup(group === g.label ? null : g.label)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {EQUIPMENT_FILTERS.map((eq) => (
          <PillButton key={eq} label={EQUIPMENT_TR[eq]} active={equipment === eq} onPress={() => setEquipment(equipment === eq ? null : eq)} />
        ))}
      </ScrollView>
      <Text style={type.caption}>{filtered.length} hareket</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={list ? (
          <Text style={[type.caption, styles.empty]}>Bu filtrelere uyan hareket yok. Bir filtreyi kaldırmayı dene.</Text>
        ) : (
          <View style={styles.skeletons}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} rounded={radius.md} />)}</View>
        )}
        renderItem={({ item }) => (
          <ExerciseRow id={item.id} name={item.name_tr} imageKey={item.image_key} photoUri={item.photo_uri} favorite={!!item.is_favorite}
            subtitle={[EQUIPMENT_TR[item.equipment], item.source === 'user' ? 'Kendi hareketin' : item.name_en !== item.name_tr ? item.name_en : null]
              .filter(Boolean).join(' · ')} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: TAB_BAR_HEIGHT + spacing.xxl * 2 },
  headerWrap: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm },
  segment: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  center: { textAlign: 'center' },
  search: {
    minHeight: 48, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.divider,
  },
  chips: { gap: spacing.sm },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  skeletons: { gap: spacing.sm },
});
