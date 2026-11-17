import { notify } from '@/db/bus';
import { must, supabase } from '@/db/supabase';

export type DayItemKind = 'workout' | 'walk' | 'rest';

/** Günün planındaki bir öğe. Bir güne birden fazla öğe atanabilir; öğesi olmayan gün atanmamıştır. */
export interface DayItem {
  id: number;
  weekday: number;
  kind: DayItemKind;
  templateId: number | null;
  templateName: string | null;
  exerciseCount: number;
}

const SELECT = 'id, weekday, kind, template_id, workout_templates(name, template_exercises(count))';
type Row = { id: number; weekday: number; kind: DayItemKind; template_id: number | null;
  workout_templates: { name: string; template_exercises: { count: number }[] } | null };
const toItem = (r: Row): DayItem => ({
  id: r.id, weekday: r.weekday, kind: r.kind, templateId: r.template_id, templateName: r.workout_templates?.name ?? null,
  exerciseCount: r.workout_templates?.template_exercises[0]?.count ?? 0,
});

/** 7 günün planı (Pazartesi = 0), her gün sıralı öğeleriyle. */
export async function getWeekPlan(): Promise<{ weekday: number; items: DayItem[] }[]> {
  const rows = (must(await supabase.from('day_schedule_items').select(SELECT).order('position').order('id')) as unknown as Row[]).map(toItem);
  return Array.from({ length: 7 }, (_, weekday) => ({ weekday, items: rows.filter((r) => r.weekday === weekday) }));
}

export async function getDayItems(weekday: number): Promise<DayItem[]> {
  return (must(await supabase.from('day_schedule_items').select(SELECT).eq('weekday', weekday).order('position').order('id')) as unknown as Row[]).map(toItem);
}

/** Güne öğe ekler. Dinlenme günü tek başına durur: eklenirse diğerleri silinir, başka öğe eklenirse dinlenme kalkar. */
export async function addDayItem(weekday: number, kind: DayItemKind, templateId: number | null = null) {
  if (kind === 'rest') must(await supabase.from('day_schedule_items').delete().eq('weekday', weekday));
  else must(await supabase.from('day_schedule_items').delete().eq('weekday', weekday).eq('kind', 'rest'));
  const last = must(await supabase.from('day_schedule_items').select('position').eq('weekday', weekday).order('position', { ascending: false }).limit(1));
  must(await supabase.from('day_schedule_items').insert({
    weekday, kind, template_id: kind === 'workout' ? templateId : null, position: (last[0]?.position ?? -1) + 1,
  }));
  notify('day_schedule_items');
}

export async function removeDayItem(id: number) {
  must(await supabase.from('day_schedule_items').delete().eq('id', id));
  notify('day_schedule_items');
}

export function dayItemName(i: DayItem) {
  return i.kind === 'workout' ? i.templateName ?? 'Antrenman' : i.kind === 'walk' ? 'Yürüyüş' : 'Dinlenme';
}
