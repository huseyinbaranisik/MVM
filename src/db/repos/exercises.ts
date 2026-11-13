import type { SQLiteDatabase } from 'expo-sqlite';

export interface ExerciseRow {
  id: string;
  name_tr: string;
  equipment: string;
  image_key: string | null;
  role: 'primary' | 'secondary';
}

const MUSCLE_QUERY = (where: string) => `
  SELECT e.id, e.name_tr, e.equipment, e.image_key,
         CASE MIN(CASE em.role WHEN 'primary' THEN 0 ELSE 1 END) WHEN 0 THEN 'primary' ELSE 'secondary' END AS role
  FROM exercises e
  JOIN exercise_muscles em ON em.exercise_id = e.id
  JOIN muscles m ON m.id = em.muscle_id
  WHERE ${where}
  GROUP BY e.id
  ORDER BY role, e.is_favorite DESC, e.name_tr`;

/** Bölgedeki tüm parçaların hareketleri, tekrarsız; herhangi bir parçada birincilse birincil sayılır. */
export function getExercisesByRegion(db: SQLiteDatabase, regionId: string) {
  return db.getAllAsync<ExerciseRow>(MUSCLE_QUERY('m.region_id = ?'), regionId);
}

export function getExercisesByMuscle(db: SQLiteDatabase, muscleId: string) {
  return db.getAllAsync<ExerciseRow>(MUSCLE_QUERY('m.id = ?'), muscleId);
}

export interface ExerciseListItem {
  id: string;
  name_tr: string;
  name_en: string | null;
  equipment: string;
  image_key: string | null;
  photo_uri: string | null;
  source: 'seed' | 'fedb' | 'user';
  is_favorite: 0 | 1;
  /** virgülle ayrılmış bölge id'leri */
  regions: string;
}

/** Kütüphanedeki tüm hareketler (filtreleme ekranda yapılır; ~260 kayıt). Favoriler en üstte, sonra seed ve kullanıcı hareketleri. */
export function getExerciseList(db: SQLiteDatabase) {
  return db.getAllAsync<ExerciseListItem>(`
    SELECT e.id, e.name_tr, e.name_en, e.equipment, e.image_key, e.photo_uri, e.source, e.is_favorite,
           COALESCE((SELECT GROUP_CONCAT(DISTINCT m.region_id) FROM exercise_muscles em JOIN muscles m ON m.id = em.muscle_id
                     WHERE em.exercise_id = e.id), '') AS regions
    FROM exercises e
    ORDER BY e.is_favorite DESC, CASE e.source WHEN 'fedb' THEN 1 ELSE 0 END, e.name_tr`);
}

export interface ExerciseDetail {
  id: string;
  name_tr: string;
  name_en: string | null;
  equipment: string;
  mode: 'reps' | 'time';
  description: string | null;
  instructions: string[];
  mistakes: string[];
  tips: string[];
  instructionsAreEnglish: boolean;
  image_key: string | null;
  photo_uri: string | null;
  source: 'seed' | 'fedb' | 'user';
  is_favorite: boolean;
  primary: string[];
  secondary: string[];
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<ExerciseDetail | null> {
  const e = await db.getFirstAsync<Record<string, string | null>>('SELECT * FROM exercises WHERE id = ?', id);
  if (!e) return null;
  const ms = await db.getAllAsync<{ muscle_id: string; role: string }>('SELECT muscle_id, role FROM exercise_muscles WHERE exercise_id = ?', id);
  const list = (s: string | null): string[] => (s ? JSON.parse(s) : []);
  const tr = list(e.instructions_tr);
  return {
    id: e.id!, name_tr: e.name_tr!, name_en: e.name_en, equipment: e.equipment!, mode: e.mode as 'reps' | 'time',
    description: e.description,
    instructions: tr.length ? tr : list(e.instructions_en),
    instructionsAreEnglish: !tr.length && list(e.instructions_en).length > 0,
    mistakes: list(e.mistakes_tr), tips: list(e.tips_tr),
    image_key: e.image_key, photo_uri: e.photo_uri, source: e.source as ExerciseDetail['source'],
    is_favorite: Number(e.is_favorite) === 1,
    primary: ms.filter((m) => m.role === 'primary').map((m) => m.muscle_id),
    secondary: ms.filter((m) => m.role === 'secondary').map((m) => m.muscle_id),
  };
}

/** Kullanıcının kendi hareketi. */
export async function createUserExercise(db: SQLiteDatabase, x: {
  name: string; description: string; equipment: string; mode: 'reps' | 'time'; photoUri: string | null;
  primary: string[]; secondary: string[];
}) {
  const id = `user_${Date.now()}`;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO exercises (id, name_tr, equipment, mode, description, photo_uri, source) VALUES (?, ?, ?, ?, ?, ?, 'user')`,
      id, x.name, x.equipment, x.mode, x.description || null, x.photoUri);
    for (const m of x.primary) await db.runAsync("INSERT INTO exercise_muscles VALUES (?, ?, 'primary')", id, m);
    for (const m of x.secondary) await db.runAsync("INSERT INTO exercise_muscles VALUES (?, ?, 'secondary')", id, m);
  });
  return id;
}

/** Hareketin geçmişi: her bitmiş oturum için en ağır set ve toplam hacim. */
export function getExerciseHistory(db: SQLiteDatabase, exerciseId: string) {
  return db.getAllAsync<{ date: string; maxKg: number; volume: number; sets: number }>(`
    SELECT s.date, MAX(x.weight_kg) AS maxKg, SUM(COALESCE(x.weight_kg, 0) * COALESCE(x.reps, 0)) AS volume, COUNT(*) AS sets
    FROM session_sets x JOIN workout_sessions s ON s.id = x.session_id
    WHERE x.exercise_id = ? AND x.completed_at IS NOT NULL AND s.status = 'done'
    GROUP BY s.id ORDER BY s.date`, exerciseId);
}

export async function setFavorite(db: SQLiteDatabase, id: string, favorite: boolean) {
  await db.runAsync('UPDATE exercises SET is_favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
}
