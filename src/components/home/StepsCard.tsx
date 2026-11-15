import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Counter, TrackerCard } from '@/components/TrackerCard';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { addTrackerValue, getLatestMeasurement, getTrackerSettings, getTrackerValue, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { useAppStore } from '@/stores/useAppStore';
import { formatSteps, kmToSteps, stepsToKm, stepUnitLabel, strideCm, type StepUnit } from '@/services/units';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/theme';

const STEP_DECREMENT = 500;

export function StepsCard({ date }: { date: string }) {
  const sensor = useAppStore((s) => s.stepSensor);
  const data = useDb(async () => ({
    date,
    steps: await getTrackerValue('steps', date),
    s: await getTrackerSettings('steps'),
    heightCm: await getLatestMeasurement('height'),
  }), [date], ['daily_trackers', 'tracker_settings', 'body_measurements']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'stride' | 'add' | null>(null);

  if (!data?.s) return <Skeleton height={300} style={styles.placeholder} />;
  const unit = data.s.display_unit as StepUnit;
  const stride = strideCm(data.s.unit_size, data.heightCm);
  const fmt = (n: number) => formatSteps(n, unit, stride);
  const close = () => setOpen(null);
  const strideLabel = data.s.unit_size != null ? `Elle · ${stride} cm`
    : data.heightCm ? `Boydan · ${stride} cm` : `Varsayılan · ${stride} cm`;

  return (
    <>
      <TrackerCard
        resetKey={data.date}
        title="Adım" icon="directions_walk" color={colors.primaryLight}
        progress={data.steps / data.s.goal}
        value={fmt(data.steps)}
        caption={`/ ${fmt(data.s.goal)} ${stepUnitLabel(unit)}`}
        onMenu={() => setOpen('menu')}
        footer={
          <Counter
            minusLabel={`${STEP_DECREMENT} adım çıkar`} plusLabel="Adım ekle"
            onMinus={() => addTrackerValue('steps', date, -STEP_DECREMENT)}
            onPlus={() => setOpen('add')}
          />
        }
      />
      <Sheet visible={open === 'menu'} onClose={close} title="Adım">
        <SheetRow label="Hedefi değiştir" value={`${fmt(data.s.goal)} ${stepUnitLabel(unit)}`} onPress={() => setOpen('goal')} />
        <View style={styles.segment}>
          <SegmentedControl<StepUnit>
            options={[{ value: 'steps', label: 'Adım' }, { value: 'km', label: 'Km' }]}
            value={unit}
            onChange={(v) => updateTrackerSettings('steps', { display_unit: v })}
          />
        </View>
        <SheetRow label="Adım uzunluğu" value={strideLabel} onPress={() => setOpen('stride')} />
        {data.s.unit_size != null ? (
          <SheetRow label="Boydan otomatik hesapla (boy × 0,415)" onPress={() => updateTrackerSettings('steps', { unit_size: null })} />
        ) : null}
        <SheetRow label="Telefon sensörü"
          value={sensor === 'on' ? 'Açık (uygulama açıkken sayar)' : sensor === 'off' ? 'Yok · manuel giriş' : '…'} />
        <SheetRow label="Geçmişi gör" onPress={() => { close(); router.push('/tracker/steps'); }} />
      </Sheet>
      <NumberPrompt
        visible={open === 'goal'} onClose={close} title="Günlük adım hedefi" suffix={stepUnitLabel(unit)}
        initial={unit === 'km' ? Number(stepsToKm(data.s.goal, stride).toFixed(2)) : data.s.goal}
        onSubmit={(v) => updateTrackerSettings('steps', { goal: unit === 'km' ? kmToSteps(v, stride) : Math.round(v) })}
      />
      <NumberPrompt
        visible={open === 'stride'} onClose={close} title="Adım uzunluğu" suffix="cm" initial={stride} min={20}
        onSubmit={(v) => updateTrackerSettings('steps', { unit_size: Math.round(v) })}
      />
      <NumberPrompt
        visible={open === 'add'} onClose={close} title="Adım ekle"
        suffix="adım" quick={[500, 1000, 2000]}
        onSubmit={(v) => addTrackerValue('steps', date, Math.round(v))}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
