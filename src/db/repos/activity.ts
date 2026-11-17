import { must, supabase } from '@/db/supabase';
import { groupActivity, type DayActivity } from '@/services/calendar';

/** Tarih aralığındaki günlük etkinlik (takvim için) ve su/adım hedefleri. */
export async function getActivity(from: string, to: string) {
  const [sessions, trackers, habits, streak, goals] = await Promise.all([
    supabase.from('workout_sessions').select('date, workout_templates(name)').eq('status', 'done').gte('date', from).lte('date', to),
    supabase.from('daily_trackers').select('type, date, value').in('type', ['water', 'steps']).gte('date', from).lte('date', to),
    supabase.from('habit_logs').select('date').gte('date', from).lte('date', to),
    supabase.from('streak_days').select('date, status').gte('date', from).lte('date', to),
    supabase.from('tracker_settings').select('type, goal').in('type', ['water', 'steps']),
  ]);
  const days = groupActivity({
    sessions: (must(sessions) as unknown as { date: string; workout_templates: { name: string } | null }[])
      .map((s) => ({ date: s.date, name: s.workout_templates?.name ?? null })),
    trackers: must(trackers),
    habitLogs: must(habits),
    streak: must(streak) as { date: string; status: DayActivity['streak'] }[],
  });
  const goal = new Map(must(goals).map((g) => [g.type as string, g.goal as number]));
  return { days, waterGoal: goal.get('water') ?? Infinity, stepGoal: goal.get('steps') ?? Infinity };
}

export const ACTIVITY_TABLES = ['workout_sessions', 'daily_trackers', 'habit_logs', 'streak_days', 'tracker_settings'];
