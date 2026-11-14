import type { SQLiteDatabase } from 'expo-sqlite';

export interface Food { id: number; name: string; kcal: number; protein: number; fat: number; carbs: number; source: 'seed' | 'user' }
/** Öğün kaydı; kalori ve makrolar gram üzerinden hesaplanmış halde. */
export interface FoodLog { id: number; name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number }

/** Kullanıcının eklediği yiyecekler önce. Arama JS'te yapılır (SQLite LIKE Türkçe harflerde büyük/küçük ayırt eder). */
export function getFoods(db: SQLiteDatabase) {
  return db.getAllAsync<Food>("SELECT * FROM foods ORDER BY source = 'user' DESC, name");
}

export async function addFood(db: SQLiteDatabase, f: Omit<Food, 'id' | 'source'>) {
  const r = await db.runAsync("INSERT INTO foods (name, kcal, protein, fat, carbs, source) VALUES (?, ?, ?, ?, ?, 'user')",
    f.name, f.kcal, f.protein, f.fat, f.carbs);
  return r.lastInsertRowId;
}

export async function logFood(db: SQLiteDatabase, date: string, foodId: number, grams: number) {
  await db.runAsync('INSERT INTO food_logs (date, food_id, grams, logged_at) VALUES (?, ?, ?, ?)',
    date, foodId, grams, new Date().toISOString());
}

export async function deleteFoodLog(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM food_logs WHERE id = ?', id);
}

export function getFoodLogs(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<FoodLog>(
    `SELECT l.id, f.name, l.grams, l.grams * f.kcal / 100 AS kcal, l.grams * f.protein / 100 AS protein,
            l.grams * f.fat / 100 AS fat, l.grams * f.carbs / 100 AS carbs
     FROM food_logs l JOIN foods f ON f.id = l.food_id WHERE l.date = ? ORDER BY l.id`, date);
}

/** Günlük toplam kalori; getTrackerHistory ile aynı biçim. */
export function getCalorieHistory(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<{ date: string; value: number }>(
    `SELECT l.date, SUM(l.grams * f.kcal / 100) AS value FROM food_logs l JOIN foods f ON f.id = l.food_id
     WHERE l.date BETWEEN ? AND ? GROUP BY l.date ORDER BY l.date`, from, to);
}
