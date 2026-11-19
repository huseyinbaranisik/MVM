import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePullRefresh } from '@/components/PullRefresh';
import { BodyMap, FlipView, useFlip, type MapMode } from '@/components/BodyMap';
import { EQUIPMENT_TR, ExerciseRow } from '@/components/exercise';
import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar';
import { Icon } from '@/components/Icon';
import { PillButton, SegmentedControl } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { filterGroups, muscles } from '@/data/muscleMap';
import { getExerciseList } from '@/db/repos/exercises';
import { useDb } from '@/db/useDb';
import { matchesMuscles } from '@/services/catalog';
import { colors, radius, spacing, type } from '@/theme';
import { locale, t } from '@/i18n';

const EQUIPMENT_FILTERS = ['dumbbell', 'machine', 'bodyweight'] as const;
const regionOfMuscle = new Map(muscles.map((m) => [m.id, m.regionId]));
/** bölge modu seçimi = filterGroups etiketi; o gruptaki tüm kaslar */
const groupMuscles = new Map(filterGroups.map((g) => [g.label, new Set(muscles.filter((m) => g.regionIds.includes(m.regionId)).map((m) => m.id))]));
const groupOfRegion = (regionId: string) => filterGroups.find((g) => g.regionIds.includes(regionId))?.label;
const muscleName = new Map(muscles.map((m) => [m.id, m.nameTr]));

export default function LibraryScreen() {
  const refresh = usePullRefresh();
  const { width } = useWindowDimensions();
  const list = useDb(() => getExerciseList(), [], ['user_exercises', 'exercise_favorites']);
  const { side, flip, style } = useFlip();
  const [mode, setMode] = useState<MapMode>('region');
  /** bölge modunda grup etiketleri, parça modunda kas id'leri */
  const [selected, setSelected] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [allParts, setAllParts] = useState(false);

  const toggle = (key: string) => setSelected((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  const changeMode = (m: MapMode) => { setMode(m); setSelected([]); };
  const reset = () => { setSelected([]); setEquipment(null); setQuery(''); };
  // mankende dokunulan bölge/kas aşağıdaki seçime yansır
  const onMap = (id: string) => {
    if (mode === 'part') return toggle(id);
    const g = groupOfRegion(id) ?? groupOfRegion(regionOfMuscle.get(id) ?? '');
    if (g) toggle(g);
  };
  const highlighted = mode === 'part' ? selected : selected.flatMap((g) => [...(groupMuscles.get(g) ?? [])]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    const groups = selected.map((k) => (mode === 'part' ? new Set([k]) : groupMuscles.get(k) ?? new Set<string>()));
    return (list ?? []).filter((e) =>
      (!q || e.name_tr.toLocaleLowerCase(locale).includes(q) || (e.name_en ?? '').toLowerCase().includes(q)) &&
      (!equipment || e.equipment === equipment) &&
      matchesMuscles(e.muscles, groups));
  }, [list, query, selected, equipment, mode]);

  const chips = mode === 'region'
    ? filterGroups.map((g) => ({ key: g.label, label: g.label }))
    : muscles.map((m) => ({ key: m.id, label: m.nameTr }));
  // parça modunda seçilenler önce: uzun listede kaybolmasın
  const orderedChips = [...chips.filter((c) => selected.includes(c.key)), ...chips.filter((c) => !selected.includes(c.key))];
  const filtering = selected.length > 0 || equipment != null || query.trim() !== '';

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.titleRow}>
        <Text style={[type.hero, styles.flex]}>{t('Kütüphane')}</Text>
        <Pressable onPress={() => router.push('/exercise/new')} style={styles.addBtn} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={t('Kendi hareketini ekle')}>
          <Icon name="add" color={colors.onPrimary} />
        </Pressable>
      </View>
      <View style={styles.controls}>
        <PillButton label={t('Çevir')} onPress={flip} accessibilityLabel={side === 'front' ? t('Arka görünüme çevir') : t('Ön görünüme çevir')} />
        <View style={styles.segment}>
          <SegmentedControl<MapMode> options={[{ value: 'region', label: t('Bölge') }, { value: 'part', label: t('Parça') }]} value={mode} onChange={changeMode} />
        </View>
      </View>
      <View>
        <Text style={[type.caption, styles.center]}>{side === 'front' ? t('Ön') : t('Arka')}</Text>
        <FlipView style={style}>
          <BodyMap side={side} mode={mode} width={Math.min(width * 0.62, 280)} primary={highlighted} onPress={onMap} />
        </FlipView>
        {filtering ? (
          <Pressable onPress={reset} style={styles.reset} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Filtreyi sıfırla')}>
            <Icon name="filter_alt_off" size={20} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>

      <TextInput value={query} onChangeText={setQuery} placeholder={t('Hareket ara')} placeholderTextColor={colors.textSecondary}
        style={styles.search} accessibilityLabel={t('Hareket ara')} />
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.flex}>
          {orderedChips.map((c) => <PillButton key={c.key} label={c.label} active={selected.includes(c.key)} onPress={() => toggle(c.key)} />)}
        </ScrollView>
        {mode === 'part' ? (
          <Pressable onPress={() => setAllParts(true)} style={styles.more} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('Tüm kas parçaları')}>
            <Icon name="expand_more" color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {EQUIPMENT_FILTERS.map((eq) => (
          <PillButton key={eq} label={EQUIPMENT_TR[eq]} active={equipment === eq} onPress={() => setEquipment(equipment === eq ? null : eq)} />
        ))}
      </ScrollView>
      <View style={styles.titleRow}>
        <Text style={[type.caption, styles.flex]}>{t('{n} hareket', { n: filtered.length })}</Text>
        {selected.length === 1 ? (
          <PillButton label={t('Kas ayrıntısı')} onPress={() => {
            const k = selected[0];
            router.push(`/muscle/${mode === 'part' ? k : filterGroups.find((g) => g.label === k)!.regionIds[0]}`);
          }} />
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        refreshControl={refresh}
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
          <Text style={[type.caption, styles.empty]}>{t('Aradığınız kriterlere uygun hareket bulunamadı.')}</Text>
        ) : (
          <View style={styles.skeletons}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} rounded={radius.md} />)}</View>
        )}
        renderItem={({ item }) => (
          <ExerciseRow id={item.id} name={item.name_tr} imageKey={item.image_key} photoUri={item.photo_uri} favorite={!!item.is_favorite}
            subtitle={[EQUIPMENT_TR[item.equipment], item.source === 'user' ? t('Kendi hareketin') : item.name_en !== item.name_tr ? item.name_en : null]
              .filter(Boolean).join(' · ')} />
        )}
      />

      <Sheet visible={allParts} onClose={() => setAllParts(false)} title={t('Kas parçaları')}>
        {filterGroups.map((g) => (
          <View key={g.label} style={styles.group}>
            <Text style={type.caption}>{g.label}</Text>
            <View style={styles.wrap}>
              {muscles.filter((m) => g.regionIds.includes(m.regionId)).map((m) => (
                <PillButton key={m.id} label={muscleName.get(m.id)!} active={selected.includes(m.id)} onPress={() => toggle(m.id)} />
              ))}
            </View>
          </View>
        ))}
      </Sheet>
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
  reset: {
    position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  search: {
    minHeight: 48, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.divider,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chips: { gap: spacing.sm },
  more: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  group: { gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  skeletons: { gap: spacing.sm },
});
