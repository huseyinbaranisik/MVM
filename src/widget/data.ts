import { dayItemName, getDayItems } from '@/db/repos/schedule';
import { getStreakState } from '@/db/repos/streak';
import { getTrackerSettings, getTrackerValue } from '@/db/repos/trackers';
import { getLevel } from '@/db/repos/xp';
import { supabase } from '@/db/supabase';
import { today, weekday } from '@/services/dates';

export interface WidgetData {
  signedIn: boolean;
  streak: number;
  level: number;
  plan: string;
  water: number; // bardak
  waterGoal: number;
  steps: number;
  stepGoal: number;
  glassMl: number;
}

/** Widget'ın gösterdiği günlük özet (oturum yoksa signedIn: false). */
export async function getWidgetData(): Promise<WidgetData> {
  const empty: WidgetData = { signedIn: false, streak: 0, level: 1, plan: '', water: 0, waterGoal: 0, steps: 0, stepGoal: 0, glassMl: 250 };
  if (!(await supabase.auth.getSession()).data.session) return empty;
  const d = today();
  const [state, items, ml, ws, steps, ss, lv] = await Promise.all([
    getStreakState(), getDayItems(weekday(d)), getTrackerValue('water', d), getTrackerSettings('water'),
    getTrackerValue('steps', d), getTrackerSettings('steps'), getLevel(),
  ]);
  const glassMl = ws?.unit_size ?? 250;
  return {
    signedIn: true,
    streak: state?.current ?? 0,
    level: lv.level,
    plan: items.length ? items.map(dayItemName).join(' + ') : 'Plan yok',
    water: Math.round((ml / glassMl) * 10) / 10,
    waterGoal: Math.round(((ws?.goal ?? 2000) / glassMl) * 10) / 10,
    steps,
    stepGoal: ss?.goal ?? 10000,
    glassMl,
  };
}
