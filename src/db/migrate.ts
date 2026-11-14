import type { SQLiteDatabase } from 'expo-sqlite';

import * as m001 from './migrations/001_schema';
import * as m002 from './migrations/002_seed';
import * as m003 from './migrations/003_favorites';
import * as m004 from './migrations/004_calories';

// Sıra önemli: index + 1 = şema sürümü (PRAGMA user_version). Yeni migration'ı sadece sona ekle.
const migrations = [m001, m002, m003, m004];

export const DB_NAME = 'mvm.db';
export const SCHEMA_VERSION = migrations.length;

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = 'wal'; PRAGMA foreign_keys = ON;");
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  for (let v = row?.user_version ?? 0; v < migrations.length; v++) {
    // her migration kendi transaction'ında: yarıda kalırsa geri alınır, sürüm artmaz
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migrations[v].up(txn);
      await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
