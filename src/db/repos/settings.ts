import { notify } from '@/db/bus';
import { maybe, must, supabase } from '@/db/supabase';
import { today } from '@/services/dates';
import { DEFAULT_RULE, type StreakRule } from '@/services/streakService';

export interface Settings {
  profile: { name: string; age: number | null; sex: 'male' | 'female' | null; targetWeightKg: number | null };
  weightUnit: 'kg' | 'lb';
  restSec: { heavy: number; normal: number };
  notifications: { streakReminder: string | null; bedtimeReminder: string | null };
  streakRule: StreakRule;
  morningSleepPrompt: boolean;
  lastSleepPrompt: string | null;
  startDate: string;
  onboarded: boolean;
}

/** Kayıt yoksa kullanılan değerler. startDate ilk girişte (bootstrap) kalıcı yazılır. */
export const DEFAULT_SETTINGS: Settings = {
  profile: { name: '', age: null, sex: null, targetWeightKg: null },
  weightUnit: 'kg',
  restSec: { heavy: 120, normal: 75 },
  notifications: { streakReminder: '20:00', bedtimeReminder: null },
  streakRule: DEFAULT_RULE,
  morningSleepPrompt: true,
  lastSleepPrompt: null,
  startDate: today(),
  onboarded: false,
};

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = maybe(await supabase.from('settings').select('value').eq('key', key).maybeSingle());
  return row ? (row.value as Settings[K]) : DEFAULT_SETTINGS[key];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  must(await supabase.from('settings').upsert({ key, value }, { onConflict: 'user_id,key' }));
  notify('settings');
}
