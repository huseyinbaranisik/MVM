import type { SQLiteDatabase } from 'expo-sqlite';

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

export function getTemplates(db: SQLiteDatabase) {
  return db.getAllAsync<TemplateSummary>(`
    SELECT t.id, t.name, (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = t.id) AS exerciseCount
    FROM workout_templates t ORDER BY t.id`);
}

export function getTemplateName(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<{ name: string }>('SELECT name FROM workout_templates WHERE id = ?', id);
}

export function getTemplateExercises(db: SQLiteDatabase, templateId: number) {
  return db.getAllAsync<TemplateExercise>(`
    SELECT te.*, e.name_tr, e.image_key, e.photo_uri, e.mode, e.is_heavy
    FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
    WHERE te.template_id = ? ORDER BY te.position`, templateId);
}

export async function createTemplate(db: SQLiteDatabase, name: string) {
  return (await db.runAsync('INSERT INTO workout_templates (name) VALUES (?)', name)).lastInsertRowId;
}

export async function renameTemplate(db: SQLiteDatabase, id: number, name: string) {
  await db.runAsync('UPDATE workout_templates SET name = ? WHERE id = ?', name, id);
}

/** Şablonu siler; atandığı günler dinlenme gününe döner (FK: ON DELETE SET NULL). */
export async function deleteTemplate(db: SQLiteDatabase, id: number) {
  await db.runAsync("UPDATE day_schedule SET kind = 'rest' WHERE template_id = ?", id);
  await db.runAsync('DELETE FROM workout_templates WHERE id = ?', id);
}

/** Şablonun sonuna varsayılan değerlerle hareket ekler (tekrarlı: 3×8-12, süreli: 3×30 sn). */
export async function addTemplateExercise(db: SQLiteDatabase, templateId: number, exerciseId: string) {
  const e = await db.getFirstAsync<{ mode: string }>('SELECT mode FROM exercises WHERE id = ?', exerciseId);
  const timed = e?.mode === 'time';
  await db.runAsync(
    `INSERT INTO template_exercises (template_id, exercise_id, position, sets, rep_min, rep_max, duration_sec)
     VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM template_exercises WHERE template_id = ?), 3, ?, ?, ?)`,
    templateId, exerciseId, templateId, timed ? null : 8, timed ? null : 12, timed ? 30 : null);
}

export async function updateTemplateExercise(
  db: SQLiteDatabase, id: number,
  patch: Partial<Pick<TemplateExercise, 'sets' | 'rep_min' | 'rep_max' | 'duration_sec' | 'rest_sec' | 'per_side' | 'superset_group'>>,
) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  await db.runAsync(`UPDATE template_exercises SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ...keys.map((k) => patch[k] ?? null), id);
}

export async function removeTemplateExercise(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', id);
}

/** Sıralamayı verilen id dizisine göre yazar. */
export async function reorderTemplateExercises(db: SQLiteDatabase, orderedIds: number[]) {
  await db.withTransactionAsync(async () => {
    for (const [pos, id] of orderedIds.entries()) await db.runAsync('UPDATE template_exercises SET position = ? WHERE id = ?', pos, id);
  });
}

export async function setDaySchedule(db: SQLiteDatabase, weekday: number, kind: 'workout' | 'rest' | 'walk', templateId: number | null) {
  await db.runAsync('UPDATE day_schedule SET kind = ?, template_id = ? WHERE weekday = ?',
    kind, kind === 'workout' ? templateId : null, weekday);
}

/** "Programıma ekle": günün şablonuna ekler; günün şablonu yoksa yeni şablon açıp güne atar. */
export async function addExerciseToDay(db: SQLiteDatabase, weekday: number, dayName: string, exerciseId: string) {
  const day = await db.getFirstAsync<{ template_id: number | null }>('SELECT template_id FROM day_schedule WHERE weekday = ?', weekday);
  let templateId = day?.template_id ?? null;
  if (!templateId) {
    templateId = await createTemplate(db, `${dayName} antrenmanı`);
    await setDaySchedule(db, weekday, 'workout', templateId);
  }
  await addTemplateExercise(db, templateId, exerciseId);
  return templateId;
}

/** "4 × 6-8 (her taraf) · 90 sn dinlenme" */
export function summary(x: TemplateExercise) {
  const reps = x.duration_sec ? `${x.duration_sec} sn` : x.rep_min === x.rep_max || !x.rep_max ? `${x.rep_min ?? '?'}` : `${x.rep_min}-${x.rep_max}`;
  return `${x.sets} × ${reps}${x.per_side ? ' (her taraf)' : ''}${x.rest_sec ? ` · ${x.rest_sec} sn dinlenme` : ''}`;
}

/** Şablonun çalıştırdığı kaslar (mini vücut haritası için); bir harekette birincilse birincil sayılır. */
export async function getTemplateMuscles(db: SQLiteDatabase, templateId: number) {
  const rows = await db.getAllAsync<{ muscle_id: string; isPrimary: number }>(
    `SELECT em.muscle_id, MAX(em.role = 'primary') AS isPrimary
     FROM template_exercises te JOIN exercise_muscles em ON em.exercise_id = te.exercise_id
     WHERE te.template_id = ? GROUP BY em.muscle_id`, templateId);
  return {
    primary: rows.filter((r) => r.isPrimary).map((r) => r.muscle_id),
    secondary: rows.filter((r) => !r.isPrimary).map((r) => r.muscle_id),
  };
}
