import { notify } from '@/db/bus';
import { must, supabase } from '@/db/supabase';
import { weekday } from '@/services/dates';

export interface Habit {
  id: number;
  name: string;
  icon: string;
  /** bit i = haftanın i. günü (0 = Pazartesi) */
  weekdays: number;
  /** günlük görev: yalnızca bu tarihte görünür; null = haftalık (weekdays) */
  only_date: string | null;
  done: 0 | 1;
}

/** Görev o tarihte görünür mü: günlükse yalnızca kendi tarihinde, haftalıksa seçili haftanın günlerinde. */
export const habitVisibleOn = (h: { weekdays: number; only_date?: string | null }, date: string) =>
  h.only_date ? h.only_date === date : (h.weekdays & (1 << weekday(date))) !== 0;

export const ALL_DAYS = 0b1111111;

/** O gün görünen (arşivlenmemiş, o haftanın gününe atanmış) alışkanlıklar ve tamamlanma durumu. */
export async function getHabitsForDate(date: string): Promise<Habit[]> {
  const [habits, logs] = await Promise.all([
    supabase.from('habits').select('id, name, icon, weekdays, only_date').is('archived_at', null).order('position').order('id'),
    supabase.from('habit_logs').select('habit_id').eq('date', date),
  ]);
  const done = new Set(must(logs).map((l) => l.habit_id as number));
  return must(habits).filter((h) => habitVisibleOn(h, date)).map((h) => ({ ...h, done: done.has(h.id) ? 1 : 0 }));
}

export async function setHabitDone(habitId: number, date: string, done: boolean) {
  if (done) must(await supabase.from('habit_logs').upsert({ habit_id: habitId, date }, { ignoreDuplicates: true }));
  else must(await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date));
  notify('habit_logs');
}

export async function saveHabit(h: { id?: number; name: string; icon: string; weekdays: number; only_date: string | null }) {
  const row = { name: h.name, icon: h.icon, weekdays: h.weekdays, only_date: h.only_date };
  if (h.id) {
    must(await supabase.from('habits').update(row).eq('id', h.id));
  } else {
    const last = must(await supabase.from('habits').select('position').order('position', { ascending: false }).limit(1));
    must(await supabase.from('habits').insert({ ...row, position: (last[0]?.position ?? -1) + 1 }));
  }
  notify('habits');
}

/** Silme = arşivleme; geçmiş istatistikler bozulmaz. */
export async function archiveHabit(id: number) {
  must(await supabase.from('habits').update({ archived_at: new Date().toISOString() }).eq('id', id));
  notify('habits');
}
