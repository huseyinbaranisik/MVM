import { useEffect } from 'react';
import { AppState } from 'react-native';

import { toast } from '@/components/ui/overlays';
import { subscribe } from '@/db/bus';
import { getSetting, setSetting } from '@/db/repos/settings';
import { evaluateStreak, STREAK_INPUT_TABLES } from '@/db/repos/streak';
import { getLevel, XP_TABLES } from '@/db/repos/xp';
import { cancelReminder, scheduleAt } from '@/services/notifications';
import { today } from '@/services/dates';
import { nextStreakReminder } from '@/services/streakService';
import { play } from '@/services/sounds';
import { FREEZES_PER_LEVEL } from '@/services/xp';

const REMINDER_ID = 'streak-reminder';
/**
 * Seviye arttıysa kutlar ve her yeni seviye için dondurma hakkı verir (ayarlara yazılır, seri hesabı okur).
 * İlk çalışmada mevcut seviye sessizce kaydedilir: geçmiş seviyeler için toplu hak verilmez.
 */
async function checkLevelUp() {
  const { level } = await getLevel();
  const rewards = await getSetting('levelRewards');
  if (!rewards) { await setSetting('levelRewards', { level, grants: [] }); return; }
  if (level <= rewards.level) return;
  const count = (level - rewards.level) * FREEZES_PER_LEVEL;
  await setSetting('levelRewards', { level, grants: [...rewards.grants, { date: today(), count }] });
  play('levelup');
  toast(`Seviye ${level}! +${count} seri dondurma`);
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
          if (r.newlyFrozen) toast(`Seri dondurma kullanıldı, ${r.current} günlük serin korundu`);
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
