import { muscles } from '@/data/muscleMap';
import { getCalorieHistory } from '@/db/repos/foods';
import { getDayItems } from '@/db/repos/schedule';
import { getSleep } from '@/db/repos/sleep';
import { getStreakState } from '@/db/repos/streak';
import { getTemplateMuscles } from '@/db/repos/templates';
import { getTrackerSettings, getTrackerValue } from '@/db/repos/trackers';
import { getLevel } from '@/db/repos/xp';
import { supabase } from '@/db/supabase';
import { today, weekday } from '@/services/dates';

export interface WidgetPlan {
  kind: 'workout' | 'walk' | 'rest';
  name: string;
  sub: string;
  /** çalışan bölgeler (antrenmanda) */
  regions: string[];
}

export interface WidgetData {
  signedIn: boolean;
  streak: number;
  level: number;
  rank: string;
  xpInto: number;
  xpNeeded: number;
  plans: WidgetPlan[];
  water: number; // bardak
  waterGoal: number;
  steps: number;
  stepGoal: number;
  kcal: number;
  kcalGoal: number;
  sleepMin: number | null;
  sleepGoal: number;
  glassMl: number;
}

const DEMO: WidgetData = {
  signedIn: true, streak: 12, level: 4, rank: 'Çaylak', xpInto: 70, xpNeeded: 250,
  plans: [
    { kind: 'workout', name: 'Üst Vücut A', sub: '6 hareket', regions: ['chest', 'shoulders', 'triceps', 'rear_delts'] },
    { kind: 'walk', name: 'Yürüyüş', sub: 'Hedef 10.000 adım', regions: [] },
  ],
  water: 5, waterGoal: 10, steps: 6420, stepGoal: 10000, kcal: 850, kcalGoal: 2400, sleepMin: 426, sleepGoal: 480, glassMl: 250,
};

const regionOf = new Map(muscles.map((m) => [m.id, m.regionId]));

/** Widget'ın gösterdiği günlük özet (oturum yoksa signedIn: false). */
export async function getWidgetData(): Promise<WidgetData> {
  const empty: WidgetData = {
    signedIn: false, streak: 0, level: 1, rank: '', xpInto: 0, xpNeeded: 1, plans: [], water: 0, waterGoal: 0,
    steps: 0, stepGoal: 0, kcal: 0, kcalGoal: 0, sleepMin: null, sleepGoal: 480, glassMl: 250,
  };
  // Ekran görüntüsü / emülatör denemesi için örnek veri (yalnızca EXPO_PUBLIC_WIDGET_DEMO=1 ile derlenen sürümde)
  if (process.env.EXPO_PUBLIC_WIDGET_DEMO === '1') return DEMO;
  if (!(await supabase.auth.getSession()).data.session) return empty;
  const d = today();
  const [state, items, ml, ws, steps, ss, kcal, ks, sleep, sls, lv] = await Promise.all([
    getStreakState(), getDayItems(weekday(d)), getTrackerValue('water', d), getTrackerSettings('water'),
    getTrackerValue('steps', d), getTrackerSettings('steps'), getCalorieHistory(d, d), getTrackerSettings('calories'),
    getSleep(d), getTrackerSettings('sleep'), getLevel(),
  ]);
  const stepGoal = ss?.goal ?? 10000;
  const plans = await Promise.all(items.slice(0, 2).map(async (i): Promise<WidgetPlan> => {
    if (i.kind !== 'workout') {
      return { kind: i.kind, name: i.kind === 'walk' ? 'Yürüyüş' : 'Dinlenme', sub: i.kind === 'walk' ? `Hedef ${stepGoal.toLocaleString('tr-TR')} adım` : '', regions: [] };
    }
    const m = i.templateId ? await getTemplateMuscles(i.templateId) : { primary: [] as string[] };
    return {
      kind: 'workout', name: i.templateName ?? 'Antrenman', sub: `${i.exerciseCount} hareket`,
      regions: [...new Set(m.primary.map((id) => regionOf.get(id)).filter((r): r is string => !!r))],
    };
  }));
  const glassMl = ws?.unit_size ?? 250;
  return {
    signedIn: true,
    streak: state?.current ?? 0,
    level: lv.level,
    rank: lv.rank,
    xpInto: lv.intoLevel,
    xpNeeded: lv.needed,
    plans,
    water: Math.round((ml / glassMl) * 10) / 10,
    waterGoal: Math.round(((ws?.goal ?? 2000) / glassMl) * 10) / 10,
    steps,
    stepGoal,
    kcal: Math.round(kcal[0]?.value ?? 0),
    kcalGoal: ks?.goal ?? 2000,
    sleepMin: sleep?.duration_min ?? null,
    sleepGoal: sls?.goal ?? 480,
    glassMl,
  };
}
