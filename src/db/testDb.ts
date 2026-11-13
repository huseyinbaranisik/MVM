// Sadece testler için: expo-sqlite API'sinin kullandığımız kısmını Node'un yerleşik SQLite'ı üzerinde taklit eder,
// böylece migration ve repo SQL'leri telefonsuz gerçek bir SQLite'ta denenir.
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export function nodeDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  const args = (p: unknown[]) =>
    (p.length === 1 && p[0] !== null && typeof p[0] === 'object' && !Array.isArray(p[0]) ? p : p.flat()) as SQLInputValue[];
  const db = {
    execAsync: async (sql: string) => raw.exec(sql),
    runAsync: async (sql: string, ...p: unknown[]) => {
      const r = raw.prepare(sql).run(...args(p));
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    getFirstAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).get(...args(p)) ?? null,
    getAllAsync: async (sql: string, ...p: unknown[]) => raw.prepare(sql).all(...args(p)),
    prepareAsync: async (sql: string) => {
      const st = raw.prepare(sql);
      return { executeAsync: async (...p: unknown[]) => st.run(...args(p)), finalizeAsync: async () => {} };
    },
    withTransactionAsync: async (task: () => Promise<void>) => db.withExclusiveTransactionAsync(task),
    withExclusiveTransactionAsync: async (task: (txn: unknown) => Promise<void>) => {
      raw.exec('BEGIN');
      try { await task(db); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
  return db as unknown as SQLiteDatabase;
}
