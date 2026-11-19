import { useEffect, useState } from 'react';

import { toast } from '@/components/ui/overlays';
import { subscribe } from '@/db/bus';
import { t } from '@/i18n';

/**
 * Sorguyu çalıştırır ve `tables` içindeki bir tabloya yazıldığında (bus.notify) yeniden çalıştırır.
 * Aynı anda gelen birçok yazma tek yenilemede birleşir. Yüklenirken undefined.
 * `tables` sorgunun okuduğu tüm tabloları içermeli; eksik tablo = ekran eski veriyi gösterir.
 */
export function useDb<T>(query: () => Promise<T>, deps: unknown[], tables: readonly string[]): T | undefined {
  const [data, setData] = useState<T>();
  const key = tables.join(',');
  useEffect(() => {
    let alive = true;
    let queued = false;
    const watched = new Set(key.split(','));
    const run = () => {
      query().then((r) => { if (alive) setData(r); }, (e) => {
        console.warn('Sorgu başarısız', e);
        if (alive) toast(t('Bağlantı hatası, veriler yüklenemedi.'));
      });
    };
    run();
    const unsub = subscribe((changed) => {
      if (queued || !(changed.has('*') || [...changed].some((t) => watched.has(t)))) return;
      queued = true;
      setTimeout(() => { queued = false; if (alive) run(); }, 0);
    });
    return () => { alive = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);
  return data;
}

/**
 * Sunucu yanıtını beklemeden gösterilen değer (dokunuş anında ekrana yansır).
 * Veri yeniden çekilince ya da yazma hata verince kendiliğinden gerçek değere döner.
 */
export function useOptimistic<T>(data: T | undefined) {
  const [o, setO] = useState<{ base: T | undefined; value: T } | null>(null);
  const shown = o && o.base === data ? o.value : data;
  const apply = async (value: T, write: () => Promise<unknown>) => {
    setO({ base: data, value });
    try {
      await write();
    } catch (e) {
      console.warn('Yazma başarısız', e);
      setO(null);
      toast(t('Kaydedilemedi, bağlantını kontrol et.'));
    }
  };
  return [shown, apply] as const;
}
