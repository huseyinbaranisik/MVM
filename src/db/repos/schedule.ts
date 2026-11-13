import type { SQLiteDatabase } from 'expo-sqlite';

export interface DayPlan {
  weekday: number;
  kind: 'workout' | 'rest' | 'walk';
  templateId: number | null;
  templateName: string | null;
  exerciseCount: number;
}

const SELECT = `
  SELECT d.weekday, d.kind, d.template_id AS templateId, t.name AS templateName,
         (SELECT COUNT(*) FROM template_exercises te WHERE te.template_id = d.template_id) AS exerciseCount
  FROM day_schedule d LEFT JOIN workout_templates t ON t.id = d.template_id`;

export function getWeekPlan(db: SQLiteDatabase) {
  return db.getAllAsync<DayPlan>(`${SELECT} ORDER BY d.weekday`);
}

export function getDayPlan(db: SQLiteDatabase, weekday: number) {
  return db.getFirstAsync<DayPlan>(`${SELECT} WHERE d.weekday = ?`, weekday);
}
