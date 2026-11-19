import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Counter, counterSlot, TrackerCard } from '@/components/TrackerCard';
import { WeekBars } from '@/components/WeekBars';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Sheet, SheetRow } from '@/components/ui/Sheet';
import { addTrackerValue, getTrackerHistory, getTrackerSettings, getTrackerValue, updateTrackerSettings } from '@/db/repos/trackers';
import { useDb, useOptimistic } from '@/db/useDb';
import { play } from '@/services/sounds';
import { addDays } from '@/services/dates';
import { formatWater, waterFromDisplay, waterToDisplay, waterUnitLabel, type WaterUnit } from '@/services/units';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, spacing, type } from '@/theme';
import { t } from '@/i18n';

export function WaterCard({ date, size = 'small' }: { date: string; size?: 'small' | 'large' }) {
  const data = useDb(async () => ({
    date, ml: await getTrackerValue('water', date), s: await getTrackerSettings('water'),
    week: new Map((await getTrackerHistory('water', addDays(date, -6), date)).map((r) => [r.date, r.value])),
  }), [date], ['daily_trackers', 'tracker_settings']);
  const [open, setOpen] = useState<'menu' | 'goal' | 'glass' | null>(null);
  const [mlShown, applyMl] = useOptimistic(data?.ml);

  if (!data?.s) return <Skeleton height={300} style={styles.placeholder} />;
  const unit = data.s.display_unit as WaterUnit;
  const glass = data.s.unit_size ?? 250;
  const fmt = (ml: number) => formatWater(ml, unit, glass);
  const close = () => setOpen(null);
  const ml = mlShown ?? data.ml;
  const weekVals = [...data.week.values()];
  const avg = weekVals.length ? weekVals.reduce((a, v) => a + v, 0) / 7 : 0;
  const hit = weekVals.filter((v) => v >= data.s!.goal).length;
  const counter = (
    <Counter
      minusLabel={t('Bir bardak çıkar')} plusLabel={t('Bir bardak ekle')}
      onMinus={() => applyMl(Math.max(0, ml - glass), () => addTrackerValue('water', date, -glass))}
      onPlus={() => { play('pop'); applyMl(ml + glass, () => addTrackerValue('water', date, glass)); }}
    />
  );

  return (
    <>
      <TrackerCard
        resetKey={data.date}
        title={t('Su')} icon="water_drop" color={colors.accent}
        progress={ml / data.s.goal}
        value={fmt(ml)}
        caption={`/ ${fmt(data.s.goal)} ${waterUnitLabel(unit)}`}
        onMenu={() => setOpen('menu')}
        layout={size === 'large' ? 'wide' : 'square'}
        {...(size === 'large' ? {
          side: (
            <>
              {counter}
              <WeekBars date={date} values={data.week} goal={data.s.goal} />
            </>
          ),
          footer: <Text style={type.caption}>{t('Haftalık ort. {avg} {unit} · Hedef {hit}/7 gün', { avg: fmt(avg), unit: waterUnitLabel(unit), hit })}</Text>,
        } : counterSlot(size, counter))}
      />
      <Sheet visible={open === 'menu'} onClose={close} title={t('Su')}>
        <SheetRow label={t('Hedefi değiştir')} value={`${fmt(data.s.goal)} ${waterUnitLabel(unit)}`} onPress={() => setOpen('goal')} />
        <View style={styles.segment}>
          <SegmentedControl<WaterUnit>
            options={[{ value: 'glass', label: t('Bardak') }, { value: 'liter', label: t('Litre') }]}
            value={unit}
            onChange={(v) => updateTrackerSettings('water', { display_unit: v })}
          />
        </View>
        <SheetRow label={t('Bardak hacmi')} value={`${glass} ml`} onPress={() => setOpen('glass')} />
        <SheetRow label={t('Geçmişi gör')} onPress={() => { close(); router.push('/tracker/water'); }} />
      </Sheet>
      <NumberPrompt
        visible={open === 'goal'} onClose={close} title={t('Günlük su hedefi')} suffix={waterUnitLabel(unit)}
        initial={Number(waterToDisplay(data.s.goal, unit, glass).toFixed(2))}
        onSubmit={(v) => updateTrackerSettings('water', { goal: Math.round(waterFromDisplay(v, unit, glass)) })}
      />
      <NumberPrompt
        visible={open === 'glass'} onClose={close} title={t('Bardak hacmi')} suffix="ml" initial={glass} min={49}
        onSubmit={(v) => updateTrackerSettings('water', { unit_size: Math.round(v) })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
  segment: { flexDirection: 'row', gap: spacing.sm },
});
