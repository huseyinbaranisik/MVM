import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { PillButton } from '@/components/ui/PillButton';
import { Appear } from '@/components/ui/Skeleton';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getTrackerSettings, updateTrackerSettings } from '@/db/repos/trackers';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

// 3 hazır seçenek + "Özel" (klavyeden giriş)
const GLASSES = [6, 8, 10];
const STEPS = [6000, 8000, 10000];

/** İlk açılışta kısa tanıtım: isim, hedefler, kısa özet. Her adım atlanabilir. */
export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [glasses, setGlasses] = useState(10);
  const [steps, setSteps] = useState(10000);
  const [custom, setCustom] = useState<'water' | 'steps' | null>(null);
  const customGlasses = !GLASSES.includes(glasses);
  const customSteps = !STEPS.includes(steps);

  const finish = async (save: boolean) => {
    if (save) {
      const profile = await getSetting('profile');
      if (name.trim()) await setSetting('profile', { ...profile, name: name.trim() });
      const water = await getTrackerSettings('water');
      await updateTrackerSettings('water', { goal: glasses * (water?.unit_size ?? 250) });
      await updateTrackerSettings('steps', { goal: steps });
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
            <Text style={type.hero}>Günlük hedeflerin</Text>
            <Text style={type.subtitle}>Su</Text>
            <View style={styles.choices}>
              {GLASSES.map((g) => <PillButton key={g} label={`${g} bardak`} active={glasses === g} onPress={() => setGlasses(g)} style={styles.choice} />)}
              <PillButton label={customGlasses ? `${glasses} bardak` : 'Özel'} active={customGlasses} onPress={() => setCustom('water')} style={styles.choice}
                accessibilityLabel="Özel su hedefi gir" />
            </View>
            <Text style={type.subtitle}>Adım</Text>
            <View style={styles.choices}>
              {STEPS.map((s) => <PillButton key={s} label={fmtInt(s)} active={steps === s} onPress={() => setSteps(s)} style={styles.choice} />)}
              <PillButton label={customSteps ? fmtInt(steps) : 'Özel'} active={customSteps} onPress={() => setCustom('steps')} style={styles.choice}
                accessibilityLabel="Özel adım hedefi gir" />
            </View>
          </>
        )}
      </Appear>

      <PillButton label={step < 1 ? 'Devam' : 'Başla'} variant="primary" style={styles.cta}
        onPress={() => (step < 1 ? setStep(step + 1) : finish(true))} />

      <NumberPrompt visible={custom === 'water'} onClose={() => setCustom(null)} title="Günlük su hedefi" suffix="bardak"
        initial={glasses} onSubmit={(v) => setGlasses(Math.max(1, Math.round(v)))} />
      <NumberPrompt visible={custom === 'steps'} onClose={() => setCustom(null)} title="Günlük adım hedefi" suffix="adım"
        initial={steps} min={99} onSubmit={(v) => setSteps(Math.round(v))} />
    </SafeAreaView>
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
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minWidth: '45%', flexGrow: 1 },
  cta: { marginBottom: spacing.md },
});
