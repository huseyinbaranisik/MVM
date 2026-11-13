import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader, ExerciseThumb } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { RingGauge } from '@/components/RingGauge';
import { PillButton } from '@/components/ui/PillButton';
import { getSession, getSessionSets, getPreviousSets, saveSet, deleteSet, endSession, type SessionSet } from '@/db/repos/sessions';
import { getSetting } from '@/db/repos/settings';
import { getTemplateExercises, summary, type TemplateExercise } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { parseNumber } from '@/services/units';
import { mmss, overloadSuggestion } from '@/services/workout';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import { colors, radius, spacing, type } from '@/theme';

/** Saniyede bir yeniden çizdirmek için şu anki zaman. */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

type Inputs = Record<string, { kg?: string; reps?: string }>;
const keyOf = (exId: string, i: number) => `${exId}:${i}`;

export default function ActiveWorkout() {
  const db = useSQLiteContext();
  const sessionId = Number(useLocalSearchParams<{ sessionId: string }>().sessionId);
  useKeepAwake(); // antrenman boyunca ekran kararmasın
  const now = useNow();
  const startRest = useWorkoutStore((s) => s.startRest);

  const data = useDb(async (db) => {
    const session = await getSession(db, sessionId);
    const plan = session?.template_id ? await getTemplateExercises(db, session.template_id) : [];
    const prev: Record<string, SessionSet[]> = {};
    for (const x of plan) prev[x.exercise_id] = await getPreviousSets(db, x.exercise_id, sessionId);
    return { session, plan, prev, done: await getSessionSets(db, sessionId), rest: await getSetting(db, 'restSec') };
  }, [sessionId]);

  const [inputs, setInputs] = useState<Inputs>({});
  const [stopwatch, setStopwatch] = useState<{ key: string; startedAt: number } | null>(null);

  if (!data?.session) return <BackHeader title="" />;
  const { session, plan, prev, done, rest } = data;
  const doneMap = new Map(done.map((s) => [keyOf(s.exercise_id, s.set_index), s]));
  const totalSets = plan.reduce((a, x) => a + x.sets, 0);
  const elapsed = (now - new Date(session.started_at).getTime()) / 1000;

  const setInput = (key: string, field: 'kg' | 'reps', v: string) => setInputs((s) => ({ ...s, [key]: { ...s[key], [field]: v } }));

  const restFor = (x: TemplateExercise, index: number) => {
    // süpersette grubun son hareketine kadar dinlenme yok
    const next = plan[index + 1];
    if (x.superset_group != null && next?.superset_group === x.superset_group) return 0;
    return x.rest_sec ?? (x.is_heavy ? rest.heavy : rest.normal);
  };

  const complete = async (x: TemplateExercise, xi: number, setIndex: number, durationSec?: number) => {
    const key = keyOf(x.exercise_id, setIndex);
    if (doneMap.has(key)) { await deleteSet(db, sessionId, x.exercise_id, setIndex); return; }
    const p = prev[x.exercise_id]?.[setIndex] ?? prev[x.exercise_id]?.at(-1);
    const kg = parseNumber(inputs[key]?.kg ?? '') ?? p?.weight_kg ?? null;
    const reps = parseNumber(inputs[key]?.reps ?? '') ?? p?.reps ?? x.rep_max ?? x.rep_min ?? null;
    await saveSet(db, sessionId, x.exercise_id, setIndex, {
      weight_kg: kg, reps: x.duration_sec ? null : reps && Math.round(reps),
      duration_sec: x.duration_sec ? durationSec ?? x.duration_sec : null,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const r = restFor(x, xi);
    if (r > 0 && done.length + 1 < totalSets) startRest(r);
  };

  const finish = () => {
    if (!done.length) {
      Alert.alert('Hiç set tamamlanmadı', 'Antrenman iptal edilsin mi?', [
        { text: 'Devam et', style: 'cancel' },
        { text: 'İptal et', style: 'destructive', onPress: async () => { await endSession(db, sessionId, 'abandoned'); router.back(); } },
      ]);
      return;
    }
    Alert.alert('Antrenmanı bitir', `${done.length}/${totalSets} set tamamlandı.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Bitir', onPress: async () => {
        useWorkoutStore.getState().stopRest();
        await endSession(db, sessionId, 'done');
        router.replace(`/workout/summary/${sessionId}`);
      } },
    ]);
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={session.template_name ?? 'Antrenman'} right={
        <PillButton label="Bitir" variant="primary" onPress={finish} style={styles.finish} />
      } />
      <View style={styles.statusRow}>
        <Text style={type.caption}>Süre {mmss(elapsed)}</Text>
        <Text style={type.caption}>{done.length}/{totalSets} set</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {plan.map((x, xi) => {
          const prevSets = prev[x.exercise_id] ?? [];
          const suggest = overloadSuggestion(prevSets, x.sets, x.rep_max);
          return (
            <View key={x.id} style={styles.card}>
              <Pressable style={styles.exHeader} onPress={() => router.push(`/exercise/${encodeURIComponent(x.exercise_id)}`)} accessibilityRole="button">
                <ExerciseThumb imageKey={x.image_key} photoUri={x.photo_uri} size={44} />
                <View style={styles.flex1}>
                  <Text style={type.subtitle}>{x.name_tr}</Text>
                  <Text style={type.caption}>{summary(x)}{x.superset_group != null ? ' · süperset' : ''}</Text>
                </View>
              </Pressable>
              {suggest ? (
                <View style={styles.suggest}>
                  <Icon name="trending_up" size={18} color={colors.accent} />
                  <Text style={styles.suggestText}>Geçen sefer tüm setlerde {x.rep_max} tekrara ulaştın: ağırlığı artır (~{suggest} kg)</Text>
                </View>
              ) : null}
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colSet]}>Set</Text>
                <Text style={[styles.th, styles.colPrev]}>Önceki</Text>
                <Text style={[styles.th, styles.colIn]}>kg</Text>
                <Text style={[styles.th, styles.colIn]}>{x.duration_sec ? 'Süre' : 'Tekrar'}</Text>
                <View style={styles.colCheck} />
              </View>
              {Array.from({ length: x.sets }, (_, i) => {
                const key = keyOf(x.exercise_id, i);
                const d = doneMap.get(key);
                const p = prevSets[i];
                const running = stopwatch?.key === key;
                const prevLabel = p ? (p.duration_sec ? `${p.duration_sec} sn` : `${p.weight_kg ?? 0}×${p.reps ?? 0}`) : '—';
                return (
                  <View key={key} style={[styles.setRow, d && styles.setDone]}>
                    <Text style={[styles.cell, styles.colSet]}>{i + 1}</Text>
                    <Text style={[styles.cellMuted, styles.colPrev]}>{prevLabel}</Text>
                    <TextInput
                      style={[styles.input, styles.colIn]} keyboardType="decimal-pad"
                      value={d ? String(d.weight_kg ?? '') : inputs[key]?.kg ?? ''}
                      placeholder={p?.weight_kg != null ? String(p.weight_kg) : 'kg'}
                      placeholderTextColor={colors.textSecondary} editable={!d}
                      onChangeText={(v) => setInput(key, 'kg', v)} accessibilityLabel={`Set ${i + 1} ağırlık`} />
                    {x.duration_sec ? (
                      <Pressable style={[styles.input, styles.colIn, styles.timerBtn]} disabled={!!d}
                        accessibilityRole="button" accessibilityLabel={running ? 'Kronometreyi durdur' : 'Kronometreyi başlat'}
                        onPress={() => {
                          if (!running) { setStopwatch({ key, startedAt: Date.now() }); return; }
                          setStopwatch(null);
                          complete(x, xi, i, Math.round((Date.now() - stopwatch.startedAt) / 1000));
                        }}>
                        <Text style={styles.cell}>
                          {d ? `${d.duration_sec} sn` : running ? `■ ${Math.floor((now - stopwatch.startedAt) / 1000)}/${x.duration_sec}` : `▶ ${x.duration_sec} sn`}
                        </Text>
                      </Pressable>
                    ) : (
                      <TextInput
                        style={[styles.input, styles.colIn]} keyboardType="number-pad"
                        value={d ? String(d.reps ?? '') : inputs[key]?.reps ?? ''}
                        placeholder={p?.reps != null ? String(p.reps) : `${x.rep_min ?? ''}${x.rep_max && x.rep_max !== x.rep_min ? `-${x.rep_max}` : ''}`}
                        placeholderTextColor={colors.textSecondary} editable={!d}
                        onChangeText={(v) => setInput(key, 'reps', v)} accessibilityLabel={`Set ${i + 1} tekrar`} />
                    )}
                    <Pressable onPress={() => complete(x, xi, i)} style={[styles.check, styles.colCheck, d && styles.checkOn]}
                      accessibilityRole="checkbox" accessibilityState={{ checked: !!d }} accessibilityLabel={`Set ${i + 1} tamamlandı`}>
                      <Icon name="check" size={20} color={d ? colors.accent : colors.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <RestTimer now={now} />
    </View>
  );
}

/** Set tamamlanınca otomatik başlayan dinlenme halkası; bitince titreşim (bildirim store'da planlanır). */
function RestTimer({ now }: { now: number }) {
  const { restEndsAt, restTotal, adjustRest, stopRest } = useWorkoutStore();
  const insets = useSafeAreaInsets();
  const left = restEndsAt ? (restEndsAt - now) / 1000 : 0;
  useEffect(() => {
    if (restEndsAt && left <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      stopRest();
    }
  }, [restEndsAt, left, stopRest]);
  if (!restEndsAt || left <= 0) return null;

  return (
    <View style={[styles.rest, { paddingBottom: insets.bottom + spacing.md }]}>
      <RingGauge size={84} stroke={7} progress={left / restTotal} color={colors.accent}>
        <Text style={styles.restTime}>{mmss(Math.ceil(left))}</Text>
      </RingGauge>
      <View style={styles.flex1}>
        <Text style={type.subtitle}>Dinlenme</Text>
        <View style={styles.restBtns}>
          <PillButton label="−15" onPress={() => adjustRest(-15)} accessibilityLabel="15 saniye azalt" />
          <PillButton label="+15" onPress={() => adjustRest(15)} accessibilityLabel="15 saniye ekle" />
          <PillButton label="Atla" onPress={stopRest} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  finish: { minHeight: 40 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 180 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  suggest: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radius.sm, padding: spacing.sm,
  },
  suggestText: { flex: 1, color: colors.accent, fontSize: 13, fontWeight: '600' },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderRadius: radius.sm },
  setDone: { backgroundColor: colors.surfaceElevated },
  colSet: { width: 28 },
  colPrev: { width: 64 },
  colIn: { flex: 1 },
  colCheck: { width: 44 },
  cell: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  cellMuted: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  input: {
    minHeight: 40, backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider,
    color: colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center',
  },
  timerBtn: { alignItems: 'center', justifyContent: 'center' },
  check: { height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rest: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderColor: colors.divider,
  },
  restTime: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  restBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
