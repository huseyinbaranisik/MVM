import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SWEEP = 0.75; // 270°

/**
 * 270° açık halka (altı açık). Dolu kısım animasyonla dolar; hedef dolunca (progress ≥ 1) halka parlar.
 */
export function RingGauge({ size, stroke = 12, progress, color, trackColor = colors.divider, children }: {
  size: number;
  stroke?: number;
  progress: number;
  color: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke * 2) / 2; // parlama halkasına yer bırak
  const c = 2 * Math.PI * r;
  const arc = c * SWEEP;
  const complete = progress >= 1;

  const p = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [p, progress]);
  useEffect(() => {
    glow.value = complete
      ? withRepeat(withSequence(withTiming(0.45, { duration: 900 }), withTiming(0.15, { duration: 900 })), -1)
      : withTiming(0, { duration: 300 });
  }, [glow, complete]);

  const fillProps = useAnimatedProps(() => ({
    strokeDashoffset: arc * (1 - p.value),
    strokeOpacity: p.value > 0.001 ? 1 : 0, // 0'da yuvarlak uç nokta gibi görünmesin
  }));
  const glowProps = useAnimatedProps(() => ({ strokeOpacity: glow.value }));

  const common = {
    cx: size / 2, cy: size / 2, r, fill: 'none', strokeLinecap: 'round' as const,
    strokeDasharray: `${arc} ${c}`, transform: `rotate(135 ${size / 2} ${size / 2})`,
  };

  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(progress, 1) * 100) }}>
      <Svg width={size} height={size}>
        <AnimatedCircle {...common} stroke={color} strokeWidth={stroke * 2} animatedProps={glowProps} />
        <Circle {...common} stroke={trackColor} strokeWidth={stroke} />
        <AnimatedCircle {...common} stroke={color} strokeWidth={stroke} animatedProps={fillProps} />
      </Svg>
      <View style={styles.center} pointerEvents="none">{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
