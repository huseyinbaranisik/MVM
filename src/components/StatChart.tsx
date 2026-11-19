import type { ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { fmtDec } from '@/services/units';
import { niceAxis, summarize, type Point } from '@/services/stats';
import { colors, radius, spacing, type } from '@/theme';
import { isEn, t } from '@/i18n';

const label = (d: string) => (isEn ? `${Number(d.slice(5, 7))}/${Number(d.slice(8))}` : `${Number(d.slice(8))}.${Number(d.slice(5, 7))}`);

/** Başlık, son/ortalama/değişim ve çizgi (ya da çubuk) grafiği olan istatistik kartı. */
export function StatChart({ title, unit, points, color, goal, bars, digits = 0, right, height = 140, children }: {
  title: string; unit: string; points: Point[]; color: string; goal?: number | null; bars?: boolean; digits?: number; right?: ReactNode;
  height?: number; children?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  // çubukta hepsi sıfırsa kayıt yok say
  const sum = bars && points.every((p) => !p.value) ? null : summarize(points);
  const fmt = (v: number) => fmtDec(v, digits);
  const chartWidth = width - spacing.lg * 4 - 36;
  const every = Math.max(1, Math.ceil(points.length / 6));
  const data = points.map((p, i) => ({ value: p.value, label: i % every === 0 ? label(p.date) : '' }));
  const min = points.length ? Math.min(...points.map((p) => p.value), goal ?? Infinity) : 0;
  const max = points.length ? Math.max(...points.map((p) => p.value), goal ?? 0) : 0;
  // kilo/boy gibi dar aralıklı seriler ekrana yayılsın: alt sınır veriye yakın; eksen her zaman yuvarlak adımlarla
  const narrow = !bars && min > 0 && max - min < min * 0.3;
  const axis = niceAxis(min, Math.max(max, min + 1), 3, !narrow);
  const axisProps = {
    noOfSections: 3, maxValue: axis.max - axis.offset, stepValue: axis.step, yAxisOffset: axis.offset,
    yAxisLabelTexts: axis.labels.map((v) => fmtDec(v, Number.isInteger(v) ? 0 : 1)),
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={[type.subtitle, styles.flex]}>{title}</Text>
        {right}
      </View>
      {sum ? (
        <>
          <View style={styles.nums}>
            <Num label={t('Son')} value={`${fmt(sum.last)} ${unit}`} />
            <Num label={t('Ortalama')} value={`${fmt(sum.avg)} ${unit}`} />
            {!bars ? <Num label={t('Değişim')} value={`${sum.change > 0 ? '+' : ''}${fmt(sum.change)} ${unit}`} /> : null}
          </View>
          {points.length >= 2 || (points.length && goal != null && !bars) ? (bars ? (
            <BarChart data={data} width={chartWidth} height={height} frontColor={color} barWidth={Math.max(6, Math.min(22, chartWidth / points.length - 6))}
              spacing={Math.max(3, Math.min(14, chartWidth / points.length / 3))} yAxisThickness={0} xAxisColor={colors.divider}
              rulesColor={colors.divider} yAxisTextStyle={styles.axis} xAxisLabelTextStyle={styles.axis} {...axisProps} barBorderRadius={4} />
          ) : (
            <LineChart data={data} width={chartWidth} height={height} color={color} dataPointsColor={color} thickness={2}
              spacing={Math.max(8, chartWidth / Math.max(1, points.length - 1))} initialSpacing={8} hideDataPoints={points.length > 31}
              yAxisThickness={0} xAxisColor={colors.divider} rulesColor={colors.divider} yAxisTextStyle={styles.axis}
              xAxisLabelTextStyle={styles.axis} {...axisProps} curved
              showReferenceLine1={goal != null} referenceLine1Position={goal ?? 0}
              referenceLine1Config={{ color: colors.accent, type: 'solid', thickness: 2, labelText: goal != null ? t('Hedef {v}', { v: fmt(goal) }) : undefined,
                labelTextStyle: styles.goalLabel }} />
          )) : null}
        </>
      ) : <Text style={type.caption}>{t('Kayıt yok.')}</Text>}
      {children}
    </View>
  );
}

function Num({ label: l, value }: { label: string; value: string }) {
  return (
    <View style={styles.num}>
      <Text style={type.caption}>{l}</Text>
      <Text style={styles.numValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  nums: { flexDirection: 'row', gap: spacing.md },
  num: { flex: 1, gap: 2 },
  numValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  axis: { color: colors.textSecondary, fontSize: 10 },
  goalLabel: { color: colors.accent, fontSize: 10, fontWeight: '700', marginTop: -14 },
});
