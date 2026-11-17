import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

/** Yuvarlak avatar: baş harf; `level` verilirse sağ altta seviye rozeti. */
export function Avatar({ name, size, level }: { name: string; size: number; level?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.charAt(0).toLocaleUpperCase('tr-TR') || '?'}</Text>
      </View>
      {level != null ? (
        <View style={styles.badge} accessibilityLabel={`Seviye ${level}`}>
          <Text style={styles.badgeText}>{level}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.accentMuted,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  initial: { fontWeight: '800', color: colors.accent },
  badge: {
    position: 'absolute', right: -4, bottom: -4, minWidth: 22, height: 22, paddingHorizontal: 4,
    borderRadius: radius.pill, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.onPrimary },
});
