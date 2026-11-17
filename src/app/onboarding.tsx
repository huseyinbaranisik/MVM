import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton } from '@/components/ui/PillButton';
import { Appear } from '@/components/ui/Skeleton';
import { saveMeasurement } from '@/db/repos/measurements';
import { getSetting, setSetting } from '@/db/repos/settings';
import { today } from '@/services/dates';
import { parseNumber } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

/** İlk açılış: isim, sonra yaş, boy ve kilo. Hedefleri kullanıcı uygulamada kendisi girer. Her adım atlanabilir. */
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const finish = async (save: boolean) => {
    if (save) {
      const profile = await getSetting('profile');
      const a = parseNumber(age);
      await setSetting('profile', {
        ...profile,
        name: name.trim() || profile.name,
        age: a != null && a >= 5 && a <= 120 ? Math.round(a) : profile.age,
      });
      const h = parseNumber(height);
      if (h != null && h >= 80 && h <= 250) await saveMeasurement('height', Math.round(h), today());
      const w = parseNumber(weight);
      if (w != null && w >= 20 && w <= 400) await saveMeasurement('weight', Math.round(w * 10) / 10, today());
    }
    await setSetting('onboarded', true);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.dots}>{[0, 1].map((i) => <View key={i} style={[styles.dot, i === step && styles.dotOn]} />)}</View>
        <Pressable onPress={() => finish(false)} hitSlop={12} accessibilityRole="button"><Text style={type.caption}>Atla</Text></Pressable>
      </View>

      <Appear key={step} style={styles.body}>
        {step === 0 ? (
          <>
            <Text style={type.hero}>Hoş geldin!</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Adın" placeholderTextColor={colors.textSecondary}
              style={styles.input} maxLength={24} autoFocus accessibilityLabel="Adın" onSubmitEditing={() => setStep(1)} />
          </>
        ) : (
          <>
            <Text style={type.hero}>Seni tanıyalım</Text>
            <NumField label="Yaş" suffix="yaşında" value={age} onChange={setAge} autoFocus />
            <NumField label="Boy" suffix="cm" value={height} onChange={setHeight} />
            <NumField label="Kilo" suffix="kg" value={weight} onChange={setWeight} decimal />
          </>
        )}
      </Appear>

      <PillButton label={step < 1 ? 'Devam' : 'Başla'} variant="primary" style={styles.cta}
        onPress={() => (step < 1 ? setStep(step + 1) : finish(true))} />
    </SafeAreaView>
  );
}

function NumField({ label, suffix, value, onChange, decimal, autoFocus }: {
  label: string; suffix: string; value: string; onChange: (v: string) => void; decimal?: boolean; autoFocus?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.subtitle, styles.fieldLabel]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} maxLength={5}
        placeholder="—" placeholderTextColor={colors.textSecondary} style={styles.numInput} autoFocus={autoFocus} accessibilityLabel={label} />
      <Text style={[type.caption, styles.suffix]}>{suffix}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.divider },
  dotOn: { width: 24, backgroundColor: colors.primaryLight },
  body: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  input: {
    minHeight: 60, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 22, fontWeight: '700',
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, paddingHorizontal: spacing.lg,
  },
  fieldLabel: { width: 56 },
  numInput: { flex: 1, color: colors.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'right', padding: 0 },
  suffix: { width: 56 },
  cta: { marginBottom: spacing.md },
});
