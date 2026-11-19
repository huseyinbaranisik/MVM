import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { locale, t } from '@/i18n';

/** Tek sayı soran sheet (hedef, bardak hacmi, adım uzunluğu, adım ekleme…). */
export function NumberPrompt({ visible, title, initial, suffix, min = 0, quick, onSubmit, onClose }: {
  visible: boolean;
  title: string;
  initial?: number;
  suffix?: string;
  min?: number;
  /** hızlı seçim butonları */
  quick?: number[];
  onSubmit: (value: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [prevVisible, setPrevVisible] = useState(false);
  // her açılışta başlangıç değerini yükle
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setText(initial != null ? String(initial).replace('.', ',') : '');
  }
  const value = parseNumber(text);
  const valid = value != null && value > min;
  const submit = (v: number) => { onSubmit(v); onClose(); };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          autoFocus
          selectTextOnFocus
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel={title}
          onSubmitEditing={() => valid && submit(value)}
        />
        {suffix ? <Text style={type.subtitle}>{suffix}</Text> : null}
      </View>
      {quick ? (
        <View style={styles.quick}>
          {quick.map((q) => <PillButton key={q} label={`+${q.toLocaleString(locale)}`} onPress={() => submit(q)} />)}
        </View>
      ) : null}
      <PillButton label={t('Kaydet')} variant="primary" disabled={!valid} onPress={() => valid && submit(value)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  quick: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
