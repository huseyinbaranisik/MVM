import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/FloatingTabBar';
import { colors, spacing } from '@/theme';

/** Sayfa iskeleti: güvenli alan + kaydırma + yüzen tab bar'ın altında kalmayan boşluk. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: TAB_BAR_HEIGHT + spacing.xxl * 2 },
});
