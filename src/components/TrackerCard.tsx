import * as Haptics from 'expo-haptics';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { RingGauge } from '@/components/RingGauge';
import { colors, radius, spacing, type } from '@/theme';

type IconName = Parameters<typeof Icon>[0]['name'];

/**
 * Su/Adım/Uyku kartlarının ortak iskeleti. Yeni bir takip eklemek = bu kartı yeni değerlerle kullanmak.
 * layout="square": halka ortada, altta sayaç. layout="wide": halka solda, `side` sağda.
 */
export function TrackerCard({ title, icon, color, progress, value, caption, onMenu, onPress, footer, side, layout = 'square', resetKey }: {
  /** değişince (ör. seçili gün) kutlama tetiklenmez, sadece yeni durum kabul edilir */
  resetKey?: string;
  title: string;
  icon: IconName;
  color: string;
  progress: number;
  value: string;
  caption: string;
  onMenu: () => void;
  onPress?: () => void;
  footer?: ReactNode;
  side?: ReactNode;
  layout?: 'square' | 'wide';
}) {
  const complete = progress >= 1;
  const wasComplete = useRef(complete);
  const lastKey = useRef(resetKey);
  const pop = useSharedValue(0);

  // Hedef bu oturumda dolduğunda (ilk açılışta veya gün değişiminde değil): titreşim + küçük kutlama
  useEffect(() => {
    const sameKey = lastKey.current === resetKey;
    lastKey.current = resetKey;
    if (sameKey && complete && !wasComplete.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      pop.value = withSequence(withSpring(1, { damping: 6 }), withTiming(1, { duration: 900 }), withTiming(0, { duration: 300 }));
    }
    wasComplete.current = complete;
  }, [complete, pop, resetKey]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.06 }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ translateY: (1 - pop.value) * 8 }] }));

  const ringSize = layout === 'wide' ? 128 : 132;
  const ring = (
    <Animated.View style={ringStyle}>
      <RingGauge size={ringSize} progress={progress} color={color}>
        {/* Android'da yazının küçülebilmesi için sabit genişlik gerekir; halkanın iç çapına sığdır */}
        <Text style={[styles.value, { width: ringSize * 0.6 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
        <Text style={styles.caption} numberOfLines={2}>{caption}</Text>
      </RingGauge>
    </Animated.View>
  );

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.card, layout === 'square' && styles.square]}
      accessibilityLabel={`${title}: ${value} ${caption}`}>
      <View style={styles.header}>
        <Icon name={icon} size={18} color={color} />
        <Text style={[type.subtitle, styles.title]}>{title}</Text>
        <Pressable onPress={onMenu} hitSlop={12} style={styles.menu} accessibilityRole="button" accessibilityLabel={`${title} menüsü`}>
          <Icon name="more_horiz" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>
      {layout === 'wide' ? (
        <View style={styles.wideRow}>{ring}<View style={styles.side}>{side}</View></View>
      ) : (
        <View style={styles.ringWrap}>{ring}</View>
      )}
      <Animated.View style={[styles.badge, badgeStyle]} pointerEvents="none">
        <Text style={styles.badgeText}>🎉 Hedef tamam!</Text>
      </Animated.View>
      {footer}
    </Pressable>
  );
}

/** -/+ sayaç */
export function Counter({ onMinus, onPlus, minusLabel, plusLabel }: {
  onMinus: () => void; onPlus: () => void; minusLabel: string; plusLabel: string;
}) {
  return (
    <View style={styles.counter}>
      <Pressable onPress={onMinus} style={styles.counterBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={minusLabel}>
        <Icon name="remove" size={22} color={colors.textPrimary} />
      </Pressable>
      <Pressable onPress={onPlus} style={[styles.counterBtn, styles.plus]} hitSlop={6} accessibilityRole="button" accessibilityLabel={plusLabel}>
        <Icon name="add" size={22} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  square: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  menu: { minWidth: 32, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  ringWrap: { alignItems: 'center' },
  wideRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  side: { flex: 1, gap: spacing.sm },
  value: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  caption: { fontSize: 11, fontWeight: '500', color: colors.textSecondary, textAlign: 'center', maxWidth: 92 },
  badge: { position: 'absolute', top: spacing.lg + 28, alignSelf: 'center' },
  badgeText: {
    fontSize: 12, fontWeight: '700', color: colors.accent, backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, overflow: 'hidden',
  },
  counter: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  counterBtn: {
    width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.divider,
  },
  plus: { backgroundColor: colors.primary, borderColor: colors.primary },
});
