import type { SQLiteDatabase } from 'expo-sqlite';

export async function up(db: SQLiteDatabase) {
  await db.execAsync('ALTER TABLE exercises ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;');
}
