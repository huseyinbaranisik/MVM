import { useEffect, useRef, useState } from 'react';

import { toast } from '@/components/ui/overlays';
import { notify, subscribe } from '@/db/bus';
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
    let seq = 0; // yanıtlar sırasız dönebilir: yalnızca en son başlatılan sorgunun sonucu yazılır
    const watched = new Set(key.split(','));
    const run = () => {
      const mine = ++seq;
      query().then((r) => { if (alive && mine === seq) setData(r); }, (e) => {
        console.warn('Sorgu başarısız', e);
        if (alive && mine === seq) toast(t('Bağlantı hatası, veriler yüklenemedi.'));
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

interface Optimistic<T> { value: T; pending: number; base: T | undefined }

/**
 * Sunucu yanıtını beklemeden gösterilen değer (dokunuş anında ekrana yansır).
 * Art arda dokunuşlarda yazmalar bitene kadar ara yenilemeler yok sayılır (sayaç geri sıçramaz);
 * son yazma bittikten sonra gelen ilk yenileme gerçek değeri gösterir. Yazma hata verirse gerçek değere döner.
 * `next` bir fonksiyonsa o an ekranda görünen değerden hesaplanır (hızlı dokunuşlar birbirini ezmez).
 */
export function useOptimistic<T>(data: T | undefined) {
  const [o, setO] = useState<Optimistic<T> | null>(null);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  // yazmalar sırayla gider: sunucuya farklı sırada ulaşırsa 0 sınırında (ör. önce −, sonra +) sonuç değişir
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const visible = (x: Optimistic<T> | null, d: T | undefined) => (x && (x.pending > 0 || x.base === d) ? x.value : d);
  const shown = visible(o, data);

  const apply = async (next: T | ((prev: T) => T), write: () => Promise<unknown>) => {
    setO((prev) => {
      const cur = visible(prev, dataRef.current) as T;
      const value = typeof next === 'function' ? (next as (p: T) => T)(cur) : next;
      return { value, pending: (prev?.pending ?? 0) + 1, base: dataRef.current };
    });
    const run = queue.current.then(write);
    queue.current = run.catch(() => {});
    try {
      await run;
      // son yazma bitince, o anki veriyi "eski" say: bundan sonraki yenileme (yazmaların hepsini içeren) gösterilir
      setO((prev) => prev && { ...prev, pending: prev.pending - 1, base: prev.pending - 1 === 0 ? dataRef.current : prev.base });
    } catch (e) {
      console.warn('Yazma başarısız', e);
      setO(null);
      toast(t('Kaydedilemedi, bağlantını kontrol et.'));
      notify('*'); // diğer yazmalar başarılı olmuş olabilir: gerçek değeri yeniden oku
    }
  };
  return [shown, apply] as const;
}
