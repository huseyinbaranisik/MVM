import { StyleSheet, View } from 'react-native';

import { BodyMap } from '@/components/BodyMap';
import { focusCrop } from '@/data/bodyFocus';
import { body } from '@/data/bodyPaths';
import { getTemplateMuscles } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { spacing } from '@/theme';

const MAX_W_RATIO = 1.1; // çok yayvan kadrajlar kartı taşırmasın

/**
 * Antrenmanın çalıştırdığı kasları kadrajlı gösterir: tüm vücut yerine sadece o bölge ve çevresi
 * (bacak günü → bacaklar). Sadece birincil kasın bulunduğu yüzler (ön/arka) çizilir.
 */
export function TemplateMiniMap({ templateId, height = 84 }: { templateId: number; height?: number }) {
  const m = useDb((db) => getTemplateMuscles(db, templateId), [templateId]);
  if (!m) return <View style={{ height, width: height * 0.6 }} />;
  const sides = (['front', 'back'] as const)
    .map((side) => ({ side, crop: focusCrop(body[side], m.primary) }))
    .filter((s) => s.crop);
  return (
    <View style={styles.row} accessibilityLabel="Çalışan kaslar">
      {sides.map(({ side, crop }) => (
        <BodyMap key={side} side={side} mode="part" crop={crop}
          width={Math.min(height * (crop!.w / crop!.h), height * MAX_W_RATIO)}
          primary={m.primary} secondary={m.secondary} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
});
