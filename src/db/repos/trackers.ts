import { notify } from '@/db/bus';
import { maybe, must, supabase } from '@/db/supabase';

export type TrackerType = 'water' | 'steps' | 'sleep' | 'calories';

export interface TrackerSettings {
  type: TrackerType;
  goal: number;
  display_unit: string;
  /** su: bardak ml; adım: elle girilen adım uzunluğu cm (NULL = boydan otomatik) */
  unit_size: number | null;
}

export async function getTrackerValue(type: TrackerType, date: string) {
  const r = maybe(await supabase.from('daily_trackers').select('value').eq('type', type).eq('date', date).maybeSingle());
  return r?.value ?? 0;
}

/** Değere delta ekler; sonuç 0'ın altına inmez (sunucuda atomik). */
export async function addTrackerValue(type: TrackerType, date: string, delta: number) {
  must(await supabase.rpc('add_tracker_value', { p_type: type, p_date: date, p_delta: delta }));
  notify('daily_trackers');
}

export async function getTrackerSettings(type: TrackerType): Promise<TrackerSettings | null> {
  return maybe(await supabase.from('tracker_settings').select('type, goal, display_unit, unit_size').eq('type', type).maybeSingle());
}

export async function updateTrackerSettings(type: TrackerType, patch: Partial<Omit<TrackerSettings, 'type'>>) {
  if (!Object.keys(patch).length) return;
  must(await supabase.from('tracker_settings').update(patch).eq('type', type));
  notify('tracker_settings');
}

export async function getTrackerHistory(type: TrackerType, from: string, to: string): Promise<{ date: string; value: number }[]> {
  return must(await supabase.from('daily_trackers').select('date, value').eq('type', type).gte('date', from).lte('date', to).order('date'));
}

export async function getLatestMeasurement(type: string): Promise<number | null> {
  const r = maybe(await supabase.from('body_measurements').select('value').eq('type', type)
    .order('date', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle());
  return r?.value ?? null;
}
