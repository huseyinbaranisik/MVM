import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PillButton } from '@/components/ui/PillButton';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { getPreviousBests, getSession, getSessionSets } from '@/db/repos/sessions';
import { useDb } from '@/db/useDb';
import { fmtDec, fmtInt } from '@/services/units';
import { findPRs, mmss, volume } from '@/services/workout';
import { colors, radius, spacing, type } from '@/theme';

export default function WorkoutSummary() {
  const sessionId = Number(useLocalSearchParams<{ sessionId: string }>().sessionId);
  const data = useDb(async (db) => {
    const sets = await getSessionSets(db, sessionId);
    const names = await db.getAllAsync<{ id: string; name_tr: string }>(
      'SELECT id, name_tr FROM exercises WHERE id IN (SELECT exercise_id FROM session_sets WHERE session_id = ?)', sessionId);
    return {
      session: await getSession(db, sessionId),
      sets,
      names: new Map(names.map((n) => [n.id, n.name_tr])),
      prs: findPRs(sets, await getPreviousBests(db, sessionId)),
    };
  }, [sessionId], ['workout_sessions', 'session_sets', 'exercises']);
  if (!data?.session) return <LoadingScreen blocks={[120, 90, 160]} />;

  const { session, sets, names, prs } = data;
  const duration = session.ended_at ? (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 : 0;
  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>🏁</Text>
        <Text style={[type.hero, styles.center]}>Antrenman bitti!</Text>
        <Text style={[type.caption, styles.center]}>{session.template_name}</Text>

        <View style={styles.stats}>
          <Stat label="Süre" value={mmss(duration)} />
          <Stat label="Toplam hacim" value={`${fmtInt(volume(sets))} kg`} />
          <Stat label="Set" value={String(sets.length)} />
        </View>

        <Text style={type.title}>Kişisel rekorlar</Text>
        <View style={styles.card}>
          {prs.length ? prs.map((p) => (
            <View key={`${p.exercise_id}-${p.kind}`} style={styles.row}>
              <Icon name="emoji_events" color={colors.warning} />
              <Text style={[type.body, styles.flex]}>{names.get(p.exercise_id)}</Text>
              <Text style={styles.prValue}>{p.kind === 'weight' ? `${fmtDec(p.value)} kg` : `1RM ≈ ${fmtDec(p.value)} kg`}</Text>
            </View>
          )) : <Text style={type.caption}>Bu sefer rekor yok — tutarlılık da kazançtır.</Text>}
        </View>

        <Text style={type.title}>Hareketler</Text>
        <View style={styles.card}>
          {exerciseIds.map((id) => {
            const xs = sets.filter((s) => s.exercise_id === id);
            return (
              <View key={id} style={styles.row}>
                <Text style={[type.body, styles.flex]}>{names.get(id)}</Text>
                <Text style={type.caption}>{xs.map((s) => (s.duration_sec ? `${s.duration_sec}sn` : `${s.weight_kg ?? 0}×${s.reps ?? 0}`)).join('  ')}</Text>
              </View>
            );
          })}
        </View>
        <PillButton label="Ana sayfaya dön" variant="primary" onPress={() => router.dismissTo('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={type.caption}>{label}</Text>
      <Text style={type.title} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  prValue: { fontSize: 15, fontWeight: '800', color: colors.accent },
});
