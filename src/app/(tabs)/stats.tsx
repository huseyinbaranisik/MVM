import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { StatChart } from '@/components/StatChart';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Appear, Skeleton } from '@/components/ui/Skeleton';
import { saveMeasurement } from '@/db/repos/measurements';
import { getStats, STATS_TABLES } from '@/db/repos/stats';
import { useDb } from '@/db/useDb';
import { addDays, today } from '@/services/dates';
import { bucket, weeklyTotals } from '@/services/stats';
import { colors, type } from '@/theme';

type Range = '7' | '30' | '90' | '365';

export default function StatsScreen() {
  const [range, setRange] = useState<Range>('30');
  const [prompt, setPrompt] = useState<'weight' | 'height' | null>(null);
  const to = today();
  const from = addDays(to, -(Number(range) - 1));
  const d = useDb(() => getStats(from, to), [from, to], STATS_TABLES);
  const b = (p: { date: string; value: number }[]) => bucket(p, from, to);
  const add = (kind: 'weight' | 'height') => (
    <Pressable onPress={() => setPrompt(kind)} hitSlop={10} style={styles.add} accessibilityRole="button"
      accessibilityLabel={kind === 'weight' ? 'Bugünkü kiloyu ekle' : 'Boy ekle'}>
      <Icon name="add" size={22} color={colors.onPrimary} />
    </Pressable>
  );

  return (
    <Screen>
      <Text style={type.hero}>İstatistik</Text>
      <View style={styles.row}>
        <SegmentedControl<Range>
          options={[{ value: '7', label: '7 gün' }, { value: '30', label: '30 gün' }, { value: '90', label: '90 gün' }, { value: '365', label: '1 yıl' }]}
          value={range}
          onChange={setRange}
        />
      </View>
      {!d ? [0, 1, 2].map((i) => <Skeleton key={i} height={240} />) : (
        <>
          <Appear index={0}><StatChart title="Kilo" unit="kg" digits={1} points={b(d.weight)} color={colors.primaryLight} right={add('weight')} /></Appear>
          <Appear index={1}><StatChart title="Antrenman (haftalık)" unit="" digits={1} bars points={weeklyTotals(d.workouts, from, to)} color={colors.primaryLight} /></Appear>
          <Appear index={2}><StatChart title="Hacim (haftalık)" unit="kg" bars points={weeklyTotals(d.volume, from, to)} color={colors.accent} /></Appear>
          <Appear index={3}><StatChart title="Su" unit="ml" points={b(d.water)} color={colors.ice} goal={d.goals.water} /></Appear>
          <Appear index={4}><StatChart title="Adım" unit="" points={b(d.steps)} color={colors.success} goal={d.goals.steps} /></Appear>
          <Appear index={5}><StatChart title="Kalori" unit="kcal" points={b(d.calories)} color={colors.warning} goal={d.goals.calories} /></Appear>
          <Appear index={6}><StatChart title="Uyku" unit="sa" digits={1} points={b(d.sleep)} color={colors.primary} goal={d.goals.sleep != null ? d.goals.sleep / 60 : null} /></Appear>
          <Appear index={7}><StatChart title="Boy" unit="cm" points={b(d.height)} color={colors.accentMuted} right={add('height')} /></Appear>
        </>
      )}

      <NumberPrompt visible={prompt === 'weight'} onClose={() => setPrompt(null)} title="Bugünkü kilo" suffix="kg" min={20}
        onSubmit={(v) => saveMeasurement('weight', Math.round(v * 10) / 10, today())} />
      <NumberPrompt visible={prompt === 'height'} onClose={() => setPrompt(null)} title="Boy" suffix="cm" min={80}
        onSubmit={(v) => saveMeasurement('height', Math.round(v), today())} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
