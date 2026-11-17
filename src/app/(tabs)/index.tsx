import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

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
import { DEFAULT_LAYOUT, toRows, type HomeCardId, type HomeCardSize } from '@/services/homeLayout';
import { startStepTracking } from '@/services/steps';
import { autoConnectHealthConnect } from '@/services/healthConnect';
import { syncStepsFromHealthConnect } from '@/services/stepSync';
import { useAppStore } from '@/stores/useAppStore';
import { colors, radius, spacing, type } from '@/theme';

export default function TodayScreen() {
  const date = useAppStore((s) => s.selectedDate);
  const setDate = useAppStore((s) => s.setSelectedDate);
  const setStepSensor = useAppStore((s) => s.setStepSensor);
  const healthTick = useAppStore((s) => s.healthTick);
  const header = useDb(async () => ({
    name: (await getSetting('profile')).name,
    onboarded: await getSetting('onboarded'),
    streak: (await getStreakState())?.current ?? 0,
    layout: await getSetting('homeLayout'),
  }), [], ['settings', 'streak_state']);
  const level = useDb(getLevel, [], XP_TABLES)?.level;
  const [morningPrompt, setMorningPrompt] = useState(false);

  // Adımlar otomatik: Health Connect varsa ilk açılışta izni kendiliğinden istenir. Bağlıysa telefonun arka planda saydığı adımlar (açılışta, uygulamaya dönünce ve dakikada bir) alınır;
  // değilse uygulama açıkken telefon sensörü sayar. İkisi birlikte çalışmaz, yoksa adımlar iki kez sayılır.
  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const appSub = AppState.addEventListener('change', (st) => { if (st === 'active') syncStepsFromHealthConnect(); });
    autoConnectHealthConnect().then(() => syncStepsFromHealthConnect()).then(async (health) => {
      if (cancelled) return;
      if (health) {
        setStepSensor('health');
        timer = setInterval(() => syncStepsFromHealthConnect(1), 60_000);
        return;
      }
      const s = await startStepTracking((delta) => addTrackerValue('steps', today(), delta));
      if (cancelled) { s?.(); return; }
      stop = s;
      setStepSensor(s ? 'on' : 'off');
    });
    return () => { cancelled = true; stop?.(); appSub.remove(); if (timer) clearInterval(timer); };
  }, [setStepSensor, healthTick]);

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
  const rows = toRows(header?.layout ?? DEFAULT_LAYOUT);
  return (
    <Screen>
      <Appear index={0}>
      <View style={styles.header}>
        <PressableScale onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Profil">
          <Avatar size={48} level={level} />
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
      {rows.map((row, i) => (
        <Appear key={row.map((x) => x.id).join('-')} index={i + 2} style={styles.row}>
          {row.map((it) => <View key={it.id} style={styles.flex}><HomeCard id={it.id} size={it.size} date={date} /></View>)}
          {row.length === 1 && row[0].size === 'small' ? <View style={styles.flex} /> : null}
        </Appear>
      ))}

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
  row: { flexDirection: 'row', gap: spacing.md },
});

function HomeCard({ id, size, date }: { id: HomeCardId; size: HomeCardSize; date: string }) {
  switch (id) {
    case 'workout': return <WorkoutCard date={date} />;
    case 'water': return <WaterCard date={date} size={size} />;
    case 'steps': return <StepsCard date={date} size={size} />;
    case 'calories': return <CalorieCard date={date} size={size} />;
    case 'sleep': return <SleepCard date={date} size={size} />;
    case 'checklist': return <Checklist date={date} />;
  }
}
