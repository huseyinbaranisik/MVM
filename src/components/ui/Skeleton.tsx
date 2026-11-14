import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { BackHeader } from '@/components/exercise';
import { colors, radius, spacing } from '@/theme';

/** Veri yüklenirken gösterilen, hafifçe parlayan gri iskelet kutusu. */
export function Skeleton({ height, width = '100%', rounded = radius.lg, style }: {
  height: number; width?: DimensionValue; rounded?: number; style?: StyleProp<ViewStyle>;
}) {
  const glow = useSharedValue(0.45);
  useEffect(() => { glow.value = withRepeat(withTiming(1, { duration: 750 }), -1, true); }, [glow]);
  const anim = useAnimatedStyle(() => ({ opacity: glow.value }));
  return <Animated.View style={[{ height, width, borderRadius: rounded, backgroundColor: colors.surface }, anim, style]} />;
}

/** Detay ekranları için başlık + iskelet blokları. */
export function LoadingScreen({ blocks = [220, 120, 260] }: { blocks?: number[] }) {
  return (
    <View style={styles.screen}>
      <BackHeader title="" />
      <View style={styles.body}>{blocks.map((h, i) => <Skeleton key={i} height={h} />)}</View>
    </View>
  );
}

/** İçeriğin yukarıdan aşağı sırayla, hafif gecikmeyle yerine oturması. */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeInDown.delay(index * 70).duration(380)} style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.lg },
});
