import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';

import { colors, radius } from '@/theme';

const ITEM_H = 48;
const VISIBLE = 5;

/** Kaydırmalı tekerlek seçici. Ortadaki değer seçilidir; bir değere dokunmak da onu seçer. */
export function Wheel<T extends number>({ values, value, onChange, format = String, width = 96, label }: {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  width?: number;
  label?: string;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const [current, setCurrent] = useState(() => Math.max(0, values.indexOf(value)));

  const indexOf = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => onChange(values[indexOf(e)]);

  return (
    <View style={{ width, height: ITEM_H * VISIBLE }} accessibilityLabel={label} accessibilityValue={{ text: format(values[current]) }}>
      <View style={styles.band} pointerEvents="none" />
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        // contentOffset Android'de yok: başlangıç konumunu ilk yerleşimde ver
        onLayout={() => ref.current?.scrollTo({ y: current * ITEM_H, animated: false })}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const i = indexOf(e);
          if (i !== current) { setCurrent(i); Haptics.selectionAsync().catch(() => {}); }
        }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}>
        {values.map((v, i) => (
          <Pressable key={v} style={styles.item} accessibilityRole="button" accessibilityLabel={format(v)}
            onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); setCurrent(i); onChange(v); }}>
            <Text style={[styles.text, i === current && styles.active, Math.abs(i - current) > 1 && styles.far]}>{format(v)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute', left: 0, right: 0, top: ITEM_H * 2, height: ITEM_H,
    backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 20, fontWeight: '600', color: colors.textSecondary },
  active: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  far: { opacity: 0.4 },
});
