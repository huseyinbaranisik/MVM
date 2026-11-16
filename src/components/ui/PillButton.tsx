import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';

import { colors, radius, spacing } from '@/theme';

/**
 * Chip/pill buton. Pasif: koyu yüzey + bej kenarlık. Aktif (veya variant="primary"): bordo dolgu, bej yazı.
 */
export function PillButton({ label, onPress, active = false, variant = 'chip', disabled, style, accessibilityLabel }: {
  label: string;
  onPress?: () => void;
  active?: boolean;
  variant?: 'chip' | 'primary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const filled = active || variant === 'primary';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      style={[styles.base, filled ? styles.filled : styles.outline, variant === 'primary' && styles.primary, style]}>
      <Text style={[styles.label, { color: filled ? colors.onPrimary : colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </PressableScale>
  );
}

/** Pill butonlardan oluşan tek seçimli segment */
export function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <PillButton key={o.value} label={o.label} active={o.value === value} onPress={() => onChange(o.value)} style={styles.segment} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  outline: { backgroundColor: colors.surface, borderColor: colors.accentMuted },
  filled: { backgroundColor: colors.primary, borderColor: colors.primary },
  primary: { minHeight: 48, paddingHorizontal: spacing.xl },
  label: { fontSize: 14, fontWeight: '600' },
  segment: { flex: 1 },
});
