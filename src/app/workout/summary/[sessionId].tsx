import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/PillButton';
import { Sheet } from '@/components/ui/Sheet';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { muscles, regions } from '@/data/muscleMap';
import { getCatalog } from '@/db/repos/exercises';
import { getPreviousBests, getPreviousTemplateSession, getSession, getSessionSets } from '@/db/repos/sessions';
import { useDb } from '@/db/useDb';
import { fmtDec, fmtInt } from '@/services/units';
import { exerciseStats, findPRs, mmss, regionVolume, volume } from '@/services/workout';
import { XP_RULES } from '@/services/xp';
import { colors, radius, spacing, type } from '@/theme';

const regionOfMuscle = new Map(muscles.map((m) => [m.id, m.regionId]));
const regionName = new Map(regions.map((r) => [r.id, r.nameTr]));
const seconds = (s: { started_at: string; ended_at: string | null }) =>
  s.ended_at ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000 : 0;

export default function WorkoutSummary() {
  const sessionId = Number(useLocalSearchParams<{ sessionId: string }>().sessionId);
  const data = useDb(async () => {
    const [sets, catalog, session] = await Promise.all([getSessionSets(sessionId), getCatalog(), getSession(sessionId)]);
    return {
      session,
      sets,
      catalog,
      prs: findPRs(sets, await getPreviousBests(sessionId)),
      prev: await getPreviousTemplateSession(sessionId, session?.template_id ?? null),
    };
  }, [sessionId], ['workout_sessions', 'session_sets', 'user_exercises', 'exercise_favorites']);
  const [info, setInfo] = useState(false);
  if (!data?.session) return <LoadingScreen blocks={[120, 90, 160]} />;

  const { session, sets, prs, prev, catalog } = data;
  const name = (id: string) => catalog.byId.get(id)?.name_tr ?? id;
  const duration = seconds(session);
  const total = volume(sets);
  const reps = sets.reduce((a, s) => a + (s.reps ?? 0), 0);
  const stats = exerciseStats(sets);
  const prIds = new Set(prs.map((p) => p.exercise_id));
  const byRegion = regionVolume(sets, (id) => (catalog.byId.get(id)?.primary ?? []).map((m) => regionOfMuscle.get(m) ?? m));
  const maxRegion = byRegion[0]?.[1] ?? 1;
  const prevVolume = prev ? volume(prev.sets) : null;
  const prevDuration = prev ? seconds(prev) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>🏁</Text>
        <Text style={[type.hero, styles.center]}>Antrenman bitti!</Text>
        <Text style={[type.caption, styles.center]}>{session.template_name}</Text>

        <View style={styles.stats}>
          <Stat label="Süre" value={mmss(duration)} delta={prevDuration != null ? signed(Math.round((duration - prevDuration) / 60), ' dk') : undefined} />
          <Pressable style={styles.stat} onPress={() => setInfo(true)} accessibilityRole="button" accessibilityLabel={`Toplam hacim ${fmtInt(total)} kg, açıklama`}>
            <View style={styles.statLabel}>
              <Text style={type.caption}>Toplam hacim</Text>
              <Icon name="info" size={14} color={colors.textSecondary} />
            </View>
            <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{fmtInt(total)} kg</Text>
            {prevVolume != null ? <Delta text={signed(Math.round(total - prevVolume), ' kg')} up={total >= prevVolume} /> : null}
          </Pressable>
        </View>
        <View style={styles.stats}>
          <Stat label="Set" value={String(sets.length)} />
          <Stat label="Tekrar" value={fmtInt(reps)} />
          <Stat label="XP" value={`+${sets.length * XP_RULES.set}`} />
        </View>

        {byRegion.length ? (
          <>
            <Text style={type.title}>Kas gruplarına göre hacim</Text>
            <View style={styles.card}>
              {byRegion.map(([r, v]) => (
                <View key={r} style={styles.barRow}>
                  <Text style={[type.caption, styles.barLabel]} numberOfLines={1}>{regionName.get(r) ?? r}</Text>
                  <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, (v / maxRegion) * 100)}%` }]} /></View>
                  <Text style={[type.caption, styles.barValue]}>{fmtInt(v)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={type.title}>Hareketler</Text>
        <View style={styles.card}>
          {[...stats].map(([id, st]) => (
            <View key={id} style={styles.exercise}>
              <View style={styles.row}>
                <Text style={[type.subtitle, styles.flex]} numberOfLines={1}>{name(id)}</Text>
                {prIds.has(id) ? <Icon name="emoji_events" color={colors.warning} size={20} /> : null}
              </View>
              <Text style={type.caption}>
                {st.sets} set · {st.seconds && !st.reps ? `${st.seconds} sn` : `${st.reps} tekrar`}
                {st.volume ? ` · ${fmtInt(st.volume)} kg` : ''}
                {st.best?.kg ? ` · en iyi ${fmtDec(st.best.kg)}×${st.best.reps}` : ''}
              </Text>
            </View>
          ))}
        </View>

        {prs.length ? (
          <>
            <Text style={type.title}>Kişisel rekorlar</Text>
            <View style={styles.card}>
              {prs.map((p) => (
                <View key={`${p.exercise_id}-${p.kind}`} style={styles.row}>
                  <Icon name="emoji_events" color={colors.warning} />
                  <Text style={[type.body, styles.flex]}>{name(p.exercise_id)}</Text>
                  <Text style={styles.prValue}>{p.kind === 'weight' ? `${fmtDec(p.value)} kg` : `1RM ≈ ${fmtDec(p.value)} kg`}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <PillButton label="Ana sayfaya dön" variant="primary" onPress={() => router.dismissTo('/')} />
      </ScrollView>

      <Sheet visible={info} onClose={() => setInfo(false)} title="Toplam hacim">
        <Text style={type.body}>Kaldırılan toplam ağırlık: her setin ağırlığı × tekrar sayısı, hepsinin toplamı.</Text>
        <Text style={type.caption}>3 set × 10 tekrar × 50 kg = 1.500 kg</Text>
      </Sheet>
    </SafeAreaView>
  );
}

const signed = (n: number, unit: string) => `${n > 0 ? '+' : ''}${fmtInt(n)}${unit}`;

function Delta({ text, up }: { text: string; up: boolean }) {
  return <Text style={[styles.delta, { color: up ? colors.success : colors.textSecondary }]}>{up ? '↑' : '↓'} {text}</Text>;
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {delta ? <Text style={[styles.delta, { color: colors.textSecondary }]}>{delta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  emoji: { fontSize: 56, textAlign: 'center', marginTop: spacing.xl },
  center: { textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  exercise: { gap: 2 },
  flex: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 84 },
  barValue: { width: 56, textAlign: 'right' },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primaryLight },
  prValue: { fontSize: 15, fontWeight: '800', color: colors.accent },
});
