import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_SETTINGS } from '@/db/migrations/002_seed';

export interface Settings {
  profile: { name: string; age: number | null; sex: 'male' | 'female' | null; targetWeightKg: number | null };
  weightUnit: 'kg' | 'lb';
  restSec: { heavy: number; normal: number };
  notifications: { streakReminder: string | null; bedtimeReminder: string | null };
  morningSleepPrompt: boolean;
  lastSleepPrompt: string | null;
  startDate: string;
  onboarded: boolean;
}

export async function getSetting<K extends keyof Settings>(db: SQLiteDatabase, key: K): Promise<Settings[K]> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? JSON.parse(row.value) : ((DEFAULT_SETTINGS[key] ?? null) as Settings[K]);
}

export async function setSetting<K extends keyof Settings>(db: SQLiteDatabase, key: K, value: Settings[K]) {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, JSON.stringify(value));
}
