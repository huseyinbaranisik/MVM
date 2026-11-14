import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting } from '@/db/repos/settings';
import { addDays, diffDays, today, weekday, type DateStr } from '@/services/dates';
import { computeStreak, type DayInput, type StreakStatus } from '@/services/streakService';

/** Bu tablolar değişince seri yeniden hesaplanır (streak_* tabloları burada yok: kendi yazması döngü yapmaz). */
export const STREAK_INPUT_TABLES = new Set(['workout_sessions', 'habit_logs', 'habits', 'daily_trackers', 'tracker_settings', 'day_schedule', 'settings']);

/**
 * Başlangıçtan bugüne gün girdilerini toplar, seriyi hesaplar ve streak_state / streak_days / badges'e yazar.
 * Yeni kazanılan rozetleri döner.
 * shortcut: geçmiş günler bugünkü haftalık plan ve bugünkü adım hedefiyle değerlendirilir; plan geçmişi tutulmuyor.
 */
export async function evaluateStreak(db: SQLiteDatabase, todayStr: DateStr = today()) {
  const start = await getSetting(db, 'startDate');
  const rule = await getSetting(db, 'streakRule');
  const from = diffDays(todayStr, start) >= 0 ? start : todayStr;

  const plan = await db.getAllAsync<{ weekday: number; kind: string; template_id: number | null }>('SELECT * FROM day_schedule');
  const workoutDays = new Set(plan.filter((p) => p.kind === 'workout' && p.template_id != null).map((p) => p.weekday));
  const done = new Set((await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM workout_sessions WHERE status = 'done' AND date BETWEEN ? AND ?", from, todayStr)).map((r) => r.date));
  const goal = (await db.getFirstAsync<{ goal: number }>("SELECT goal FROM tracker_settings WHERE type = 'steps'"))?.goal ?? Infinity;
  const steps = new Map((await db.getAllAsync<{ date: string; value: number }>(
    "SELECT date, value FROM daily_trackers WHERE type = 'steps' AND date BETWEEN ? AND ?", from, todayStr)).map((r) => [r.date, r.value]));
  const habits = await db.getAllAsync<{ id: number; weekdays: number; archived_at: string | null }>('SELECT id, weekdays, archived_at FROM habits');
  const logs = new Set((await db.getAllAsync<{ habit_id: number; date: string }>(
    'SELECT habit_id, date FROM habit_logs WHERE date BETWEEN ? AND ?', from, todayStr)).map((l) => `${l.habit_id}|${l.date}`));

  const inputs: DayInput[] = [];
  for (let d = from; diffDays(todayStr, d) >= 0; d = addDays(d, 1)) {
    const wd = weekday(d);
    const visible = habits.filter((h) => (h.weekdays & (1 << wd)) !== 0 && (h.archived_at == null || d < h.archived_at.slice(0, 10)));
    const checked = visible.filter((h) => logs.has(`${h.id}|${d}`)).length;
    inputs.push({
      date: d,
      kind: workoutDays.has(wd) ? 'workout' : 'rest',
      workoutDone: done.has(d),
      stepGoalMet: (steps.get(d) ?? 0) >= goal,
      checklistRatio: visible.length ? checked / visible.length : 0,
    });
  }

  const r = computeStreak(inputs, from, todayStr, rule);
  const earned = new Set((await db.getAllAsync<{ milestone: number }>('SELECT milestone FROM badges')).map((b) => b.milestone));
  const fresh = r.milestones.filter((m) => !earned.has(m));

  // Sadece değişenleri yaz: her yazma, ekrandaki tüm useDb sorgularını yeniden çalıştırır.
  const prev = new Map((await db.getAllAsync<{ date: string; status: StreakStatus }>('SELECT date, status FROM streak_days')).map((d) => [d.date, d.status]));
  const next = new Map(r.days.map((d) => [d.date, d.status]));
  const changed = r.days.filter((d) => prev.get(d.date) !== d.status);
  const removed = [...prev.keys()].filter((d) => !next.has(d));
  const s = await getStreakState(db);
  const stateChanged = !s || s.current !== r.current || s.longest !== r.longest || s.freezes_available !== r.freezesAvailable;
  if (!changed.length && !removed.length && !fresh.length && !stateChanged) return { ...r, fresh };

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      'UPDATE streak_state SET current = ?, longest = ?, freezes_available = ?, last_evaluated = ? WHERE id = 1',
      r.current, r.longest, r.freezesAvailable, todayStr);
    for (const d of removed) await txn.runAsync('DELETE FROM streak_days WHERE date = ?', d);
    for (const d of changed) {
      await txn.runAsync('INSERT INTO streak_days (date, status) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET status = excluded.status', d.date, d.status);
    }
    for (const m of fresh) await txn.runAsync('INSERT OR IGNORE INTO badges (milestone, earned_at) VALUES (?, ?)', m, new Date().toISOString());
  });
  return { ...r, fresh };
}

export function getStreakState(db: SQLiteDatabase) {
  return db.getFirstAsync<{ current: number; longest: number; freezes_available: number }>(
    'SELECT current, longest, freezes_available FROM streak_state WHERE id = 1');
}

export function getStreakDays(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<{ date: string; status: StreakStatus }>('SELECT date, status FROM streak_days WHERE date BETWEEN ? AND ?', from, to);
}

export function getBadges(db: SQLiteDatabase) {
  return db.getAllAsync<{ milestone: number; earned_at: string }>('SELECT milestone, earned_at FROM badges ORDER BY milestone');
}
