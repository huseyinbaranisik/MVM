import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { DaySelector } from '@/components/DaySelector';
import { CalorieCard } from '@/components/home/CalorieCard';
import { Checklist } from '@/components/home/Checklist';
import { SleepCard } from '@/components/home/SleepCard';
import { SleepSheet } from '@/components/home/SleepSheet';
import { StepsCard } from '@/components/home/StepsCard';
import { WaterCard } from '@/components/home/WaterCard';
import { WorkoutCard } from '@/components/home/WorkoutCard';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { PressableScale } from '@/components/ui/PressableScale';
import { Appear } from '@/components/ui/Skeleton';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getSleep } from '@/db/repos/sleep';
import { getStreakState } from '@/db/repos/streak';
import { getLevel, XP_TABLES } from '@/db/repos/xp';
import { addTrackerValue } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { formatLongTR, today } from '@/services/dates';
import { startStepTracking } from '@/services/steps';
import { useAppStore } from '@/stores/useAppStore';
import { colors, radius, spacing, type } from '@/theme';

export default function TodayScreen() {
  const date = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setSelectedDate);
  const setStepSensor = useAppStore((s) => s.setStepSensor);
  const header = useDb(async () => ({
    name: (await getSetting('profile')).name,
    onboarded: await getSetting('onboarded'),
    streak: (await getStreakState())?.current ?? 0,
  }), [], ['settings', 'streak_state']);
  const level = useDb(getLevel, [], XP_TABLES)?.level;
  const [morningPrompt, setMorningPrompt] = useState(false);

  // Canlı adım sayımı: uygulama açıkken atılan adımlar bugüne eklenir. Sensör/izin yoksa manuel giriş kalır.
  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    startStepTracking((delta) => addTrackerValue('steps', today(), delta)).then((s) => {
      if (cancelled) { s?.(); return; }
      stop = s;
      setStepSensor(s ? 'on' : 'off');
    });
    return () => { cancelled = true; stop?.(); };
  }, [setStepSensor]);

  // Sabah ilk açılışta "Dün gece nasıl uyudun?" (04:00–12:00, bugün kayıt yoksa, günde bir kez)
  useEffect(() => {
    (async () => {
      const hour = new Date().getHours();
      if (hour < 4 || hour >= 12) return;
      if (!(await getSetting('morningSleepPrompt'))) return;
      if ((await getSetting('lastSleepPrompt')) === today()) return;
      if (await getSleep(today())) return;
      await setSetting('lastSleepPrompt', today());
      setMorningPrompt(true);
    })();
  }, []);

  if (header && !header.onboarded) return <Redirect href="/onboarding" />;
  const name = header?.name ?? '';
  const streak = header?.streak ?? 0;
  return (
    <Screen>
      <Appear index={0}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Profil">
          <Avatar name={name} size={48} level={level} />
        </PressableScale>
        <View style={styles.flex}>
          <Text style={type.caption}>{formatLongTR(date)}</Text>
          <Text style={type.hero} numberOfLines={1} adjustsFontSizeToFit>Selam{name ? `, ${name}` : ''}!</Text>
        </View>
        <PressableScale style={styles.flame} onPress={() => router.push('/streak')} accessibilityRole="button"
          accessibilityLabel={`${streak} günlük seri, ayrıntılar`}>
          <Icon name="local_fire_department" size={24} color={streak ? colors.primaryLight : colors.textSecondary} />
          <Text style={[styles.flameText, streak > 0 && styles.flameOn]}>{streak}</Text>
        </PressableScale>
      </View>

      </Appear>
      <Appear index={1}><DaySelector value={date} onChange={setDate} /></Appear>
      <Appear index={2}><WorkoutCard date={date} /></Appear>

      <Appear index={3} style={styles.section}>
      <Text style={type.title}>Günlük check-in</Text>
      <View style={styles.grid}>
        <WaterCard date={date} />
        <StepsCard date={date} />
      </View>
      </Appear>
      <Appear index={4}><CalorieCard date={date} /></Appear>
      <Appear index={5}><SleepCard date={date} /></Appear>

      <Appear index={6}><Checklist date={date} /></Appear>

      <SleepSheet
        visible={morningPrompt}
        date={today()}
        log={null}
        title="Dün gece nasıl uyudun?"
        onClose={() => setMorningPrompt(false)}
        onNeverAsk={async () => { await setSetting('morningSleepPrompt', false); setMorningPrompt(false); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  flame: {
    flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: spacing.md, minHeight: 40,
    borderRadius: radius.pill, backgroundColor: colors.surface,
  },
  flameText: { fontSize: 16, fontWeight: '800', color: colors.textSecondary },
  flameOn: { color: colors.textPrimary },
  section: { gap: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.md },
});
