import { notify } from '@/db/bus';
import { maybe, must, supabase } from '@/db/supabase';
import { sleepDuration } from '@/services/sleep';

export interface SleepLog {
  date: string;
  bedtime: string;
  wake_time: string;
  duration_min: number;
  quality: number | null;
}

const COLS = 'date, bedtime, wake_time, duration_min, quality';

export async function getSleep(date: string): Promise<SleepLog | null> {
  return maybe(await supabase.from('sleep_logs').select(COLS).eq('date', date).maybeSingle());
}

export async function getSleepRange(from: string, to: string): Promise<SleepLog[]> {
  return must(await supabase.from('sleep_logs').select(COLS).gte('date', from).lte('date', to).order('date'));
}

/** date = uyanılan gün. Süre her zaman saatlerden hesaplanır; aynı güne ikinci kayıt üzerine yazar. */
export async function saveSleep(date: string, bedtime: string, wake: string, quality: number | null) {
  must(await supabase.from('sleep_logs').upsert(
    { date, bedtime, wake_time: wake, duration_min: sleepDuration(bedtime, wake), quality }, { onConflict: 'user_id,date' }));
  notify('sleep_logs');
}
