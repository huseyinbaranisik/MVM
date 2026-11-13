import type { SQLiteDatabase } from 'expo-sqlite';

import { weekday } from '@/services/dates';

export interface Habit {
  id: number;
  name: string;
  icon: string;
  /** bit i = haftanın i. günü (0 = Pazartesi) */
  weekdays: number;
  done: 0 | 1;
}

export const ALL_DAYS = 0b1111111;

/** O gün görünen (arşivlenmemiş, o haftanın gününe atanmış) alışkanlıklar ve tamamlanma durumu. */
export function getHabitsForDate(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Habit>(
    `SELECT h.id, h.name, h.icon, h.weekdays, (l.habit_id IS NOT NULL) AS done
     FROM habits h LEFT JOIN habit_logs l ON l.habit_id = h.id AND l.date = ?
     WHERE h.archived_at IS NULL AND (h.weekdays & ?) != 0
     ORDER BY h.position, h.id`,
    date, 1 << weekday(date));
}

export async function setHabitDone(db: SQLiteDatabase, habitId: number, date: string, done: boolean) {
  if (done) await db.runAsync('INSERT OR IGNORE INTO habit_logs (habit_id, date) VALUES (?, ?)', habitId, date);
  else await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', habitId, date);
}

export async function saveHabit(db: SQLiteDatabase, h: { id?: number; name: string; icon: string; weekdays: number }) {
  if (h.id) {
    await db.runAsync('UPDATE habits SET name = ?, icon = ?, weekdays = ? WHERE id = ?', h.name, h.icon, h.weekdays, h.id);
  } else {
    await db.runAsync(
      'INSERT INTO habits (name, icon, weekdays, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM habits))',
      h.name, h.icon, h.weekdays);
  }
}

/** Silme = arşivleme; geçmiş istatistikler bozulmaz. */
export async function archiveHabit(db: SQLiteDatabase, id: number) {
  await db.runAsync("UPDATE habits SET archived_at = datetime('now') WHERE id = ?", id);
}
