import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader, ExerciseThumb } from '@/components/exercise';
import { Icon } from '@/components/Icon';
import { RingGauge } from '@/components/RingGauge';
import { SetPicker, type SetPickerTarget } from '@/components/SetPicker';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingScreen } from '@/components/ui/Skeleton';
import { confirm } from '@/components/ui/overlays';
import { PillButton } from '@/components/ui/PillButton';
import { getSession, getSessionSets, getPreviousSets, saveSet, deleteSet, endSession, type SessionSet } from '@/db/repos/sessions';
import { getSetting } from '@/db/repos/settings';
import { getTemplateExercises, summary, type TemplateExercise } from '@/db/repos/templates';
import { useDb } from '@/db/useDb';
import { today } from '@/services/dates';
import { play } from '@/services/sounds';
import { fmtDec, parseNumber } from '@/services/units';
import { mmss, overloadSuggestion } from '@/services/workout';
import { useWorkoutStore } from '@/stores/useWorkoutStore';
import { colors, radius, spacing, type } from '@/theme';
import { t } from '@/i18n';

/** Saniyede bir yeniden çizdirmek için şu anki zaman. */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

type Inputs = Record<string, { kg?: string; reps?: string }>;
const keyOf = (exId: string, i: number) => `${exId}:${i}`;

export default function ActiveWorkout() {
  const sessionId = Number(useLocalSearchParams<{ sessionId: string }>().sessionId);
  useKeepAwake(); // antrenman boyunca ekran kararmasın
  const now = useNow();
  const startRest = useWorkoutStore((s) => s.startRest);

  const data = useDb(async () => {
    const session = await getSession(sessionId);
    const plan = session?.template_id ? await getTemplateExercises(session.template_id) : [];
    const prev: Record<string, SessionSet[]> = {};
    for (const x of plan) prev[x.exercise_id] = await getPreviousSets(x.exercise_id, sessionId);
    return { session, plan, prev, done: await getSessionSets(sessionId), rest: await getSetting('restSec') };
  }, [sessionId], ['workout_sessions', 'session_sets', 'template_exercises', 'user_exercises', 'exercise_favorites', 'settings']);

  const [inputs, setInputs] = useState<Inputs>({});
  const [stopwatch, setStopwatch] = useState<{ key: string; startedAt: number } | null>(null);
  const [picking, setPicking] = useState<(SetPickerTarget & { key: string }) | null>(null);
  const pickingKey = picking?.key; // closure'da null olabilen state'e dokunmamak için

  if (!data?.session) return <LoadingScreen blocks={[60, 320, 320]} />;
  const { session, plan, prev, done, rest } = data;
  const doneMap = new Map(done.map((s) => [keyOf(s.exercise_id, s.set_index), s]));
  const totalSets = plan.reduce((a, x) => a + x.sets, 0);
  const elapsed = (now - new Date(session.started_at).getTime()) / 1000;
  // günü geçmiş oturuma set eklenip değiştirilemez (sadece bitirilebilir)
  const locked = session.date !== today();

  // Bu antrenmanda o hareket için en son girilen ağırlık: kg boş bırakılırsa varsayılan bu olur
  const lastKgThisSession = (exId: string) =>
    done.filter((s) => s.exercise_id === exId && s.weight_kg != null).sort((a, b) => b.set_index - a.set_index)[0]?.weight_kg ?? null;

  const openPicker = (x: TemplateExercise, setIndex: number, kgHint: number | null, repsHint: number | null) => {
    if (locked) return;
    const key = keyOf(x.exercise_id, setIndex);
    setPicking({
      key,
      title: `${x.name_tr} · ${t('Set {n}', { n: setIndex + 1 })}`,
      kg: parseNumber(inputs[key]?.kg ?? '') ?? kgHint ?? 10,
      reps: x.duration_sec ? null : parseNumber(inputs[key]?.reps ?? '') ?? repsHint ?? 10,
    });
  };

  const restFor = (x: TemplateExercise, index: number) => {
    // süpersette grubun son hareketine kadar dinlenme yok
    const next = plan[index + 1];
    if (x.superset_group != null && next?.superset_group === x.superset_group) return 0;
    return x.rest_sec ?? (x.is_heavy ? rest.heavy : rest.normal);
  };

  const complete = async (x: TemplateExercise, xi: number, setIndex: number, durationSec?: number) => {
    if (locked) return;
    const key = keyOf(x.exercise_id, setIndex);
    if (doneMap.has(key)) { await deleteSet(sessionId, x.exercise_id, setIndex); return; }
    const p = prev[x.exercise_id]?.[setIndex] ?? prev[x.exercise_id]?.at(-1);
    const kg = parseNumber(inputs[key]?.kg ?? '') ?? lastKgThisSession(x.exercise_id) ?? p?.weight_kg ?? null;
    const reps = parseNumber(inputs[key]?.reps ?? '') ?? p?.reps ?? x.rep_max ?? x.rep_min ?? null;
    await saveSet(sessionId, x.exercise_id, setIndex, {
      weight_kg: kg, reps: x.duration_sec ? null : reps && Math.round(reps),
      duration_sec: x.duration_sec ? durationSec ?? x.duration_sec : null,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const r = restFor(x, xi);
    if (r > 0 && done.length + 1 < totalSets) startRest(r);
  };

  const finish = async () => {
    if (!done.length) {
      if (await confirm({ title: t('Hiç set tamamlanmadı'), message: t('Antrenman iptal edilsin mi?'), confirmLabel: t('İptal et'), cancelLabel: t('Devam et'), destructive: true })) {
        await endSession(sessionId, 'abandoned');
        router.back();
      }
      return;
    }
    if (!(await confirm({ title: t('Antrenmanı bitir'), message: t('{d}/{n} set tamamlandı.', { d: done.length, n: totalSets }), confirmLabel: t('Bitir') }))) return;
    useWorkoutStore.getState().stopRest();
    await endSession(sessionId, 'done');
    play('complete');
    router.replace(`/workout/summary/${sessionId}`);
  };

  return (
    <View style={styles.flex}>
      <BackHeader title={session.template_name ?? t('Antrenman')} right={
        <PillButton label={t('Bitir')} variant="primary" onPress={finish} style={styles.finish} />
      } />
      <View style={styles.statusRow}>
        <View style={styles.pill}><Text style={styles.pillText}>{t('Süre {v}', { v: mmss(elapsed) })}</Text></View>
        <View style={styles.pill}><Text style={styles.pillText}>{t('{d}/{n} set', { d: done.length, n: totalSets })}</Text></View>
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
                  <Text style={type.caption}>{summary(x)}{x.superset_group != null ? t(' · süperset') : ''}</Text>
                </View>
              </Pressable>
              {suggest ? (
                <View style={styles.suggest}>
                  <Icon name="trending_up" size={18} color={colors.accent} />
                  <Text style={styles.suggestText}>{t('Geçen sefer tüm setlerde {reps} tekrara ulaştın: ağırlığı artır (~{kg} kg)', { reps: x.rep_max ?? '', kg: suggest })}</Text>
                </View>
              ) : null}
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colSet]}>{t('Set')}</Text>
                <Text style={[styles.th, styles.colPrev]}>{t('Önceki')}</Text>
                <Text style={[styles.th, styles.colIn]}>kg</Text>
                <Text style={[styles.th, styles.colIn]}>{x.duration_sec ? t('Süre') : t('Tekrar')}</Text>
                <View style={styles.colCheck} />
              </View>
              {Array.from({ length: x.sets }, (_, i) => {
                const key = keyOf(x.exercise_id, i);
                const d = doneMap.get(key);
                const p = prevSets[i];
                const kgHint = lastKgThisSession(x.exercise_id) ?? p?.weight_kg ?? null;
                const repsHint = p?.reps ?? x.rep_max ?? x.rep_min ?? null;
                const running = stopwatch?.key === key;
                const prevLabel = p ? (p.duration_sec ? `${p.duration_sec} ${t('sn')}` : `${p.weight_kg ?? 0}×${p.reps ?? 0}`) : '—';
                return (
                  <View key={key} style={[styles.setRow, d && styles.setDone]}>
                    <Text style={[styles.cell, styles.colSet]}>{i + 1}</Text>
                    <Text style={[styles.cellMuted, styles.colPrev]}>{prevLabel}</Text>
                    <Cell
                      value={d ? (d.weight_kg != null ? fmtDec(d.weight_kg) : '—') : inputs[key]?.kg ?? null}
                      hint={kgHint != null ? fmtDec(kgHint) : 'kg'}
                      disabled={!!d || locked} label={t('Set {n} ağırlık', { n: i + 1 })}
                      onPress={() => openPicker(x, i, kgHint, repsHint)} />
                    {x.duration_sec ? (
                      <Pressable style={[styles.input, styles.colIn, styles.timerBtn]} disabled={!!d || locked}
                        accessibilityRole="button" accessibilityLabel={running ? t('Kronometreyi durdur') : t('Kronometreyi başlat')}
                        onPress={() => {
                          if (!running) { setStopwatch({ key, startedAt: Date.now() }); return; }
                          setStopwatch(null);
                          complete(x, xi, i, Math.round((Date.now() - stopwatch.startedAt) / 1000));
                        }}>
                        <Text style={styles.cell}>
                          {d ? `${d.duration_sec} ${t('sn')}` : running ? `■ ${Math.floor((now - stopwatch.startedAt) / 1000)}/${x.duration_sec}` : `▶ ${x.duration_sec} ${t('sn')}`}
                        </Text>
                      </Pressable>
                    ) : (
                      <Cell
                        value={d ? String(d.reps ?? '—') : inputs[key]?.reps ?? null}
                        hint={p?.reps != null ? String(p.reps) : `${x.rep_min ?? ''}${x.rep_max && x.rep_max !== x.rep_min ? `-${x.rep_max}` : ''}`}
                        disabled={!!d || locked} label={t('Set {n} tekrar', { n: i + 1 })}
                        onPress={() => openPicker(x, i, kgHint, repsHint)} />
                    )}
                    <Pressable onPress={() => complete(x, xi, i)} disabled={locked} style={[styles.check, styles.colCheck, d && styles.checkOn]}
                      accessibilityRole="checkbox" accessibilityState={{ checked: !!d }} accessibilityLabel={t('Set {n} tamamlandı', { n: i + 1 })}>
                      <Icon name="check" size={20} color={d ? colors.onPrimary : colors.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <RestTimer now={now} />
      <SetPicker target={picking} onClose={() => setPicking(null)}
        onSave={(kg, reps) => {
          if (!pickingKey) return;
          setInputs((s) => ({ ...s, [pickingKey]: { kg: String(kg).replace('.', ','), reps: reps == null ? undefined : String(reps) } }));
        }} />
    </View>
  );
}

/** Kilo/tekrar hücresi: dokununca seçici açılır. Girilmemişse öneri soluk görünür. */
function Cell({ value, hint, disabled, label, onPress }: {
  value: string | null; hint: string; disabled: boolean; label: string; onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.input, styles.colIn, styles.cellBox]}
      accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? hint}`}>
      <Text style={value ? styles.cell : styles.cellMuted} numberOfLines={1} adjustsFontSizeToFit>{value ?? hint}</Text>
    </PressableScale>
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
  // ±15'e basınca halka kısa bir "pop" yapar ve telefon hafifçe titrer: değişiklik hissedilsin
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const adjust = (d: number) => {
    adjustRest(d);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    pop.set(withSequence(withTiming(d > 0 ? 1.12 : 0.9, { duration: 90 }), withSpring(1, { damping: 8 })));
  };
  if (!restEndsAt || left <= 0) return null;

  return (
    <View style={[styles.rest, { paddingBottom: insets.bottom + spacing.md }]}>
      <Animated.View style={popStyle}>
        <RingGauge size={84} stroke={7} progress={left / restTotal} color={colors.accent}>
          <Text style={styles.restTime}>{mmss(Math.ceil(left))}</Text>
        </RingGauge>
      </Animated.View>
      <View style={styles.flex1}>
        <Text style={type.subtitle}>{t('Dinlenme')}</Text>
        <View style={styles.restBtns}>
          <PillButton label="−15" onPress={() => adjust(-15)} accessibilityLabel={t('15 saniye azalt')} />
          <PillButton label="+15" onPress={() => adjust(15)} accessibilityLabel={t('15 saniye ekle')} />
          <PillButton label={t('Atla')} onPress={stopRest} />
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
  pill: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
  cellBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
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
