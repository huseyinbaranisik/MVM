import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { AddToProgramSheet, BackHeader, EQUIPMENT_TR, ExerciseRow } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/ui/overlays';
import { Skeleton } from '@/components/ui/Skeleton';
import { muscles, regions } from '@/data/muscleMap';
import { getExercisesByMuscle, getExercisesByRegion } from '@/db/repos/exercises';
import { useDb } from '@/db/useDb';
import { colors, radius, spacing, type } from '@/theme';

/** id bir bölge (ör. "chest") veya kas parçası (ör. "chest_upper") olabilir. */
export default function MuscleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const region = regions.find((r) => r.id === id);
  const muscle = muscles.find((m) => m.id === id);
  const parentRegion = region ?? regions.find((r) => r.id === muscle?.regionId);
  const parts = region ? muscles.filter((m) => m.regionId === region.id) : [];
  const highlight = region ? parts.map((p) => p.id) : muscle ? [muscle.id] : [];

  const exercises = useDb((db) => (region ? getExercisesByRegion(db, id) : getExercisesByMuscle(db, id)), [id]);
  const [adding, setAdding] = useState<string | null>(null);

  if (!parentRegion) return <BackHeader title="Bulunamadı" />;

  return (
    <View style={styles.screen}>
      <BackHeader title={region ? region.nameTr : muscle!.nameTr} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <BodyMap side={parentRegion.side} mode="part" width={110} primary={highlight} />
          <View style={styles.flex}>
            <Text style={type.title}>{region ? region.nameTr : muscle!.nameTr}</Text>
            {muscle ? <Text style={styles.latin}>{muscle.nameLatin}</Text> : null}
            <Text style={type.body}>
              {muscle ? muscle.description : `${region!.nameTr} bölgesi ${parts.length} parçadan oluşur. Bir parçaya dokunarak ayrıntısını görebilirsin.`}
            </Text>
            {muscle && !region ? (
              <Pressable onPress={() => router.replace(`/muscle/${parentRegion.id}`)} accessibilityRole="button" style={styles.link}>
                <Text style={styles.linkText}>Bölge: {parentRegion.nameTr} ›</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {region ? (
          <View style={styles.card}>
            {parts.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/muscle/${p.id}`)} style={styles.partRow} accessibilityRole="button">
                <View style={styles.flex}>
                  <Text style={type.subtitle}>{p.nameTr}</Text>
                  <Text style={type.caption}>{p.nameLatin}</Text>
                </View>
                <Icon name="chevron_right" color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={type.title}>Bu kası çalıştıran hareketler</Text>
        <View style={styles.card}>
          {!exercises ? [0, 1, 2].map((i) => <Skeleton key={i} height={64} rounded={radius.md} style={styles.sk} />) : null}
          {exercises?.length === 0 ? <Text style={type.caption}>Bu kas için henüz hareket yok.</Text> : null}
          {exercises?.map((e) => (
            <ExerciseRow key={e.id} id={e.id} name={e.name_tr} imageKey={e.image_key} photoUri={null}
              subtitle={EQUIPMENT_TR[e.equipment]} tag={e.role === 'primary' ? 'Birincil' : 'İkincil'}
              right={
                <Pressable onPress={() => setAdding(e.id)} hitSlop={10} style={styles.add}
                  accessibilityRole="button" accessibilityLabel={`${e.name_tr} programıma ekle`}>
                  <Icon name="playlist_add" color={colors.accent} />
                </Pressable>
              } />
          ))}
        </View>
      </ScrollView>
      <AddToProgramSheet exerciseId={adding} onClose={(msg) => { setAdding(null); if (msg) toast(msg); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  top: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  latin: { fontSize: 13, fontStyle: 'italic', color: colors.accentMuted },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.accent, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  partRow: {
    flexDirection: 'row', alignItems: 'center', minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  sk: { marginVertical: spacing.xs },
  add: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
