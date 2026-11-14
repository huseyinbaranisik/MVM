import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/PillButton';
import { Appear } from '@/components/ui/Skeleton';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getTrackerSettings, updateTrackerSettings } from '@/db/repos/trackers';
import { fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';

const GLASSES = [6, 8, 10, 12];
const STEPS = [6000, 8000, 10000, 12000];
type IconName = Parameters<typeof Icon>[0]['name'];
const TIPS: { icon: IconName; text: string }[] = [
  { icon: 'calendar_month', text: 'Haftalık programın hazır; Program sekmesinden değiştirebilirsin.' },
  { icon: 'home', text: 'Bugün ekranında su, adım ve uykunu tek dokunuşla kaydet.' },
  { icon: 'add', text: 'Ortadaki + ile hızlıca su ekle veya antrenmana başla.' },
];

/** İlk açılışta kısa tanıtım: isim, hedefler, kısa özet. Her adım atlanabilir. */
export default function Onboarding() {
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [glasses, setGlasses] = useState(10);
  const [steps, setSteps] = useState(10000);

  const finish = async (save: boolean) => {
    if (save) {
      const profile = await getSetting(db, 'profile');
      if (name.trim()) await setSetting(db, 'profile', { ...profile, name: name.trim() });
      const water = await getTrackerSettings(db, 'water');
      await updateTrackerSettings(db, 'water', { goal: glasses * (water?.unit_size ?? 250) });
      await updateTrackerSettings(db, 'steps', { goal: steps });
    }
    await setSetting(db, 'onboarded', true);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.dots}>{[0, 1, 2].map((i) => <View key={i} style={[styles.dot, i === step && styles.dotOn]} />)}</View>
        <Pressable onPress={() => finish(false)} hitSlop={12} accessibilityRole="button"><Text style={type.caption}>Atla</Text></Pressable>
      </View>

      <Appear key={step} style={styles.body}>
        {step === 0 ? (
          <>
            <Text style={type.hero}>Hoş geldin!</Text>
            <Text style={styles.lead}>Sana nasıl hitap edelim?</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Adın" placeholderTextColor={colors.textSecondary}
              style={styles.input} maxLength={24} autoFocus accessibilityLabel="Adın" onSubmitEditing={() => setStep(1)} />
          </>
        ) : step === 1 ? (
          <>
            <Text style={type.hero}>Günlük hedeflerin</Text>
            <Text style={styles.lead}>Sonra istediğin zaman değiştirebilirsin.</Text>
            <Text style={type.subtitle}>Su</Text>
            <View style={styles.choices}>
              {GLASSES.map((g) => <PillButton key={g} label={`${g} bardak`} active={glasses === g} onPress={() => setGlasses(g)} style={styles.choice} />)}
            </View>
            <Text style={type.subtitle}>Adım</Text>
            <View style={styles.choices}>
              {STEPS.map((s) => <PillButton key={s} label={fmtInt(s)} active={steps === s} onPress={() => setSteps(s)} style={styles.choice} />)}
            </View>
          </>
        ) : (
          <>
            <Text style={type.hero}>Hazırsın{name.trim() ? `, ${name.trim()}` : ''}!</Text>
            {TIPS.map((t) => (
              <View key={t.icon} style={styles.tip}>
                <View style={styles.tipIcon}><Icon name={t.icon} color={colors.accent} /></View>
                <Text style={[type.body, styles.flex]}>{t.text}</Text>
              </View>
            ))}
          </>
        )}
      </Appear>

      <PillButton label={step < 2 ? 'Devam' : 'Başla'} variant="primary" style={styles.cta}
        onPress={() => (step < 2 ? setStep(step + 1) : finish(true))} />
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
  lead: { ...type.body, color: colors.textSecondary },
  input: {
    minHeight: 60, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider,
    paddingHorizontal: spacing.lg, color: colors.textPrimary, fontSize: 22, fontWeight: '700',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minWidth: '45%', flexGrow: 1 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
  tipIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  cta: { marginBottom: spacing.md },
});
