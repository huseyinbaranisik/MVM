import type { SQLiteDatabase } from 'expo-sqlite';

import fedb from '@/data/exercises.fedb.json';
import { mapFedbMuscles } from '@/data/fedbMuscles';
import { muscles, regions } from '@/data/muscleMap';
import { seedExercises } from '@/data/seedExercises';
import { seedHabits, seedTemplates, walkDays } from '@/data/seedProgram';
import { today } from '@/services/dates';
import { DEFAULT_RULE } from '@/services/streakService';

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  profile: { name: 'Baran', age: null, sex: null, targetWeightKg: null },
  weightUnit: 'kg',
  restSec: { heavy: 120, normal: 75 },
  notifications: { streakReminder: '20:00', bedtimeReminder: null },
  streakRule: DEFAULT_RULE,
  morningSleepPrompt: true,
  startDate: today(), // streak bu günden itibaren değerlendirilir
  onboarded: false,
};

export async function up(db: SQLiteDatabase) {
  const json = (v: unknown) => JSON.stringify(v);

  for (const [i, r] of regions.entries()) {
    await db.runAsync('INSERT INTO regions (id, name_tr, side, sort) VALUES (?, ?, ?, ?)', r.id, r.nameTr, r.side, i);
  }
  for (const m of muscles) {
    await db.runAsync('INSERT INTO muscles (id, name_tr, name_latin, region_id, description) VALUES (?, ?, ?, ?, ?)',
      m.id, m.nameTr, m.nameLatin, m.regionId, m.description);
  }

  const insEx = await db.prepareAsync(
    `INSERT INTO exercises (id, name_tr, name_en, equipment, mode, is_heavy, instructions_tr, mistakes_tr, tips_tr, instructions_en, image_key, source)
     VALUES ($id, $nameTr, $nameEn, $equipment, $mode, $heavy, $ins, $mistakes, $tips, $insEn, $image, $source)`);
  const insEm = await db.prepareAsync('INSERT INTO exercise_muscles (exercise_id, muscle_id, role) VALUES (?, ?, ?)');
  try {
    for (const s of seedExercises) {
      await insEx.executeAsync({
        $id: s.id, $nameTr: s.nameTr, $nameEn: null, $equipment: s.equipment, $mode: s.mode, $heavy: s.heavy ? 1 : 0,
        $ins: json(s.instructions), $mistakes: json(s.mistakes), $tips: json(s.tips), $insEn: null, $image: s.imageId, $source: 'seed',
      });
      for (const m of s.primary) await insEm.executeAsync(s.id, m, 'primary');
      for (const m of s.secondary) await insEm.executeAsync(s.id, m, 'secondary');
    }
    for (const e of fedb) {
      await insEx.executeAsync({
        $id: e.id, $nameTr: e.nameTr, $nameEn: e.nameEn, $equipment: e.equipment, $mode: 'reps',
        // shortcut: bileşik + ağırlıklı hareketleri "ağır" (120 sn) say; kullanıcı şablonda değiştirebilir
        $heavy: e.mechanic === 'compound' && e.equipment !== 'bodyweight' ? 1 : 0,
        $ins: null, $mistakes: null, $tips: null, $insEn: json(e.instructions), $image: e.id, $source: 'fedb',
      });
      for (const { muscleId, role } of mapFedbMuscles(e.nameEn, e.primary, e.secondary)) {
        await insEm.executeAsync(e.id, muscleId, role);
      }
    }
  } finally {
    await insEx.finalizeAsync();
    await insEm.finalizeAsync();
  }

  const scheduled = new Map<number, number>();
  for (const tpl of seedTemplates) {
    const { lastInsertRowId: templateId } = await db.runAsync('INSERT INTO workout_templates (name) VALUES (?)', tpl.name);
    scheduled.set(tpl.weekday, templateId);
    for (const [pos, x] of tpl.exercises.entries()) {
      await db.runAsync(
        `INSERT INTO template_exercises (template_id, exercise_id, position, sets, rep_min, rep_max, duration_sec, per_side, superset_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        templateId, x.exerciseId, pos, x.sets, x.repMin ?? null, x.repMax ?? null, x.durationSec ?? null,
        x.perSide ? 1 : 0, x.superset ?? null);
    }
  }
  for (let wd = 0; wd < 7; wd++) {
    const templateId = scheduled.get(wd);
    await db.runAsync('INSERT INTO day_schedule (weekday, kind, template_id) VALUES (?, ?, ?)',
      wd, templateId ? 'workout' : walkDays.includes(wd) ? 'walk' : 'rest', templateId ?? null);
  }

  for (const [i, h] of seedHabits.entries()) {
    await db.runAsync('INSERT INTO habits (name, icon, position) VALUES (?, ?, ?)', h.name, h.icon, i);
  }
  await db.runAsync(`INSERT INTO tracker_settings (type, goal, display_unit, unit_size) VALUES
    ('water', 2500, 'glass', 250),
    ('steps', 10000, 'steps', NULL),
    ('sleep', 480, 'hm', NULL)`);
  await db.runAsync('INSERT INTO streak_state (id) VALUES (1)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', key, json(value));
  }
}
