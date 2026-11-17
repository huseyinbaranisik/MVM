import { useEffect } from 'react';
import { AppState } from 'react-native';

import { toast } from '@/components/ui/overlays';
import { subscribe } from '@/db/bus';
import { getSetting } from '@/db/repos/settings';
import { evaluateStreak, STREAK_INPUT_TABLES } from '@/db/repos/streak';
import { getLevel, XP_TABLES } from '@/db/repos/xp';
import { cancelReminder, scheduleAt } from '@/services/notifications';
import { nextStreakReminder } from '@/services/streakService';

const REMINDER_ID = 'streak-reminder';
const LEVEL_KEY = 'mvm.lastLevel';

/** Seviye arttıysa kutlar; ilk açılışta mevcut seviyeyi sessizce kaydeder. */
async function checkLevelUp() {
  const { level } = await getLevel();
  const last = Number(localStorage.getItem(LEVEL_KEY) ?? 0);
  if (last && level > last) toast(`⭐ Seviye ${level}!`);
  if (level !== last) localStorage.setItem(LEVEL_KEY, String(level));
}

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
          const r = await evaluateStreak();
          const time = (await getSetting('notifications')).streakReminder;
          if (!time) await cancelReminder(REMINDER_ID);
          else {
            await scheduleAt(REMINDER_ID, nextStreakReminder(new Date(), time, r.todayCompleted), 'Serin bozulmasın 🔥',
              r.current ? `${r.current} günlük serin var; bugünü tamamlamak için hâlâ vaktin var.` : 'Bugünü tamamla, yeni bir seri başlat.');
          }
        } while (again);
        await checkLevelUp();
      } catch (e) {
        console.warn('Seri hesaplanamadı', e);
      } finally {
        running = false;
      }
    };
    run();
    const unsub = subscribe((t) => { if (t.has('*') || [...t].some((x) => STREAK_INPUT_TABLES.has(x) || (XP_TABLES as readonly string[]).includes(x))) run(); });
    const appSub = AppState.addEventListener('change', (s) => { if (s === 'active') run(); });
    return () => { unsub(); appSub.remove(); };
  }, []);
  return null;
}
