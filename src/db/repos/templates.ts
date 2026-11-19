import { notify } from '@/db/bus';
import { getCatalog } from '@/db/repos/exercises';
import { maybe, must, supabase } from '@/db/supabase';
import { t } from '@/i18n';

export interface TemplateSummary { id: number; name: string; exerciseCount: number }

export interface TemplateExercise {
  id: number;
  exercise_id: string;
  name_tr: string;
  image_key: string | null;
  photo_uri: string | null;
  mode: 'reps' | 'time';
  is_heavy: 0 | 1;
  position: number;
  sets: number;
  rep_min: number | null;
  rep_max: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
  per_side: 0 | 1;
  superset_group: number | null;
}

export async function getTemplates(): Promise<TemplateSummary[]> {
  const rows = must(await supabase.from('workout_templates').select('id, name, template_exercises(count)').order('id'));
  return rows.map((t) => ({ id: t.id, name: t.name, exerciseCount: (t.template_exercises as unknown as { count: number }[])[0]?.count ?? 0 }));
}

export async function getTemplateName(id: number) {
  return maybe(await supabase.from('workout_templates').select('name').eq('id', id).maybeSingle());
}

export async function getTemplateExercises(templateId: number): Promise<TemplateExercise[]> {
  const [rows, c] = await Promise.all([
    supabase.from('template_exercises').select('*').eq('template_id', templateId).order('position'),
    getCatalog(),
  ]);
  return must(rows).map((te) => {
    const e = c.byId.get(te.exercise_id);
    return {
      id: te.id, exercise_id: te.exercise_id, position: te.position, sets: te.sets, rep_min: te.rep_min, rep_max: te.rep_max,
      duration_sec: te.duration_sec, rest_sec: te.rest_sec, per_side: te.per_side ? 1 : 0, superset_group: te.superset_group,
      name_tr: e?.name_tr ?? t('Silinmiş hareket'), image_key: e?.image_key ?? null, photo_uri: e?.photo_uri ?? null,
      mode: e?.mode ?? 'reps', is_heavy: e?.is_heavy ? 1 : 0,
    };
  });
}

/** Kullanıcı başına en fazla şablon (sunucuda da tetikleyiciyle uygulanır). */
export const MAX_TEMPLATES = 10;
export const TEMPLATE_LIMIT_MSG = t('En fazla {n} program oluşturabilirsin', { n: MAX_TEMPLATES });

export async function createTemplate(name: string): Promise<number> {
  const { count, error } = await supabase.from('workout_templates').select('id', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) >= MAX_TEMPLATES) throw new Error(TEMPLATE_LIMIT_MSG);
  const r = must(await supabase.from('workout_templates').insert({ name }).select('id').single());
  notify('workout_templates');
  return r.id;
}

export async function renameTemplate(id: number, name: string) {
  must(await supabase.from('workout_templates').update({ name }).eq('id', id));
  notify('workout_templates');
}

/** Şablonu siler; günlerdeki öğeleri de silinir (cascade). */
export async function deleteTemplate(id: number) {
  must(await supabase.from('workout_templates').delete().eq('id', id));
  notify('workout_templates', 'template_exercises', 'day_schedule_items');
}

/** Şablonun sonuna varsayılan değerlerle hareket ekler (tekrarlı: 3×8-12, süreli: 3×30 sn). */
export async function addTemplateExercise(templateId: number, exerciseId: string) {
  const [c, last] = await Promise.all([
    getCatalog(),
    supabase.from('template_exercises').select('position').eq('template_id', templateId).order('position', { ascending: false }).limit(1),
  ]);
  const timed = c.byId.get(exerciseId)?.mode === 'time';
  must(await supabase.from('template_exercises').insert({
    template_id: templateId, exercise_id: exerciseId, position: (must(last)[0]?.position ?? -1) + 1, sets: 3,
    rep_min: timed ? null : 8, rep_max: timed ? null : 12, duration_sec: timed ? 30 : null,
  }));
  notify('template_exercises');
}

export async function updateTemplateExercise(
  id: number,
  patch: Partial<Pick<TemplateExercise, 'sets' | 'rep_min' | 'rep_max' | 'duration_sec' | 'rest_sec' | 'per_side' | 'superset_group'>>,
) {
  if (!Object.keys(patch).length) return;
  const { per_side, ...rest } = patch;
  must(await supabase.from('template_exercises').update(per_side == null ? rest : { ...rest, per_side: per_side === 1 }).eq('id', id));
  notify('template_exercises');
}

export async function removeTemplateExercise(id: number) {
  must(await supabase.from('template_exercises').delete().eq('id', id));
  notify('template_exercises');
}

/** Sıralamayı verilen id dizisine göre yazar. */
export async function reorderTemplateExercises(orderedIds: number[]) {
  await Promise.all(orderedIds.map(async (id, position) => must(await supabase.from('template_exercises').update({ position }).eq('id', id))));
  notify('template_exercises');
}

/** "4 × 6-8 (her taraf) · 90 sn dinlenme" */
export function summary(x: TemplateExercise) {
  const reps = x.duration_sec ? `${x.duration_sec} ${t('sn')}` : x.rep_min === x.rep_max || !x.rep_max ? `${x.rep_min ?? '?'}` : `${x.rep_min}-${x.rep_max}`;
  return `${x.sets} × ${reps}${x.per_side ? t(' (her taraf)') : ''}${x.rest_sec ? ` · ${t('{n} sn dinlenme', { n: x.rest_sec })}` : ''}`;
}

/** Şablonun çalıştırdığı kaslar (mini vücut haritası için); bir harekette birincilse birincil sayılır. */
export async function getTemplateMuscles(templateId: number) {
  const [rows, c] = await Promise.all([supabase.from('template_exercises').select('exercise_id').eq('template_id', templateId), getCatalog()]);
  const primary = new Set<string>();
  const secondary = new Set<string>();
  for (const { exercise_id } of must(rows)) {
    const e = c.byId.get(exercise_id);
    e?.primary.forEach((m) => primary.add(m));
    e?.secondary.forEach((m) => secondary.add(m));
  }
  return { primary: [...primary], secondary: [...secondary].filter((m) => !primary.has(m)) };
}
