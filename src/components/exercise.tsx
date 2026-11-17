import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { exerciseImages } from '@/data/exerciseImages';
import { setFavorite } from '@/db/repos/exercises';
import { addTemplateExercise, createTemplate, getTemplates } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { colors, radius, spacing, type } from '@/theme';

export const EQUIPMENT_TR: Record<string, string> = {
  dumbbell: 'Dambıl', machine: 'Makine', bodyweight: 'Vücut ağırlığı', barbell: 'Barbell', cable: 'Kablo', other: 'Diğer',
};

/** Gömülü görsel (free-exercise-db) veya kullanıcının fotoğrafı. frame: 0 = başlangıç, 1 = bitiş. */
export function exerciseImageSource(imageKey: string | null, photoUri: string | null, frame = 0) {
  if (photoUri) return { uri: photoUri };
  const imgs = imageKey ? exerciseImages[imageKey] : undefined;
  return imgs ? imgs[Math.min(frame, imgs.length - 1)] : null;
}

export function ExerciseThumb({ imageKey, photoUri, size = 56 }: { imageKey: string | null; photoUri: string | null; size?: number }) {
  const src = exerciseImageSource(imageKey, photoUri);
  return src ? (
    <Image source={src} style={{ width: size, height: size, borderRadius: radius.sm }} contentFit="cover" accessibilityIgnoresInvertColors />
  ) : (
    <View style={[styles.thumbEmpty, { width: size, height: size }]}><Icon name="fitness_center" color={colors.textSecondary} /></View>
  );
}

export function ExerciseRow({ id, name, imageKey, photoUri, subtitle, tag, right, favorite }: {
  id: string; name: string; imageKey: string | null; photoUri: string | null; subtitle?: string; tag?: string; right?: ReactNode;
  /** verilirse yıldız butonu görünür */
  favorite?: boolean;
}) {
  return (
    <Pressable onPress={() => router.push(`/exercise/${encodeURIComponent(id)}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button" accessibilityLabel={name}>
      <ExerciseThumb imageKey={imageKey} photoUri={photoUri} />
      <View style={styles.flex}>
        <Text style={type.subtitle} numberOfLines={2}>{name}</Text>
        {subtitle ? <Text style={type.caption} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {tag ? <Text style={[styles.tag, tag === 'Birincil' && styles.tagPrimary]}>{tag}</Text> : null}
      {favorite != null ? <FavoriteButton id={id} name={name} favorite={favorite} /> : null}
      {right}
    </Pressable>
  );
}

/** Favori yıldızı; favoriler listelerde en üstte durur. */
export function FavoriteButton({ id, name, favorite }: { id: string; name: string; favorite: boolean }) {
  return (
    <Pressable onPress={() => setFavorite(id, !favorite)} hitSlop={8} style={styles.star}
      accessibilityRole="button" accessibilityState={{ selected: favorite }}
      accessibilityLabel={favorite ? `${name} favorilerden çıkar` : `${name} favorilere ekle`}>
      <Icon name="star" color={favorite ? colors.warning : colors.divider} />
    </Pressable>
  );
}

/** Geri butonlu sayfa başlığı */
export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.headerSafe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Geri">
          <Icon name="arrow_back" />
        </Pressable>
        <Text style={[type.title, styles.flex]} numberOfLines={1}>{title}</Text>
        {right}
      </View>
    </SafeAreaView>
  );
}

/** "Plana ekle": şablon seç (ya da yeni şablon aç), hareket şablonun sonuna eklenir. */
export function AddToProgramSheet({ exerciseId, onClose }: { exerciseId: string | null; onClose: (msg?: string) => void }) {
  const templates = useDb(() => getTemplates(), [], ['workout_templates', 'template_exercises']) ?? [];
  const add = async (templateId: number, name: string) => {
    if (!exerciseId) return;
    await addTemplateExercise(templateId, exerciseId);
    onClose(`${name} planına eklendi`);
  };
  return (
    <Sheet visible={!!exerciseId} onClose={() => onClose()} title="Plana ekle">
      {templates.map((t) => (
        <SheetRow key={t.id} label={t.name} value={`${t.exerciseCount} hareket`} onPress={() => add(t.id, t.name)} />
      ))}
      <SheetRow label="+ Yeni şablon" onPress={async () => {
        try { await add(await createTemplate('Yeni antrenman'), 'Yeni antrenman'); } catch (e) { onClose(e instanceof Error ? e.message : 'Şablon oluşturulamadı'); }
      }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  thumbEmpty: { borderRadius: radius.sm, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 64 },
  pressed: { opacity: 0.6 },
  tag: {
    fontSize: 11, fontWeight: '700', color: colors.accentMuted, borderWidth: 1, borderColor: colors.accentMuted,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill,
  },
  tagPrimary: { color: colors.onPrimary, backgroundColor: colors.primary, borderColor: colors.primary },
  headerSafe: { backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  back: { minWidth: 32, minHeight: 32, justifyContent: 'center' },
  star: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
