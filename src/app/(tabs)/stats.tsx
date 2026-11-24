import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { savedChartKind, StatChart, CHART_KEY, type ChartKind } from '@/components/StatChart';
import { NumberPrompt } from '@/components/ui/NumberPrompt';
import { confirm } from '@/components/ui/overlays';
import { SegmentedControl } from '@/components/ui/PillButton';
import { Appear, Skeleton } from '@/components/ui/Skeleton';
import { deleteMeasurement, getMeasurements, saveMeasurement } from '@/db/repos/measurements';
import { getSetting, setSetting } from '@/db/repos/settings';
import { getStats, STATS_TABLES } from '@/db/repos/stats';
import { useDb } from '@/db/useDb';
import { addDays, today } from '@/services/dates';
import { bucket, weeklyTotals, type Point } from '@/services/stats';
import { fmtDec, fmtInt } from '@/services/units';
import { colors, radius, spacing, type } from '@/theme';
import { isEn, t } from '@/i18n';

type Range = '7' | '30' | '90' | '365';
type IconName = Parameters<typeof Icon>[0]['name'];

const avg = (p: Point[]) => (p.length ? p.reduce((a, x) => a + x.value, 0) / p.length : null);
const fmtVolume = (kg: number) => (kg >= 10_000 ? `${fmtDec(kg / 1000)} t` : `${fmtInt(kg)} kg`);

export default function StatsScreen() {
  const [range, setRange] = useState<Range>('30');
  const [chart, setChartState] = useState<ChartKind>(savedChartKind);
  const setChart = (k: ChartKind) => {
    setChartState(k);
    try { localStorage.setItem(CHART_KEY, k); } catch { /* depolama yoksa yalnızca bu oturumda */ }
  };
  const [prompt, setPrompt] = useState<'weight' | 'height' | 'target' | null>(null);
  const to = today();
  const from = addDays(to, -(Number(range) - 1));
  const d = useDb(() => getStats(from, to), [from, to], STATS_TABLES);
  const body = useDb(async () => ({
    weights: await getMeasurements('weight'),
    height: (await getMeasurements('height')).at(-1)?.value ?? null,
    profile: await getSetting('profile'),
  }), [], ['body_measurements', 'settings']);
  const b = (p: Point[]) => bucket(p, from, to);
  const target = body?.profile.targetWeightKg ?? null;
  const weight = body?.weights.at(-1)?.value ?? null;

  const removeWeight = async (id: number, label: string) => {
    if (await confirm({ title: t('Kayıt silinsin mi?'), message: label, confirmLabel: t('Sil'), destructive: true })) await deleteMeasurement(id);
  };

  return (
    <Screen>
      <Text style={type.hero}>{t('İstatistik')}</Text>
      <View style={styles.row}>
        <SegmentedControl<Range>
          options={[{ value: '7', label: t('7 gün') }, { value: '30', label: t('30 gün') }, { value: '90', label: t('90 gün') }, { value: '365', label: t('1 yıl') }]}
          value={range}
          onChange={setRange}
        />
      </View>
      <View style={styles.row}>
        <SegmentedControl<ChartKind>
          options={[{ value: 'line', label: t('Çizgi') }, { value: 'bar', label: t('Sütun') }]}
          value={chart}
          onChange={setChart}
        />
      </View>
      {!d || !body ? [0, 1, 2].map((i) => <Skeleton key={i} height={i ? 240 : 180} />) : (
        <>
          <Appear index={0} style={styles.grid}>
            <Tile icon="fitness_center" color={colors.primaryLight} label={t('Antrenman')} value={String(d.workouts.length)} />
            <Tile icon="weight" color={colors.accent} label={t('Toplam hacim')} value={fmtVolume(d.volume.reduce((a, x) => a + x.value, 0))} />
            <Tile icon="directions_walk" color={colors.success} label={t('Ort. adım')} value={avg(d.steps) != null ? fmtInt(avg(d.steps)!) : '—'} />
            <Tile icon="bedtime" color={colors.ice} label={t('Ort. uyku')} value={avg(d.sleep) != null ? `${fmtDec(avg(d.sleep)!)} ${t('sa')}` : '—'} />
          </Appear>

          <Appear index={1}><Text style={styles.section}>{t('Vücut')}</Text></Appear>
          <Appear index={2}>
            <StatChart kind={chart} title={t('Kilo')} unit="kg" digits={1} points={b(d.weight)} color={colors.primaryLight} goal={target}
              right={<AddButton label={t('Bugünkü kiloyu ekle')} onPress={() => setPrompt('weight')} />}>
              <View style={styles.bodyTiles}>
                <BodyTile label={t('Hedef')} value={target != null ? `${fmtDec(target)} kg` : t('Belirle')} onPress={() => setPrompt('target')} />
                <BodyTile label={t('Kalan')} value={weight != null && target != null ? `${fmtDec(Math.abs(weight - target))} kg` : '—'} />
                <BodyTile label={t('Boy')} value={body.height ? `${Math.round(body.height)} cm` : t('Ekle')} onPress={() => setPrompt('height')} />
              </View>
              {body.weights.length ? <Text style={type.caption}>{t('Son kayıtlar')}</Text> : null}
              {body.weights.slice(-5).reverse().map((w) => {
                const label = isEn ? `${w.date.slice(5, 7)}/${w.date.slice(8)}/${w.date.slice(0, 4)}` : `${w.date.slice(8)}.${w.date.slice(5, 7)}.${w.date.slice(0, 4)}`;
                return (
                  <Pressable key={w.id} style={styles.record} onLongPress={() => removeWeight(w.id, `${label} · ${fmtDec(w.value)} kg`)}
                    accessibilityRole="button" accessibilityLabel={`${label}, ${fmtDec(w.value)} kg`} accessibilityHint={t('Silmek için basılı tut')}>
                    <Text style={[type.body, styles.flex]}>{label}</Text>
                    <Text style={type.subtitle}>{fmtDec(w.value)} kg</Text>
                  </Pressable>
                );
              })}
            </StatChart>
          </Appear>

          <Appear index={3}><Text style={styles.section}>{t('Antrenman')}</Text></Appear>
          <Appear index={4}><StatChart kind={chart} title={t('Haftalık antrenman')} unit="" digits={1} bars points={weeklyTotals(d.workouts, from, to)} color={colors.primaryLight} height={110} /></Appear>
          <Appear index={5}><StatChart kind={chart} title={t('Haftalık hacim')} unit="kg" bars points={weeklyTotals(d.volume, from, to)} color={colors.accent} height={110} /></Appear>

          <Appear index={6}><Text style={styles.section}>{t('Günlük')}</Text></Appear>
          <Appear index={7}><StatChart kind={chart} title={t('Adım')} unit="" points={b(d.steps)} color={colors.success} goal={d.goals.steps} height={110} /></Appear>
          <Appear index={8}><StatChart kind={chart} title={t('Su')} unit="ml" points={b(d.water)} color={colors.ice} goal={d.goals.water} height={110} /></Appear>
          <Appear index={9}><StatChart kind={chart} title={t('Uyku')} unit={t('sa')} digits={1} points={b(d.sleep)} color={colors.primary} goal={d.goals.sleep != null ? d.goals.sleep / 60 : null} height={110} /></Appear>
          <Appear index={10}><StatChart kind={chart} title={t('Kalori')} unit="kcal" points={b(d.calories)} color={colors.warning} goal={d.goals.calories} height={110} /></Appear>
        </>
      )}

      <NumberPrompt visible={prompt === 'weight'} onClose={() => setPrompt(null)} title={t('Bugünkü kilo')} suffix="kg" min={20}
        initial={weight ?? undefined} onSubmit={(v) => saveMeasurement('weight', Math.round(v * 10) / 10, today())} />
      <NumberPrompt visible={prompt === 'height'} onClose={() => setPrompt(null)} title={t('Boy')} suffix="cm" min={80}
        initial={body?.height ?? undefined} onSubmit={(v) => saveMeasurement('height', Math.round(v), today())} />
      <NumberPrompt visible={prompt === 'target'} onClose={() => setPrompt(null)} title={t('Hedef kilo')} suffix="kg" min={20}
        initial={target ?? undefined}
        onSubmit={(v) => body && setSetting('profile', { ...body.profile, targetWeightKg: Math.round(v * 10) / 10 })} />
    </Screen>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.add} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name="add" size={22} color={colors.onPrimary} />
    </Pressable>
  );
}

function BodyTile({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.bodyTile} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.subtitle} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Pressable>
  );
}

function Tile({ icon, color, label, value }: { icon: IconName; color: string; label: string; value: string }) {
  return (
    <View style={styles.tile} accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={22} color={color} />
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.caption} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  tileValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.xs },
  flex: { flex: 1 },
  bodyTiles: { flexDirection: 'row', gap: spacing.sm },
  bodyTile: { flex: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  record: {
    flexDirection: 'row', alignItems: 'center', minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider,
  },
  section: { ...type.title, marginTop: spacing.sm },
  add: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
