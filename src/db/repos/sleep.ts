import type { SQLiteDatabase } from 'expo-sqlite';

import { sleepDuration } from '@/services/sleep';

export interface SleepLog {
  date: string;
  bedtime: string;
  wake_time: string;
  duration_min: number;
  quality: number | null;
}

export function getSleep(db: SQLiteDatabase, date: string) {
  return db.getFirstAsync<SleepLog>('SELECT * FROM sleep_logs WHERE date = ?', date);
}

export function getSleepRange(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<SleepLog>('SELECT * FROM sleep_logs WHERE date BETWEEN ? AND ? ORDER BY date', from, to);
}

/** date = uyanılan gün. Süre her zaman saatlerden hesaplanır. */
export async function saveSleep(db: SQLiteDatabase, date: string, bedtime: string, wake: string, quality: number | null) {
  await db.runAsync(
    `INSERT INTO sleep_logs (date, bedtime, wake_time, duration_min, quality) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET bedtime = excluded.bedtime, wake_time = excluded.wake_time,
       duration_min = excluded.duration_min, quality = excluded.quality`,
    date, bedtime, wake, sleepDuration(bedtime, wake), quality);
}
