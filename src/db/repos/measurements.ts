import type { SQLiteDatabase } from 'expo-sqlite';

export type MeasurementType = 'weight' | 'height';
export interface Measurement { id: number; value: number; date: string }

/** Aynı gün ikinci kayıt öncekinin üzerine yazar (günde tek değer). */
export async function saveMeasurement(db: SQLiteDatabase, type: MeasurementType, value: number, date: string) {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM body_measurements WHERE type = ? AND date = ?', type, date);
    await txn.runAsync('INSERT INTO body_measurements (type, value, date) VALUES (?, ?, ?)', type, value, date);
  });
}

export function getMeasurements(db: SQLiteDatabase, type: MeasurementType) {
  return db.getAllAsync<Measurement>('SELECT id, value, date FROM body_measurements WHERE type = ? ORDER BY date, id', type);
}

export async function deleteMeasurement(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM body_measurements WHERE id = ?', id);
}
