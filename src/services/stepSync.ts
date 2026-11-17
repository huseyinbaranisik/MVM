import { notify } from '@/db/bus';
import { raiseTrackerValue } from '@/db/repos/trackers';
import { today } from '@/services/dates';
import { healthConnectConnected, readDailySteps } from '@/services/healthConnect';

/** Health Connect bağlıysa son günlerin adımlarını uygulamaya taşır. Bağlıysa true döner. */
export async function syncStepsFromHealthConnect(days = 7) {
  if (!(await healthConnectConnected())) return false;
  try {
    let changed = false;
    for (const d of await readDailySteps(today(), days)) {
      if (d.steps > 0 && (await raiseTrackerValue('steps', d.date, d.steps))) changed = true;
    }
    if (changed) notify('daily_trackers');
  } catch (e) {
    console.warn('Health Connect okunamadı', e);
  }
  return true;
}
