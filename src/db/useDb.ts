import { addDatabaseChangeListener, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState } from 'react';

/**
 * Sorguyu çalıştırır ve `tables` içindeki bir tabloya yazıldığında yeniden çalıştırır
 * (SQLiteProvider'da enableChangeListener açık). Aynı anda gelen birçok yazma tek yenilemede birleşir.
 * `tables` sorgunun okuduğu tüm tabloları içermeli; eksik tablo = ekran eski veriyi gösterir.
 */
export function useDb<T>(query: (db: SQLiteDatabase) => Promise<T>, deps: unknown[], tables: readonly string[]): T | undefined {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const key = tables.join(',');
  useEffect(() => {
    let alive = true;
    let queued = false;
    const watched = new Set(key.split(','));
    const run = () => { query(db).then((r) => { if (alive) setData(r); }); };
    run();
    const sub = addDatabaseChangeListener((e) => {
      if (queued || !watched.has(e.tableName)) return;
      queued = true;
      // bir transaction onlarca satır yazabilir: hepsini tek sorguda topla
      setTimeout(() => { queued = false; if (alive) run(); }, 0);
    });
    return () => { alive = false; sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key, ...deps]);
  return data;
}
