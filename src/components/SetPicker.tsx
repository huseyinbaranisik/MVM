import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { Wheel } from '@/components/ui/Wheel';
import { KG_VALUES, nearest, REP_VALUES } from '@/services/workout';
import { fmtDec, parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

export interface SetPickerTarget { title: string; kg: number; reps: number | null }

/** Set için kilo/tekrar seçimi: tekerlekler, gerekirse elle giriş. reps null → süreli hareket, sadece kilo. */
export function SetPicker({ target, onSave, onClose }: {
  target: SetPickerTarget | null;
  onSave: (kg: number, reps: number | null) => void;
  onClose: () => void;
}) {
  const [kg, setKg] = useState(2.5);
  const [reps, setReps] = useState<number | null>(10);
  const [manual, setManual] = useState(false);
  const [kgText, setKgText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [prev, setPrev] = useState<SetPickerTarget | null>(null);
  if (target !== prev) {
    setPrev(target);
    if (target) {
      setKg(nearest(KG_VALUES, target.kg));
      setReps(target.reps == null ? null : nearest(REP_VALUES, target.reps));
      setManual(false);
      setKgText(fmtDec(target.kg, 2));
      setRepsText(target.reps == null ? '' : String(target.reps));
    }
  }

  const save = () => {
    if (manual) {
      const k = parseNumber(kgText);
      const r = parseNumber(repsText);
      if (k == null || k < 0 || (reps != null && (r == null || r < 1))) return;
      onSave(k, reps == null ? null : Math.round(r!));
    } else onSave(kg, reps);
    onClose();
  };

  return (
    <Sheet visible={!!target} onClose={onClose} title={target?.title}>
      {manual ? (
        <View style={styles.row}>
          <Field label="kg" value={kgText} onChange={setKgText} />
          {reps != null ? <Field label={t('Tekrar')} value={repsText} onChange={setRepsText} /> : null}
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={type.caption}>kg</Text>
            <Wheel key={`kg-${target?.title}`} values={KG_VALUES} value={kg} onChange={setKg} format={(v) => fmtDec(v, 1)} width={120} label={t('Kilo')} />
          </View>
          {reps != null ? (
            <View style={styles.col}>
              <Text style={type.caption}>{t('Tekrar')}</Text>
              <Wheel key={`r-${target?.title}`} values={REP_VALUES} value={reps} onChange={setReps} width={120} label={t('Tekrar')} />
            </View>
          ) : null}
        </View>
      )}
      <PillButton label={t('Tamam')} variant="primary" onPress={save} />
      <Pressable onPress={() => setManual(!manual)} style={styles.link} accessibilityRole="button">
        <Text style={styles.linkText}>{manual ? t('Listeden seç') : t('Elle gir')}</Text>
      </Pressable>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.col}>
      <Text style={type.caption}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" selectTextOnFocus
        style={styles.input} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  col: { alignItems: 'center', gap: spacing.sm, flex: 1, maxWidth: 160 },
  input: {
    alignSelf: 'stretch', minHeight: 56, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.divider, color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center',
  },
  link: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.accentMuted, fontWeight: '600' },
});
