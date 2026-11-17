import { getCalorieHistory } from '@/db/repos/foods';
import { getSleepRange } from '@/db/repos/sleep';
import { getTrackerHistory, getTrackerSettings } from '@/db/repos/trackers';
import { must, supabase } from '@/db/supabase';
import type { Point } from '@/services/stats';

/** İstatistik ekranının tüm serileri, verilen aralık için. */
export async function getStats(from: string, to: string) {
  const [measures, water, steps, calories, sleep, sessions, goals] = await Promise.all([
    supabase.from('body_measurements').select('type, value, date').gte('date', from).lte('date', to).order('date'),
    getTrackerHistory('water', from, to),
    getTrackerHistory('steps', from, to),
    getCalorieHistory(from, to),
    getSleepRange(from, to),
    supabase.from('workout_sessions').select('date, session_sets(weight_kg, reps)').eq('status', 'done').gte('date', from).lte('date', to),
    Promise.all((['water', 'steps', 'calories', 'sleep'] as const).map(async (t) => [t, (await getTrackerSettings(t))?.goal ?? null] as const)),
  ]);
  const m = must(measures) as { type: string; value: number; date: string }[];
  const s = must(sessions) as unknown as { date: string; session_sets: { weight_kg: number | null; reps: number | null }[] }[];
  const pick = (type: string): Point[] => m.filter((x) => x.type === type).map(({ date, value }) => ({ date, value }));
  return {
    weight: pick('weight'),
    height: pick('height'),
    water,
    steps,
    calories,
    sleep: sleep.map((l) => ({ date: l.date, value: l.duration_min / 60 })),
    workouts: s.map((x) => ({ date: x.date, value: 1 })),
    volume: s.map((x) => ({ date: x.date, value: x.session_sets.reduce((a, y) => a + (y.weight_kg ?? 0) * (y.reps ?? 0), 0) })),
    goals: Object.fromEntries(goals) as Record<'water' | 'steps' | 'calories' | 'sleep', number | null>,
  };
}

export const STATS_TABLES = ['body_measurements', 'daily_trackers', 'tracker_settings', 'food_logs', 'user_foods', 'sleep_logs', 'workout_sessions', 'session_sets'];
