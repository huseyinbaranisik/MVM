import { notify } from '@/db/bus';
import { maybe, must, supabase } from '@/db/supabase';
import { bestsByExercise } from '@/services/workout';

/** Bir günün antrenman ilerlemesi: o günkü oturumda tamamlanan set / şablondaki toplam set. */
export async function getDayWorkoutProgress(date: string, templateId: number | null) {
  const [tpl, sess] = await Promise.all([
    templateId ? supabase.from('template_exercises').select('sets').eq('template_id', templateId) : Promise.resolve({ data: [], error: null }),
    supabase.from('workout_sessions').select('status, session_sets(count)').eq('date', date).neq('status', 'abandoned')
      .order('id', { ascending: false }).limit(1),
  ]);
  const total = must(tpl).reduce((a, t) => a + (t as { sets: number }).sets, 0);
  const s = must(sess)[0];
  const done = (s?.session_sets as unknown as { count: number }[] | undefined)?.[0]?.count ?? 0;
  return { totalSets: total, doneSets: done, finished: s?.status === 'done' };
}

export interface Session {
  id: number;
  template_id: number | null;
  date: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'done' | 'abandoned';
}

export interface SessionSet {
  id: number;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
}

const SET_COLS = 'id, exercise_id, set_index, weight_kg, reps, duration_sec';

export async function getActiveSession(date: string): Promise<Session | null> {
  return maybe(await supabase.from('workout_sessions').select('*').eq('date', date).eq('status', 'active')
    .order('id', { ascending: false }).limit(1).maybeSingle());
}

/** O gün için açık oturum varsa onu, yoksa yenisini döner. */
export async function startSession(templateId: number, date: string): Promise<number> {
  const open = await getActiveSession(date);
  if (open) return open.id;
  const r = must(await supabase.from('workout_sessions').insert({ template_id: templateId, date, status: 'active' }).select('id').single());
  notify('workout_sessions');
  return r.id;
}

export async function getSession(id: number): Promise<(Session & { template_name: string | null }) | null> {
  const s = maybe(await supabase.from('workout_sessions').select('*, workout_templates(name)').eq('id', id).maybeSingle());
  if (!s) return null;
  const { workout_templates: t, ...rest } = s as Session & { workout_templates: { name: string } | null };
  return { ...rest, template_name: t?.name ?? null };
}

export async function getSessionSets(sessionId: number): Promise<SessionSet[]> {
  return must(await supabase.from('session_sets').select(SET_COLS).eq('session_id', sessionId).order('id'));
}

/** Hareketin bu oturumdan önceki son bitmiş oturumdaki setleri ("önceki değerler"). */
export async function getPreviousSets(exerciseId: string, beforeSessionId: number): Promise<SessionSet[]> {
  const last = must(await supabase.from('session_sets').select('session_id, workout_sessions!inner(started_at, status)')
    .eq('exercise_id', exerciseId).eq('workout_sessions.status', 'done').neq('session_id', beforeSessionId)
    .order('workout_sessions(started_at)', { ascending: false }).limit(1));
  if (!last.length) return [];
  return must(await supabase.from('session_sets').select(SET_COLS)
    .eq('session_id', last[0].session_id).eq('exercise_id', exerciseId).order('set_index'));
}

/** Setin tamamlanması: aynı set varsa güncellenir. */
export async function saveSet(sessionId: number, exerciseId: string, setIndex: number,
  v: { weight_kg: number | null; reps: number | null; duration_sec: number | null }) {
  must(await supabase.from('session_sets').upsert(
    { session_id: sessionId, exercise_id: exerciseId, set_index: setIndex, ...v, completed_at: new Date().toISOString() },
    { onConflict: 'session_id,exercise_id,set_index' }));
  notify('session_sets');
}

export async function deleteSet(sessionId: number, exerciseId: string, setIndex: number) {
  must(await supabase.from('session_sets').delete().eq('session_id', sessionId).eq('exercise_id', exerciseId).eq('set_index', setIndex));
  notify('session_sets');
}

export async function endSession(id: number, status: 'done' | 'abandoned') {
  must(await supabase.from('workout_sessions').update({ status, ended_at: new Date().toISOString() }).eq('id', id));
  notify('workout_sessions');
}

/** Hareket bazında bu oturumdan önceki en iyi ağırlık ve tahmini 1RM (Epley). */
export async function getPreviousBests(sessionId: number) {
  const ids = [...new Set((await getSessionSets(sessionId)).map((s) => s.exercise_id))];
  if (!ids.length) return new Map<string, { maxKg: number; maxE1rm: number }>();
  const rows = must(await supabase.from('session_sets').select('exercise_id, weight_kg, reps, workout_sessions!inner(status)')
    .in('exercise_id', ids).neq('session_id', sessionId).eq('workout_sessions.status', 'done').not('weight_kg', 'is', null));
  return bestsByExercise(rows);
}

/** Tarih aralığında antrenmanı bitirilmiş günler. */
export async function getWorkoutDates(from: string, to: string) {
  const rows = must(await supabase.from('workout_sessions').select('date').eq('status', 'done').gte('date', from).lte('date', to));
  return new Set(rows.map((r) => r.date as string));
}
