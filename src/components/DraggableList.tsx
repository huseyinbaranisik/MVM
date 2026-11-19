import * as Haptics from 'expo-haptics';
import { useMemo, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { colors, spacing } from '@/theme';
import { t } from '@/i18n';

/**
 * Sabit satır yüksekliğiyle sürükle-bırak sıralama. Satırı sağdaki tutamaçtan sürükle.
 * Bırakınca onReorder yeni sıradaki anahtarlarla çağrılır.
 */
export function DraggableList<T>({ items, keyOf, rowHeight, renderRow, onReorder }: {
  items: T[];
  keyOf: (item: T) => string | number;
  rowHeight: number;
  renderRow: (item: T, index: number) => ReactNode;
  onReorder: (keys: (string | number)[]) => void;
}) {
  const active = useSharedValue(-1);
  const offset = useSharedValue(0);

  const drop = (from: number, dy: number) => {
    const to = Math.max(0, Math.min(items.length - 1, from + Math.round(dy / rowHeight)));
    if (to !== from) {
      const keys = items.map(keyOf);
      const [moved] = keys.splice(from, 1);
      keys.splice(to, 0, moved);
      onReorder(keys);
    }
  };

  return (
    <View style={{ height: items.length * rowHeight }}>
      {items.map((item, i) => (
        <Row key={keyOf(item)} index={i} count={items.length} rowHeight={rowHeight} active={active} offset={offset} onDrop={drop}>
          {renderRow(item, i)}
        </Row>
      ))}
    </View>
  );
}

function Row({ index, count, rowHeight, active, offset, onDrop, children }: {
  index: number; count: number; rowHeight: number;
  active: SharedValue<number>; offset: SharedValue<number>;
  onDrop: (from: number, dy: number) => void; children: ReactNode;
}) {
  // RN'in kendi PanResponder'ı: Expo Go dahil her yerde çalışır; tutamaç sürüklenirken ScrollView devralamaz
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      active.set(index);
      offset.set(0);
      Haptics.selectionAsync().catch(() => {});
    },
    onPanResponderMove: (_, g) => { offset.set(g.dy); },
    onPanResponderRelease: (_, g) => {
      const dy = g.dy;
      // satırlar yeni yerlerine kayarken bırakılan satırı da oraya oturt, sonra listeyi yeniden sırala
      const to = Math.max(0, Math.min(count - 1, index + Math.round(dy / rowHeight)));
      offset.set(withTiming((to - index) * rowHeight, { duration: 120 }));
      setTimeout(() => {
        active.set(-1);
        offset.set(0);
        onDrop(index, dy);
      }, 130);
    },
    onPanResponderTerminate: () => { active.set(-1); offset.set(0); },
  }), [active, offset, index, count, rowHeight, onDrop]);

  const style = useAnimatedStyle(() => {
    const a = active.get();
    let y = index * rowHeight;
    if (a === index) return { top: y + offset.get(), zIndex: 10, elevation: 6, opacity: 0.95 };
    if (a >= 0) {
      const target = Math.max(0, Math.min(count - 1, a + Math.round(offset.get() / rowHeight)));
      if (a < index && index <= target) y -= rowHeight;
      if (target <= index && index < a) y += rowHeight;
    }
    return { top: withTiming(y, { duration: 120 }), zIndex: 0, elevation: 0, opacity: 1 };
  });

  return (
    <Animated.View style={[styles.row, { height: rowHeight }, style]}>
      <View style={styles.content}>{children}</View>
      <View style={styles.handle} accessibilityLabel={t('Sıralamak için sürükle')} {...pan.panHandlers}>
        <Icon name="drag_indicator" color={colors.textSecondary} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  content: { flex: 1 },
  handle: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center', marginRight: -spacing.sm },
});
