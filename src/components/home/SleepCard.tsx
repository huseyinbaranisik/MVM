import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SleepSheet } from '@/components/home/SleepSheet';
import { TrackerCard } from '@/components/TrackerCard';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { pickTime } from '@/components/ui/overlays';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getSleepRange } from '@/db/repos/sleep';
import { getTrackerSettings, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { addDays } from '@/services/dates';
import { cancelReminder, scheduleDaily } from '@/services/notifications';
import { averageBedtime, formatDuration, QUALITY_EMOJI, type SleepDisplay } from '@/services/sleep';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing, type } from '@/theme';

const BEDTIME_ID = 'bedtime-reminder';

export function SleepCard({ date }: { date: string }) {
  const data = useDb(async () => {
    const week = await getSleepRange(addDays(date, -6), date);
    return {
      date,
      week,
      log: week.find((l) => l.date === date) ?? null,
      s: await getTrackerSettings('sleep'),
      notif: await getSetting('notifications'),
    };
  }, [date], ['sleep_logs', 'tracker_settings', 'settings']);
  const [open, setOpen] = useState<'entry' | 'menu' | 'goal' | null>(null);
  const [notice, setNotice] = useState('');

  if (!data?.s) return <Skeleton height={300} />;
  const display = data.s.display_unit as SleepDisplay;
  const goal = data.s.goal;
  const log = data.log;
  const avg = data.week.length ? data.week.reduce((a, l) => a + l.duration_min, 0) / data.week.length : null;
  const avgBed = averageBedtime(data.week.map((l) => l.bedtime));
  const close = () => setOpen(null);

  // son 7 gün mini bar grafiği (boş gün = boş bar)
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const maxMin = Math.max(goal, ...data.week.map((l) => l.duration_min));

  const setReminder = async () => {
    const t = await pickTime(data.notif.bedtimeReminder ?? '23:30');
    if (!t) return;
    let ok: boolean;
    try {
      ok = await scheduleDaily(BEDTIME_ID, t, 'Yatma vakti 🌙', 'Uyku hedefin için yatmaya hazırlanma zamanı.');
    } catch {
      setNotice('Hatırlatıcı kurulamadı, tekrar dene.');
      return;
    }
    if (!ok) { setNotice('Bildirim izni verilmedi.'); return; }
    await setSetting('notifications', { ...data.notif, bedtimeReminder: t });
    setNotice('');
  };

  return (
    <>
      <TrackerCard
        layout="wide" resetKey={data.date}
        title="Uyku" icon="bedtime" color={colors.primary}
        progress={log ? log.duration_min / goal : 0}
        value={log ? formatDuration(log.duration_min, display) : '—'}
        caption={`/ ${formatDuration(goal, display)}`}
        onMenu={() => setOpen('menu')}
        onPress={() => setOpen('entry')}
        side={
          <>
            <Info label="Yatış" value={log?.bedtime ?? '—'} />
            <Info label="Kalkış" value={log?.wake_time ?? '—'} />
            <Info label="Kalite" value={log?.quality ? QUALITY_EMOJI[log.quality - 1] : '—'} />
            <View style={styles.bars} accessibilityLabel="Son 7 gün uyku süreleri">
              {days.map((d) => {
                const l = data.week.find((x) => x.date === d);
                return (
                  <View key={d} style={styles.barSlot}>
                    <View style={[styles.bar, {
                      height: l ? Math.max(4, (l.duration_min / maxMin) * 36) : 4,
                      backgroundColor: l ? (l.duration_min >= goal ? colors.primaryLight : colors.primary) : colors.divider,
                    }]} />
                  </View>
                );
              })}
            </View>
          </>
        }
        footer={
          <Text style={type.caption}>
            {avg != null ? `Haftalık ort. ${formatDuration(Math.round(avg), display)} · Ort. yatış ${avgBed}` : 'Kayıt eklemek için karta dokun'}
          </Text>
        }
      />
      <SleepSheet visible={open === 'entry'} date={date} log={log} onClose={close} />
      <Sheet visible={open === 'menu'} onClose={close} title="Uyku">
        <SheetRow label="Hedef süre" value={formatDuration(goal, display)} onPress={() => setOpen('goal')} />
        <View style={styles.segment}>
          <SegmentedControl<SleepDisplay>
            options={[{ value: 'hm', label: 'Saat:dakika' }, { value: 'decimal', label: 'Ondalık saat' }]}
            value={display}
            onChange={(v) => updateTrackerSettings('sleep', { display_unit: v })}
          />
        </View>
        <SheetRow label="Yatma saati hatırlatıcısı" value={data.notif.bedtimeReminder ?? 'Kapalı'} onPress={setReminder} />
        {data.notif.bedtimeReminder ? (
          <SheetRow label="Hatırlatıcıyı kapat" onPress={async () => {
            await cancelReminder(BEDTIME_ID);
            await setSetting('notifications', { ...data.notif, bedtimeReminder: null });
          }} />
        ) : null}
        {notice ? <Text style={[type.caption, { color: colors.warning }]}>{notice}</Text> : null}
        <SheetRow label="Geçmişi gör" onPress={() => { close(); router.push('/tracker/sleep'); }} />
      </Sheet>
      <NumberPrompt
        visible={open === 'goal'} onClose={close} title="Uyku hedefi" suffix="saat" initial={goal / 60} min={1}
        onSubmit={(v) => updateTrackerSettings('sleep', { goal: Math.round(v * 60) })}
      />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.subtitle}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 4, marginTop: spacing.xs },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: radius.sm / 3 },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
