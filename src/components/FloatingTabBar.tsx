import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { colors, radius, spacing } from '@/theme';
import { t } from '@/i18n';

type IconName = Parameters<typeof Icon>[0]['name'];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: t('Bugün'), icon: 'home' },
  program: { label: t('Program'), icon: 'calendar_month' },
  profile: { label: t('Profil'), icon: 'person' },
  library: { label: t('Kütüphane'), icon: 'fitness_center' },
  stats: { label: t('İstatistik'), icon: 'bar_chart' },
};

export const TAB_BAR_HEIGHT = 68;
const BUBBLE = 40;

export function FloatingTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === i;
          const onPress = () => {
            const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigateToTab(route.key);
          };
          return <TabItem key={route.key} label={tab.label} icon={tab.icon} focused={focused} onPress={onPress} />;
        })}
      </View>
    </View>
  );
}

/** Seçili sekmenin ikonu ana renkli bir dairenin içine girer ve hafifçe büyür. */
function TabItem({ label, icon, focused, onPress }: { label: string; icon: IconName; focused: boolean; onPress: () => void }) {
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => { focus.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 180 }); }, [focused, focus]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(focus.value, [0, 1], [1, 1.12]) }] }));
  // Fabric: sonradan eklenen arka plan borderRadius'u yok sayıyor, daire hep çizili kalır, sadece opaklığı değişir
  const bubble = useAnimatedStyle(() => ({ opacity: focus.value }));
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
      <Animated.View style={[styles.iconWrap, grow]}>
        <Animated.View style={[styles.bubble, bubble]} />
        <Icon name={icon} size={24} color={focused ? colors.onPrimary : colors.textSecondary} />
      </Animated.View>
      <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>{label}</Text>
    </Pressable>
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
    paddingHorizontal: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0, minHeight: 48 },
  iconWrap: { width: BUBBLE, height: BUBBLE, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute',
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: colors.primary,
  },
  label: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  labelOn: { color: colors.textPrimary, fontWeight: '800' },
});
