import { notify } from '@/db/bus';
import { maybe, must, supabase } from '@/db/supabase';
import { today } from '@/services/dates';
import { DEFAULT_LAYOUT, sanitize, type HomeItem } from '@/services/homeLayout';
import { DEFAULT_RULE, type StreakRule } from '@/services/streakService';

export interface Settings {
  profile: {
    name: string; age: number | null; sex: 'male' | 'female' | null; targetWeightKg: number | null;
    /** Storage 'avatars' içindeki yol; avatarUpdatedAt önbelleği kırmak için */
    avatarPath: string | null; avatarUpdatedAt: number | null;
  };
  weightUnit: 'kg' | 'lb';
  restSec: { heavy: number; normal: number };
  notifications: { streakReminder: string | null; bedtimeReminder: string | null };
  streakRule: StreakRule;
  morningSleepPrompt: boolean;
  lastSleepPrompt: string | null;
  startDate: string;
  onboarded: boolean;
  homeLayout: HomeItem[];
}

/** Kayıt yoksa kullanılan değerler. startDate ilk girişte (bootstrap) kalıcı yazılır. */
export const DEFAULT_SETTINGS: Settings = {
  profile: { name: '', age: null, sex: null, targetWeightKg: null, avatarPath: null, avatarUpdatedAt: null },
  weightUnit: 'kg',
  restSec: { heavy: 120, normal: 75 },
  notifications: { streakReminder: '20:00', bedtimeReminder: null },
  streakRule: DEFAULT_RULE,
  morningSleepPrompt: true,
  lastSleepPrompt: null,
  startDate: today(),
  onboarded: false,
  homeLayout: DEFAULT_LAYOUT,
};

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = maybe(await supabase.from('settings').select('value').eq('key', key).maybeSingle());
  if (!row) return DEFAULT_SETTINGS[key];
  if (key === 'homeLayout') return sanitize(row.value) as Settings[K];
  const def = DEFAULT_SETTINGS[key];
  // nesne ayarlarda sonradan eklenen alanlar eski kayıtlarda yok: varsayılanla birleştir
  return (def && typeof def === 'object' && !Array.isArray(def) ? { ...def, ...(row.value as object) } : row.value) as Settings[K];
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  must(await supabase.from('settings').upsert({ key, value }, { onConflict: 'user_id,key' }));
  notify('settings');
}
