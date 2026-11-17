import { notify } from '@/db/bus';
import { getSetting } from '@/db/repos/settings';
import { maybe, must, supabase } from '@/db/supabase';
import { diffDays, today, type DateStr } from '@/services/dates';
import { buildDayInputs, computeStreak, diffStreakDays, type StreakStatus } from '@/services/streakService';

/** Bu tablolar değişince seri yeniden hesaplanır (streak_* tabloları burada yok: kendi yazması döngü yapmaz). */
export const STREAK_INPUT_TABLES = new Set(['workout_sessions', 'habit_logs', 'habits', 'daily_trackers', 'tracker_settings', 'day_schedule_items', 'settings']);

/**
 * Başlangıçtan bugüne gün girdilerini toplar, seriyi hesaplar; streak_state / streak_days / badges'e sadece değişenleri yazar.
 * Yeni kazanılan rozetleri döner.
 * shortcut: geçmiş günler bugünkü haftalık plan ve bugünkü adım hedefiyle değerlendirilir; plan geçmişi tutulmuyor.
 */
export async function evaluateStreak(todayStr: DateStr = today()) {
  const [start, rule] = await Promise.all([getSetting('startDate'), getSetting('streakRule')]);
  const from = diffDays(todayStr, start) >= 0 ? start : todayStr;

  const [plan, sessions, goal, steps, habits, logs, prevDays, state, badges] = await Promise.all([
    supabase.from('day_schedule_items').select('weekday').eq('kind', 'workout'),
    supabase.from('workout_sessions').select('date').eq('status', 'done').gte('date', from).lte('date', todayStr),
    supabase.from('tracker_settings').select('goal').eq('type', 'steps').maybeSingle(),
    supabase.from('daily_trackers').select('date, value').eq('type', 'steps').gte('date', from).lte('date', todayStr),
    supabase.from('habits').select('id, weekdays, archived_at'),
    supabase.from('habit_logs').select('habit_id, date').gte('date', from).lte('date', todayStr),
    supabase.from('streak_days').select('date, status'),
    getStreakState(),
    supabase.from('badges').select('milestone'),
  ]);

  const inputs = buildDayInputs(from, todayStr, {
    workoutWeekdays: new Set(must(plan).map((p) => p.weekday as number)),
    doneDates: new Set(must(sessions).map((s) => s.date as string)),
    steps: new Map(must(steps).map((r) => [r.date as string, r.value as number])),
    stepGoal: must(goal)?.goal ?? Infinity,
    habits: must(habits),
    logs: new Set(must(logs).map((l) => `${l.habit_id}|${l.date}`)),
  });
  const r = computeStreak(inputs, from, todayStr, rule);
  const earned = new Set(must(badges).map((b) => b.milestone as number));
  const fresh = r.milestones.filter((m) => !earned.has(m));

  // Sadece değişenleri yaz: her yazma ekranları yeniler.
  const { changed, removed } = diffStreakDays(new Map(must(prevDays).map((d) => [d.date as string, d.status as StreakStatus])), r.days);
  const stateChanged = !state || state.current !== r.current || state.longest !== r.longest || state.freezes_available !== r.freezesAvailable;
  if (!changed.length && !removed.length && !fresh.length && !stateChanged) return { ...r, fresh };

  await Promise.all([
    stateChanged && supabase.from('streak_state')
      .upsert({ current: r.current, longest: r.longest, freezes_available: r.freezesAvailable, last_evaluated: todayStr }, { onConflict: 'user_id' })
      .then(must),
    removed.length && supabase.from('streak_days').delete().in('date', removed).then(must),
    changed.length && supabase.from('streak_days').upsert(changed, { onConflict: 'user_id,date' }).then(must),
    fresh.length && supabase.from('badges').upsert(fresh.map((milestone) => ({ milestone })), { onConflict: 'user_id,milestone', ignoreDuplicates: true }).then(must),
  ]);
  notify('streak_state', 'streak_days', 'badges');
  return { ...r, fresh };
}

export async function getStreakState(): Promise<{ current: number; longest: number; freezes_available: number } | null> {
  return maybe(await supabase.from('streak_state').select('current, longest, freezes_available').maybeSingle());
}

export async function getStreakDays(from: string, to: string): Promise<{ date: string; status: StreakStatus }[]> {
  return must(await supabase.from('streak_days').select('date, status').gte('date', from).lte('date', to));
}

export async function getBadges(): Promise<{ milestone: number; earned_at: string }[]> {
  return must(await supabase.from('badges').select('milestone, earned_at').order('milestone'));
}
