import { notify } from '@/db/bus';
import { must, supabase } from '@/db/supabase';

export type MeasurementType = 'weight' | 'height';
export interface Measurement { id: number; value: number; date: string }

/** Aynı gün ikinci kayıt öncekinin üzerine yazar (günde tek değer). */
export async function saveMeasurement(type: MeasurementType, value: number, date: string) {
  must(await supabase.from('body_measurements').upsert({ type, value, date }, { onConflict: 'user_id,type,date' }));
  notify('body_measurements');
}

export async function getMeasurements(type: MeasurementType): Promise<Measurement[]> {
  return must(await supabase.from('body_measurements').select('id, value, date').eq('type', type).order('date').order('id'));
}

export async function deleteMeasurement(id: number) {
  must(await supabase.from('body_measurements').delete().eq('id', id));
  notify('body_measurements');
}
