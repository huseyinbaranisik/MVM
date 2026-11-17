import { must, supabase } from '@/db/supabase';
import { levelFromXp, totalXp, type StreakDayStatus, type XpSources } from '@/services/xp';

/** XP'yi etkileyen tablolar (useDb ve seviye kontrolü için). */
export const XP_TABLES = ['session_sets', 'workout_sessions', 'habit_logs', 'daily_trackers', 'tracker_settings', 'streak_days'] as const;

export async function getXpSources(): Promise<XpSources> {
  const [sets, habits, trackers, goals, streak] = await Promise.all([
    supabase.from('session_sets').select('id, workout_sessions!inner(status)', { count: 'exact', head: true }).eq('workout_sessions.status', 'done'),
    supabase.from('habit_logs').select('date', { count: 'exact', head: true }),
    supabase.from('daily_trackers').select('type, value').in('type', ['water', 'steps']),
    supabase.from('tracker_settings').select('type, goal').in('type', ['water', 'steps']),
    supabase.from('streak_days').select('status').order('date'),
  ]);
  if (sets.error) throw sets.error;
  if (habits.error) throw habits.error;
  // shortcut: bugünkü hedef geçmiş günlere de uygulanır; hedef geçmişi tutulursa günün hedefiyle karşılaştır
  const goal = new Map(must(goals).map((g) => [g.type as string, g.goal as number]));
  const met = (type: string) => must(trackers).filter((t) => t.type === type && t.value >= (goal.get(type) ?? Infinity)).length;
  return {
    sets: sets.count ?? 0,
    habitLogs: habits.count ?? 0,
    waterDays: met('water'),
    stepDays: met('steps'),
    streak: must(streak).map((s) => s.status as StreakDayStatus),
  };
}

export async function getLevel() {
  return levelFromXp(totalXp(await getXpSources()));
}
