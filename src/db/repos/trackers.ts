import type { SQLiteDatabase } from 'expo-sqlite';

export type TrackerType = 'water' | 'steps' | 'sleep' | 'calories';

export interface TrackerSettings {
  type: TrackerType;
  goal: number;
  display_unit: string;
  /** su: bardak ml; adım: elle girilen adım uzunluğu cm (NULL = boydan otomatik) */
  unit_size: number | null;
}

export async function getTrackerValue(db: SQLiteDatabase, type: TrackerType, date: string) {
  const r = await db.getFirstAsync<{ value: number }>('SELECT value FROM daily_trackers WHERE type = ? AND date = ?', type, date);
  return r?.value ?? 0;
}

/** Değere delta ekler; sonuç 0'ın altına inmez. */
export async function addTrackerValue(db: SQLiteDatabase, type: TrackerType, date: string, delta: number) {
  await db.runAsync(
    `INSERT INTO daily_trackers (type, date, value) VALUES (?, ?, max(0, ?))
     ON CONFLICT(type, date) DO UPDATE SET value = max(0, value + ?)`,
    type, date, delta, delta);
}

export function getTrackerSettings(db: SQLiteDatabase, type: TrackerType) {
  return db.getFirstAsync<TrackerSettings>('SELECT * FROM tracker_settings WHERE type = ?', type);
}

export async function updateTrackerSettings(
  db: SQLiteDatabase, type: TrackerType, patch: Partial<Omit<TrackerSettings, 'type'>>,
) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  await db.runAsync(
    `UPDATE tracker_settings SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE type = ?`,
    ...keys.map((k) => patch[k] ?? null), type);
}

export function getTrackerHistory(db: SQLiteDatabase, type: TrackerType, from: string, to: string) {
  return db.getAllAsync<{ date: string; value: number }>(
    'SELECT date, value FROM daily_trackers WHERE type = ? AND date BETWEEN ? AND ? ORDER BY date', type, from, to);
}

export async function getLatestMeasurement(db: SQLiteDatabase, type: string) {
  const r = await db.getFirstAsync<{ value: number }>(
    'SELECT value FROM body_measurements WHERE type = ? ORDER BY date DESC, id DESC LIMIT 1', type);
  return r?.value ?? null;
}
