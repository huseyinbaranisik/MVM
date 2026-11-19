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
import { freezesBetween } from '@/services/xp';
import { t } from '@/i18n';

const REMINDER_ID = 'streak-reminder';
/**
 * Seviye arttıysa kutlar; dondurma ödüllü seviyeler (her 4. seviye) geçildiyse hak verir (ayarlara yazılır, seri hesabı okur).
 * İlk çalışmada mevcut seviye sessizce kaydedilir: geçmiş seviyeler için toplu hak verilmez.
 */
async function checkLevelUp() {
  const { level } = await getLevel();
  const rewards = await getSetting('levelRewards');
  if (!rewards) { await setSetting('levelRewards', { level, grants: [] }); return; }
  if (level <= rewards.level) return;
  const count = freezesBetween(rewards.level, level);
  await setSetting('levelRewards', { level, grants: count ? [...rewards.grants, { date: today(), count }] : rewards.grants });
  play('levelup');
  toast(count ? t('Seviye {level}! +{count} seri dondurma', { level, count }) : t('Seviye {level}!', { level }));
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
          if (r.newlyFrozen) toast(t('Seri dondurma kullanıldı, {n} günlük serin korundu', { n: r.current }));
          const time = (await getSetting('notifications')).streakReminder;
          if (!time) await cancelReminder(REMINDER_ID);
          else {
            await scheduleAt(REMINDER_ID, nextStreakReminder(new Date(), time, r.todayCompleted), t('Serin bozulmasın 🔥'),
              r.current ? t('{n} günlük serin var; bugünü tamamlamak için hâlâ vaktin var.', { n: r.current }) : t('Bugünü tamamla, yeni bir seri başlat.'));
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
