import { maybe, must, supabase } from '@/db/supabase';

export interface DayPlan {
  weekday: number;
  kind: 'workout' | 'rest' | 'walk';
  templateId: number | null;
  templateName: string | null;
  exerciseCount: number;
}

const SELECT = 'weekday, kind, template_id, workout_templates(name, template_exercises(count))';
type Row = { weekday: number; kind: DayPlan['kind']; template_id: number | null;
  workout_templates: { name: string; template_exercises: { count: number }[] } | null };
const toPlan = (r: Row): DayPlan => ({
  weekday: r.weekday, kind: r.kind, templateId: r.template_id, templateName: r.workout_templates?.name ?? null,
  exerciseCount: r.workout_templates?.template_exercises[0]?.count ?? 0,
});

export async function getWeekPlan(): Promise<DayPlan[]> {
  return (must(await supabase.from('day_schedule').select(SELECT).order('weekday')) as unknown as Row[]).map(toPlan);
}

export async function getDayPlan(weekday: number): Promise<DayPlan | null> {
  const r = maybe(await supabase.from('day_schedule').select(SELECT).eq('weekday', weekday).maybeSingle()) as unknown as Row | null;
  return r ? toPlan(r) : null;
}
