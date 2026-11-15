import { useEffect } from 'react';
import { AppState } from 'react-native';

import { toast } from '@/components/ui/overlays';
import { subscribe } from '@/db/bus';
import { evaluateStreak, STREAK_INPUT_TABLES } from '@/db/repos/streak';

/** Görünmez: açılışta, uygulamaya dönünce ve seriyi etkileyen her yazmada seriyi yeniden hesaplar. */
export function StreakSync() {
  useEffect(() => {
    let running = false;
    let again = false;
    const run = async () => {
      if (running) { again = true; return; }
      running = true;
      try {
        do {
          again = false;
          const { fresh } = await evaluateStreak();
          for (const m of fresh) toast(`🔥 ${m} günlük seri! Yeni rozet kazandın.`);
        } while (again);
      } catch (e) {
        console.warn('Seri hesaplanamadı', e);
      } finally {
        running = false;
      }
    };
    run();
    const unsub = subscribe((t) => { if (t.has('*') || [...t].some((x) => STREAK_INPUT_TABLES.has(x))) run(); });
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => { unsub(); appSub.remove(); };
  }, []);
  return null;
}
