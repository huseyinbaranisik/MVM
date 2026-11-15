import { seedHabits, seedTemplates, walkDays } from '@/data/seedProgram';
import { must, supabase } from '@/db/supabase';
import { today } from '@/services/dates';

/**
 * İlk girişte hesaba varsayılan programı, alışkanlıkları ve hedefleri yazar.
 * tracker_settings en son yazılır ve "kurulum tamam" işaretidir: yarıda kalırsa bir sonraki açılışta yarım kayıtlar silinip baştan yazılır.
 */
export async function ensureUserData() {
  const done = must(await supabase.from('tracker_settings').select('type').limit(1));
  if (done.length) return;

  // yarım kalmış önceki denemenin izleri (template_exercises/day_schedule şablonla birlikte silinir veya NULL olur)
  must(await supabase.from('day_schedule').delete().gte('weekday', 0));
  must(await supabase.from('workout_templates').delete().gte('id', 0));
  must(await supabase.from('habits').delete().gte('id', 0));

  const scheduled = new Map<number, number>();
  for (const tpl of seedTemplates) {
    const { id } = must(await supabase.from('workout_templates').insert({ name: tpl.name }).select('id').single());
    scheduled.set(tpl.weekday, id);
    must(await supabase.from('template_exercises').insert(tpl.exercises.map((x, position) => ({
      template_id: id, exercise_id: x.exerciseId, position, sets: x.sets, rep_min: x.repMin ?? null, rep_max: x.repMax ?? null,
      duration_sec: x.durationSec ?? null, per_side: !!x.perSide, superset_group: x.superset ?? null,
    }))));
  }
  must(await supabase.from('day_schedule').insert(Array.from({ length: 7 }, (_, weekday) => {
    const templateId = scheduled.get(weekday);
    return { weekday, kind: templateId ? 'workout' : walkDays.includes(weekday) ? 'walk' : 'rest', template_id: templateId ?? null };
  })));
  must(await supabase.from('habits').insert(seedHabits.map((h, position) => ({ name: h.name, icon: h.icon, position }))));
  must(await supabase.from('streak_state').upsert({ current: 0 }, { onConflict: 'user_id' }));
  must(await supabase.from('settings').upsert({ key: 'startDate', value: today() }, { onConflict: 'user_id,key' }));
  must(await supabase.from('tracker_settings').insert([
    { type: 'water', goal: 2500, display_unit: 'glass', unit_size: 250 },
    { type: 'steps', goal: 10000, display_unit: 'steps', unit_size: null },
    { type: 'sleep', goal: 480, display_unit: 'hm', unit_size: null },
    { type: 'calories', goal: 2000, display_unit: 'kcal', unit_size: null },
  ]));
}
