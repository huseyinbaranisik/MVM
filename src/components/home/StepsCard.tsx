import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Counter, counterSlot, TrackerCard } from '@/components/TrackerCard';
import { WeekBars } from '@/components/WeekBars';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { addTrackerValue, getLatestMeasurement, getTrackerHistory, getTrackerSettings, getTrackerValue, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb, useOptimistic } from '@/db/useDb';
import { toast } from '@/components/ui/overlays';
import { connectHealthConnect, disconnectHealthConnect, healthConnectAvailable } from '@/services/healthConnect';
import { addDays } from '@/services/dates';
import { useAppStore } from '@/stores/useAppStore';
import { formatSteps, kmToSteps, stepsToKm, stepUnitLabel, strideCm, type StepUnit } from '@/services/units';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing, type } from '@/theme';
import { t } from '@/i18n';

const STEP_DECREMENT = 500;

export function StepsCard({ date, size = 'small' }: { date: string; size?: 'small' | 'large' }) {
  const sensor = useAppStore((s) => s.stepSensor);
  const bumpHealth = useAppStore((s) => s.bumpHealth);
  const data = useDb(async () => ({
    date,
    steps: await getTrackerValue('steps', date),
    week: new Map((await getTrackerHistory('steps', addDays(date, -6), date)).map((r) => [r.date, r.value])),
    s: await getTrackerSettings('steps'),
    heightCm: await getLatestMeasurement('height'),
  }), [date], ['daily_trackers', 'tracker_settings', 'body_measurements']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'stride' | 'add' | null>(null);
  const [stepsShown, applySteps] = useOptimistic(data?.steps);

  if (!data?.s) return <Skeleton height={300} style={styles.placeholder} />;
  const unit = data.s.display_unit as StepUnit;
  const stride = strideCm(data.s.unit_size, data.heightCm);
  const fmt = (n: number) => formatSteps(n, unit, stride);
  const close = () => setOpen(null);
  const steps = stepsShown ?? data.steps;
  const weekVals = [...data.week.values()];
  const avg = weekVals.length ? weekVals.reduce((a, v) => a + v, 0) / 7 : 0;
  const hit = weekVals.filter((v) => v >= data.s!.goal).length;
  const counter = (
    <Counter
      minusLabel={t('{n} adım çıkar', { n: STEP_DECREMENT })} plusLabel={t('Adım ekle')}
      onMinus={() => applySteps(Math.max(0, steps - STEP_DECREMENT), () => addTrackerValue('steps', date, -STEP_DECREMENT))}
      onPlus={() => setOpen('add')}
    />
  );
  const strideLabel = `${data.s.unit_size != null ? t('Elle') : data.heightCm ? t('Boydan') : t('Varsayılan')} · ${stride} cm`;

  return (
    <>
      <TrackerCard
        resetKey={data.date}
        title={t('Adım')} icon="directions_walk" color={colors.primaryLight}
        progress={steps / data.s.goal}
        value={fmt(steps)}
        caption={`/ ${fmt(data.s.goal)} ${stepUnitLabel(unit)}`}
        onMenu={() => setOpen('menu')}
        layout={size === 'large' ? 'wide' : 'square'}
        {...(size === 'large' ? {
          side: (
            <>
              {counter}
              <WeekBars date={date} values={data.week} goal={data.s.goal} />
            </>
          ),
          footer: <Text style={type.caption}>{t('Haftalık ort. {avg} {unit} · Hedef {hit}/7 gün', { avg: fmt(avg), unit: stepUnitLabel(unit), hit })}</Text>,
        } : counterSlot(size, counter))}
      />
      <Sheet visible={open === 'menu'} onClose={close} title={t('Adım')}>
        <SheetRow label={t('Hedefi değiştir')} value={`${fmt(data.s.goal)} ${stepUnitLabel(unit)}`} onPress={() => setOpen('goal')} />
        <View style={styles.segment}>
          <SegmentedControl<StepUnit>
            options={[{ value: 'steps', label: t('Adım') }, { value: 'km', label: 'Km' }]}
            value={unit}
            onChange={(v) => updateTrackerSettings('steps', { display_unit: v })}
          />
        </View>
        <SheetRow label={t('Adım uzunluğu')} value={strideLabel} onPress={() => setOpen('stride')} />
        {data.s.unit_size != null ? (
          <SheetRow label={t('Boydan hesapla')} onPress={() => updateTrackerSettings('steps', { unit_size: null })} />
        ) : null}
        <SheetRow label={t('Adım kaynağı')}
          value={sensor === 'health' ? 'Health Connect' : sensor === 'on' ? t('Telefon sensörü') : sensor === 'off' ? t('Elle giriş') : '…'} />
        {sensor === 'health' ? (
          <SheetRow label={t('Health Connect bağlantısını kes')} onPress={() => { disconnectHealthConnect(); bumpHealth(); close(); }} />
        ) : (
          <SheetRow label={t('Health Connect\'e bağlan')} onPress={async () => {
            close();
            if (!(await healthConnectAvailable())) { toast(t('Health Connect bu telefonda yok')); return; }
            if (await connectHealthConnect()) { bumpHealth(); toast(t('Health Connect bağlandı')); } else toast(t('İzin verilmedi'));
          }} />
        )}
        <SheetRow label={t('Geçmişi gör')} onPress={() => { close(); router.push('/tracker/steps'); }} />
      </Sheet>
      <NumberPrompt
        visible={open === 'goal'} onClose={close} title={t('Günlük adım hedefi')} suffix={stepUnitLabel(unit)}
        initial={unit === 'km' ? Number(stepsToKm(data.s.goal, stride).toFixed(2)) : data.s.goal}
        onSubmit={(v) => updateTrackerSettings('steps', { goal: unit === 'km' ? kmToSteps(v, stride) : Math.round(v) })}
      />
      <NumberPrompt
        visible={open === 'stride'} onClose={close} title={t('Adım uzunluğu')} suffix="cm" initial={stride} min={20}
        onSubmit={(v) => updateTrackerSettings('steps', { unit_size: Math.round(v) })}
      />
      <NumberPrompt
        visible={open === 'add'} onClose={close} title={t('Adım ekle')}
        suffix={t('adım')} quick={[500, 1000, 2000]}
        onSubmit={(v) => applySteps(steps + Math.round(v), () => addTrackerValue('steps', date, Math.round(v)))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
