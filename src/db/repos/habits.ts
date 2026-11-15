import { notify } from '@/db/bus';
import { must, supabase } from '@/db/supabase';
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
export async function getHabitsForDate(date: string): Promise<Habit[]> {
  const [habits, logs] = await Promise.all([
    supabase.from('habits').select('id, name, icon, weekdays').is('archived_at', null).order('position').order('id'),
    supabase.from('habit_logs').select('habit_id').eq('date', date),
  ]);
  const done = new Set(must(logs).map((l) => l.habit_id as number));
  const bit = 1 << weekday(date);
  return must(habits).filter((h) => (h.weekdays & bit) !== 0).map((h) => ({ ...h, done: done.has(h.id) ? 1 : 0 }));
}

export async function setHabitDone(habitId: number, date: string, done: boolean) {
  if (done) must(await supabase.from('habit_logs').upsert({ habit_id: habitId, date }, { ignoreDuplicates: true }));
  else must(await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date));
  notify('habit_logs');
}

export async function saveHabit(h: { id?: number; name: string; icon: string; weekdays: number }) {
  if (h.id) {
    must(await supabase.from('habits').update({ name: h.name, icon: h.icon, weekdays: h.weekdays }).eq('id', h.id));
  } else {
    const last = must(await supabase.from('habits').select('position').order('position', { ascending: false }).limit(1));
    must(await supabase.from('habits').insert({ name: h.name, icon: h.icon, weekdays: h.weekdays, position: (last[0]?.position ?? -1) + 1 }));
  }
  notify('habits');
}

/** Silme = arşivleme; geçmiş istatistikler bozulmaz. */
export async function archiveHabit(id: number) {
  must(await supabase.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id));
  notify('habits');
}
