import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';

import { BRAND } from '@/components/Logo';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
// Logo ile aynı "M" (src/components/Logo.tsx); çizginin uzunluğu: iki dikey (42) + iki çapraz (26√2)
const POINTS = '24,72 24,30 50,56 76,30 76,72';
const LENGTH = 42 * 2 + 26 * Math.SQRT2 * 2;
const SIZE = 120; // yerel açılış görselindeki M ile aynı boyut (app.json imageWidth)
export const SPLASH_MS = 2500;
const DRAW_MS = 2000;

/**
 * Açılış animasyonu: soluk M'nin üzerinde çizgi sol alttan başlayıp harfi doldurur, dolunca M hafifçe büyür, ekran söner.
 * Uygulama bu sırada arkada yüklenir; süre sabittir (SPLASH_MS), bitince onDone.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);

  useEffect(() => {
    progress.set(withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) }));
    scale.set(withSequence(withTiming(1, { duration: DRAW_MS }), withTiming(1.14, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(1.1, { duration: 120 })));
    fade.set(withSequence(withTiming(1, { duration: DRAW_MS + 300 }), withTiming(0, { duration: SPLASH_MS - DRAW_MS - 300 })));
    const t = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(t);
  }, [progress, scale, fade, onDone]);

  const stroke = useAnimatedProps(() => ({ strokeDashoffset: LENGTH * (1 - progress.get()) }));
  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const screen = useAnimatedStyle(() => ({ opacity: fade.get() }));

  return (
    <Animated.View style={[styles.screen, screen]} accessibilityLabel="Yükleniyor">
      <Animated.View style={grow}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 100 100">
          <Polyline points={POINTS} fill="none" stroke={BRAND.mark} strokeOpacity={0.14} strokeWidth={13}
            strokeLinecap="round" strokeLinejoin="round" />
          <AnimatedPolyline points={POINTS} fill="none" stroke={BRAND.mark} strokeWidth={13} strokeLinecap="round"
            strokeLinejoin="round" strokeDasharray={`${LENGTH} ${LENGTH}`} animatedProps={stroke} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/** Uygulama hâlâ hazır değilse (yavaş bağlantı) animasyonun son karesi: dolu M. */
export function SplashStill() {
  return (
    <Animated.View style={styles.still}>
      <Svg width={SIZE * 1.1} height={SIZE * 1.1} viewBox="0 0 100 100">
        <Polyline points={POINTS} fill="none" stroke={BRAND.mark} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  still: { flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center' },
});
