import type { SQLiteDatabase } from 'expo-sqlite';

/** Bir günün antrenman ilerlemesi: o günkü oturumda tamamlanan set / şablondaki toplam set. */
export async function getDayWorkoutProgress(db: SQLiteDatabase, date: string, templateId: number | null) {
  const total = templateId
    ? (await db.getFirstAsync<{ n: number }>(
        'SELECT COALESCE(SUM(sets), 0) AS n FROM template_exercises WHERE template_id = ?', templateId))?.n ?? 0
    : 0;
  const session = await db.getFirstAsync<{ status: string; done: number }>(
    `SELECT s.status, (SELECT COUNT(*) FROM session_sets x WHERE x.session_id = s.id AND x.completed_at IS NOT NULL) AS done
     FROM workout_sessions s WHERE s.date = ? AND s.status != 'abandoned' ORDER BY s.id DESC LIMIT 1`, date);
  return { totalSets: total, doneSets: session?.done ?? 0, finished: session?.status === 'done' };
}

export interface Session {
  id: number;
  template_id: number | null;
  date: string;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'done' | 'abandoned';
}

export interface SessionSet {
  id: number;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  duration_sec: number | null;
}

export function getActiveSession(db: SQLiteDatabase, date: string) {
  return db.getFirstAsync<Session>("SELECT * FROM workout_sessions WHERE date = ? AND status = 'active' ORDER BY id DESC LIMIT 1", date);
}

/** O gün için açık oturum varsa onu, yoksa yenisini döner. */
export async function startSession(db: SQLiteDatabase, templateId: number, date: string) {
  const open = await getActiveSession(db, date);
  if (open) return open.id;
  return (await db.runAsync(
    "INSERT INTO workout_sessions (template_id, date, started_at, status) VALUES (?, ?, ?, 'active')",
    templateId, date, new Date().toISOString())).lastInsertRowId;
}

export function getSession(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Session & { template_name: string | null }>(
    'SELECT s.*, t.name AS template_name FROM workout_sessions s LEFT JOIN workout_templates t ON t.id = s.template_id WHERE s.id = ?', id);
}

export function getSessionSets(db: SQLiteDatabase, sessionId: number) {
  return db.getAllAsync<SessionSet>(
    'SELECT id, exercise_id, set_index, weight_kg, reps, duration_sec FROM session_sets WHERE session_id = ? AND completed_at IS NOT NULL ORDER BY id',
    sessionId);
}

/** Hareketin bu oturumdan önceki son bitmiş oturumdaki setleri ("önceki değerler"). */
export async function getPreviousSets(db: SQLiteDatabase, exerciseId: string, beforeSessionId: number) {
  const last = await db.getFirstAsync<{ id: number }>(
    `SELECT s.id FROM workout_sessions s JOIN session_sets x ON x.session_id = s.id
     WHERE x.exercise_id = ? AND s.status = 'done' AND s.id != ? AND x.completed_at IS NOT NULL
     ORDER BY s.started_at DESC LIMIT 1`, exerciseId, beforeSessionId);
  if (!last) return [];
  return db.getAllAsync<SessionSet>(
    `SELECT id, exercise_id, set_index, weight_kg, reps, duration_sec FROM session_sets
     WHERE session_id = ? AND exercise_id = ? AND completed_at IS NOT NULL ORDER BY set_index`, last.id, exerciseId);
}

/** Setin tamamlanması: aynı set varsa güncellenir. */
export async function saveSet(db: SQLiteDatabase, sessionId: number, exerciseId: string, setIndex: number,
  v: { weight_kg: number | null; reps: number | null; duration_sec: number | null }) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM session_sets WHERE session_id = ? AND exercise_id = ? AND set_index = ?', sessionId, exerciseId, setIndex);
    await db.runAsync(
      `INSERT INTO session_sets (session_id, exercise_id, set_index, weight_kg, reps, duration_sec, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, sessionId, exerciseId, setIndex, v.weight_kg, v.reps, v.duration_sec, new Date().toISOString());
  });
}

export async function deleteSet(db: SQLiteDatabase, sessionId: number, exerciseId: string, setIndex: number) {
  await db.runAsync('DELETE FROM session_sets WHERE session_id = ? AND exercise_id = ? AND set_index = ?', sessionId, exerciseId, setIndex);
}

export async function endSession(db: SQLiteDatabase, id: number, status: 'done' | 'abandoned') {
  await db.runAsync('UPDATE workout_sessions SET status = ?, ended_at = ? WHERE id = ?', status, new Date().toISOString(), id);
}

/** Hareket bazında bu oturumdan önceki en iyi ağırlık ve tahmini 1RM (Epley). */
export async function getPreviousBests(db: SQLiteDatabase, sessionId: number) {
  const rows = await db.getAllAsync<{ exercise_id: string; maxKg: number; maxE1rm: number }>(
    `SELECT x.exercise_id, MAX(x.weight_kg) AS maxKg, MAX(x.weight_kg * (1 + x.reps / 30.0)) AS maxE1rm
     FROM session_sets x JOIN workout_sessions s ON s.id = x.session_id
     WHERE s.status = 'done' AND s.id != ? AND x.completed_at IS NOT NULL AND x.weight_kg IS NOT NULL
       AND x.exercise_id IN (SELECT exercise_id FROM session_sets WHERE session_id = ?)
     GROUP BY x.exercise_id`, sessionId, sessionId);
  return new Map(rows.map((r) => [r.exercise_id, { maxKg: r.maxKg, maxE1rm: r.maxE1rm ?? 0 }]));
}

/** Tarih aralığında antrenmanı bitirilmiş günler. */
export async function getWorkoutDates(db: SQLiteDatabase, from: string, to: string) {
  const rows = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT date FROM workout_sessions WHERE status = 'done' AND date BETWEEN ? AND ?", from, to);
  return new Set(rows.map((r) => r.date));
}
