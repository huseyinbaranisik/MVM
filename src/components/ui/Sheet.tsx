import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radius, spacing, type } from '@/theme';

const OFFSCREEN = 900;
const CLOSE_MS = 200;
const SPRING = { damping: 22, stiffness: 240, mass: 0.9 };

/**
 * Alttan yaylanarak açılan sayfa. Arka plana dokununca, geri tuşuyla veya tutamaçtan aşağı sürükleyince kapanır.
 * Kapanırken önce animasyon oynar, sonra Modal kaldırılır.
 */
export function Sheet({ visible, onClose, title, children }: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(OFFSCREEN);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      fade.value = withTiming(1, { duration: 220 });
      y.value = withSpring(0, SPRING);
      return;
    }
    fade.value = withTiming(0, { duration: CLOSE_MS });
    y.value = withTiming(OFFSCREEN, { duration: CLOSE_MS });
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [visible, fade, y]);

  const drag = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
    onPanResponderMove: (_, g) => { y.set(Math.max(0, g.dy)); },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 110 || g.vy > 1.2) onClose();
      else y.set(withSpring(0, SPRING));
    },
  }), [y, onClose]);

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
        <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Kapat" />
      </Animated.View>
      <KeyboardAvoidingView style={styles.end} behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }, sheet]}>
          <View {...drag.panHandlers} style={styles.grab} accessibilityLabel="Kapatmak için aşağı sürükle">
            <View style={styles.handle} />
            {title ? <Text style={type.title}>{title}</Text> : null}
          </View>
          {/* "always": klavye açıkken de butona ilk dokunuş doğrudan çalışsın */}
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="always">{children}</ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Sheet içinde tıklanabilir menü satırı */
export function SheetRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={[type.body, styles.rowLabel]} numberOfLines={2}>{label}</Text>
      {value ? <Text style={type.caption} numberOfLines={1}>{value}</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  end: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    maxHeight: '88%',
  },
  grab: { paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.divider },
  body: { gap: spacing.md },
  row: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surface,
  },
  rowLabel: { flex: 1 },
});
