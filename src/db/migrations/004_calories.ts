import type { SQLiteDatabase } from 'expo-sqlite';

import { seedFoods } from '@/data/foods';

// Yiyecek değerleri 100 g başına; öğün kaydı sadece gram tutar, kalori/makro sorguda hesaplanır.
export async function up(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('seed','user'))
);
CREATE TABLE food_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  grams REAL NOT NULL CHECK (grams > 0),
  logged_at TEXT NOT NULL
);
CREATE INDEX idx_food_logs_date ON food_logs(date);
INSERT INTO tracker_settings (type, goal, display_unit, unit_size) VALUES ('calories', 2000, 'kcal', NULL);
`);
  const ins = await db.prepareAsync("INSERT INTO foods (name, kcal, protein, fat, carbs, source) VALUES (?, ?, ?, ?, ?, 'seed')");
  try {
    for (const f of seedFoods) await ins.executeAsync(...f);
  } finally {
    await ins.finalizeAsync();
  }
}
