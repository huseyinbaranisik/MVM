import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme';

type IconName = Parameters<typeof Icon>[0]['name'];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Bugün', icon: 'home' },
  program: { label: 'Program', icon: 'calendar_month' },
  library: { label: 'Kütüphane', icon: 'fitness_center' },
  stats: { label: 'İstatistik', icon: 'bar_chart' },
};

export const TAB_BAR_HEIGHT = 68;

export function FloatingTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const items = state.routes.map((route, i) => {
    const tab = TABS[route.name];
    if (!tab) return null;
    const focused = state.index === i;
    const onPress = () => {
      const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigateToTab(route.key);
    };
    const tint = focused ? colors.accent : colors.textSecondary;
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.item}
        accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label}>
        <Icon name={tab.icon} size={24} color={tint} />
        <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
      </Pressable>
    );
  });

  const plus = (
    <Pressable key="plus" onPress={() => router.push('/quick-add')} style={styles.plus}
      accessibilityRole="button" accessibilityLabel="Hızlı ekle">
      <Icon name="add" size={32} color={colors.accent} />
    </Pressable>
  );

  // ortadaki "+" iki sekme arasına
  const half = Math.ceil(items.length / 2);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.bar}>{[...items.slice(0, half), plus, ...items.slice(half)]}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48 },
  label: { fontSize: 11, fontWeight: '600' },
  plus: {
    width: 60,
    height: 60,
    marginTop: -28,
    marginHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
