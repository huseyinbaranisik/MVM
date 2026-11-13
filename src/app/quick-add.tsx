import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

// Aşama 1 yer tutucu: "+" butonunun açtığı hızlı ekleme. Gerçek bottom sheet Aşama 2'de.
export default function QuickAdd() {
  return (
    <Pressable style={styles.backdrop} onPress={() => router.back()} accessibilityLabel="Kapat">
      <View style={styles.sheet}>
        <Text style={type.title}>Hızlı ekle</Text>
        <Text style={type.caption}>Su, uyku, ölçüm ve antrenman başlatma burada olacak.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
});
