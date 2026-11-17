import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Counter, counterSlot, TrackerCard } from '@/components/TrackerCard';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { addTrackerValue, getTrackerSettings, getTrackerValue, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb } from '@/db/useDb';
import { formatWater, waterFromDisplay, waterToDisplay, waterUnitLabel, type WaterUnit } from '@/services/units';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing } from '@/theme';

export function WaterCard({ date, size = 'small' }: { date: string; size?: 'small' | 'large' }) {
  const data = useDb(async () => ({
    date, ml: await getTrackerValue('water', date), s: await getTrackerSettings('water'),
  }), [date], ['daily_trackers', 'tracker_settings']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'glass' | null>(null);

  if (!data?.s) return <Skeleton height={300} style={styles.placeholder} />;
  const unit = data.s.display_unit as WaterUnit;
  const glass = data.s.unit_size ?? 250;
  const fmt = (ml: number) => formatWater(ml, unit, glass);
  const close = () => setOpen(null);

  return (
    <>
      <TrackerCard
        resetKey={data.date}
        title="Su" icon="water_drop" color={colors.accent}
        progress={data.ml / data.s.goal}
        value={fmt(data.ml)}
        caption={`/ ${fmt(data.s.goal)} ${waterUnitLabel(unit)}`}
        onMenu={() => setOpen('menu')}
        layout={size === 'large' ? 'wide' : 'square'}
        {...counterSlot(size, (
          <Counter
            minusLabel="Bir bardak çıkar" plusLabel="Bir bardak ekle"
            onMinus={() => addTrackerValue('water', date, -glass)}
            onPlus={() => addTrackerValue('water', date, glass)}
          />
        )) }
      />
      <Sheet visible={open === 'menu'} onClose={close} title="Su">
        <SheetRow label="Hedefi değiştir" value={`${fmt(data.s.goal)} ${waterUnitLabel(unit)}`} onPress={() => setOpen('goal')} />
        <View style={styles.segment}>
          <SegmentedControl<WaterUnit>
            options={[{ value: 'glass', label: 'Bardak' }, { value: 'liter', label: 'Litre' }]}
            value={unit}
            onChange={(v) => updateTrackerSettings('water', { display_unit: v })}
          />
        </View>
        <SheetRow label="Bardak hacmi" value={`${glass} ml`} onPress={() => setOpen('glass')} />
        <SheetRow label="Geçmişi gör" onPress={() => { close(); router.push('/tracker/water'); }} />
      </Sheet>
      <NumberPrompt
        visible={open === 'goal'} onClose={close} title="Günlük su hedefi" suffix={waterUnitLabel(unit)}
        initial={Number(waterToDisplay(data.s.goal, unit, glass).toFixed(2))}
        onSubmit={(v) => updateTrackerSettings('water', { goal: Math.round(waterFromDisplay(v, unit, glass)) })}
      />
      <NumberPrompt
        visible={open === 'glass'} onClose={close} title="Bardak hacmi" suffix="ml" initial={glass} min={49}
        onSubmit={(v) => updateTrackerSettings('water', { unit_size: Math.round(v) })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
