import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Sorguyu çalıştırır ve veritabanında herhangi bir yazma olduğunda yeniden çalıştırır
 * (SQLiteProvider'da enableChangeListener açık). Elle "yenile" çağırmaya gerek kalmaz.
 */
export function useDb<T>(query: (db: SQLiteDatabase) => Promise<T>, deps: unknown[]): T | undefined {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  useEffect(() => {
    let alive = true;
    const run = () => { query(db).then((r) => { if (alive) setData(r); }); };
    run();
    const sub = addDatabaseChangeListener(run);
    return () => { alive = false; sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ...deps]);
  return data;
}
