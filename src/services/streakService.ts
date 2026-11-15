import { addDays, diffDays, weekday, type DateStr } from './dates';

// Streak hesabının tek kaynağı. Saf fonksiyon: DB'ye dokunmaz, her seferinde tüm geçmişten yeniden hesaplar
// (yılda 365 gün, ucuz) — böylece kural değişince geçmiş tutarlı şekilde yeniden değerlendirilir.

export type DayKind = 'workout' | 'rest'; // 'rest' = dinlenme veya yürüyüş günü
export type StreakStatus = 'completed' | 'frozen' | 'missed';

export interface StreakRule {
  /** Dinlenme günü neyle tamamlanır */
  restDayMode: 'stepsOrChecklist' | 'steps' | 'checklist';
  /** Checklist eşiği, 0..1 */
  checklistThreshold: number;
}

export const DEFAULT_RULE: StreakRule = { restDayMode: 'stepsOrChecklist', checklistThreshold: 0.5 };
export const MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;
export const MAX_FREEZES = 2;
export const DAYS_PER_FREEZE = 7;

export interface DayInput {
  date: DateStr;
  kind: DayKind;
  workoutDone: boolean;
  stepGoalMet: boolean;
  /** Tamamlanan / o gün görünen alışkanlık. Alışkanlık yoksa 0. */
  checklistRatio: number;
}

export interface StreakResult {
  days: { date: DateStr; status: StreakStatus }[];
  current: number;
  longest: number;
  freezesAvailable: number;
  todayCompleted: boolean;
  milestones: number[];
}

export function isDayComplete(d: DayInput, rule: StreakRule = DEFAULT_RULE): boolean {
  if (d.kind === 'workout') return d.workoutDone;
  const checklist = d.checklistRatio >= rule.checklistThreshold;
  if (rule.restDayMode === 'steps') return d.stepGoalMet;
  if (rule.restDayMode === 'checklist') return checklist;
  return d.stepGoalMet || checklist;
}

/**
 * @param inputs  Herhangi sırada gün verileri. Listede olmayan günler "hiçbir şey yapılmadı" sayılır.
 * @param start   Serinin değerlendirilmeye başlandığı gün (ör. uygulamanın ilk açıldığı gün).
 * @param todayStr Bugün. Bugün henüz bitmediği için asla 'missed' olmaz.
 */
export function computeStreak(
  inputs: DayInput[],
  start: DateStr,
  todayStr: DateStr,
  rule: StreakRule = DEFAULT_RULE,
): StreakResult {
  const byDate = new Map(inputs.map((d) => [d.date, d]));
  const days: StreakResult['days'] = [];
  let current = 0;
  let longest = 0;
  let freezes = 0;
  let sinceFreeze = 0;
  let todayCompleted = false;

  for (let date = start; diffDays(todayStr, date) >= 0; date = addDays(date, 1)) {
    const input = byDate.get(date);
    const done = input ? isDayComplete(input, rule) : false;

    if (done) {
      current++;
      sinceFreeze++;
      if (sinceFreeze === DAYS_PER_FREEZE) {
        freezes = Math.min(MAX_FREEZES, freezes + 1);
        sinceFreeze = 0;
      }
      days.push({ date, status: 'completed' });
      if (date === todayStr) todayCompleted = true;
    } else if (date === todayStr) {
      // bugün hâlâ tamamlanabilir; seri bozulmaz
    } else if (freezes > 0) {
      // dondurma seriyi korur ama gün sayısını artırmaz
      freezes--;
      days.push({ date, status: 'frozen' });
    } else {
      current = 0;
      sinceFreeze = 0;
      days.push({ date, status: 'missed' });
    }
    longest = Math.max(longest, current);
  }

  return {
    days,
    current,
    longest,
    freezesAvailable: freezes,
    todayCompleted,
    milestones: MILESTONES.filter((m) => longest >= m),
  };
}

/** Veritabanından okunan ham veriden günlük girdiler (evaluateStreak için). */
export function buildDayInputs(from: DateStr, to: DateStr, d: {
  workoutWeekdays: ReadonlySet<number>;
  doneDates: ReadonlySet<string>;
  steps: ReadonlyMap<string, number>;
  stepGoal: number;
  habits: { id: number; weekdays: number; archived_at: string | null }[];
  /** `${habit_id}|${date}` */
  logs: ReadonlySet<string>;
}): DayInput[] {
  const out: DayInput[] = [];
  for (let date = from; diffDays(to, date) >= 0; date = addDays(date, 1)) {
    const wd = weekday(date);
    const visible = d.habits.filter((h) => (h.weekdays & (1 << wd)) !== 0 && (h.archived_at == null || date < h.archived_at.slice(0, 10)));
    const checked = visible.filter((h) => d.logs.has(`${h.id}|${date}`)).length;
    out.push({
      date,
      kind: d.workoutWeekdays.has(wd) ? 'workout' : 'rest',
      workoutDone: d.doneDates.has(date),
      stepGoalMet: (d.steps.get(date) ?? 0) >= d.stepGoal,
      checklistRatio: visible.length ? checked / visible.length : 0,
    });
  }
  return out;
}

/** Önceki ve yeni gün durumları arasındaki fark: sadece değişenler yazılır. */
export function diffStreakDays(prev: ReadonlyMap<string, StreakStatus>, next: { date: string; status: StreakStatus }[]) {
  const nextDates = new Set(next.map((d) => d.date));
  return { changed: next.filter((d) => prev.get(d.date) !== d.status), removed: [...prev.keys()].filter((d) => !nextDates.has(d)) };
}

/**
 * Akşam seri hatırlatmasının zamanı: bugün tamamlanmadıysa ve saat geçmediyse bugün, yoksa yarın aynı saatte.
 * Yarınki bildirim, uygulama açılıp gün tamamlanınca tekrar ertelenir.
 */
export function nextStreakReminder(now: Date, time: string, todayCompleted: boolean): Date {
  const [h, m] = time.split(':').map(Number);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  if (todayCompleted || at <= now) at.setDate(at.getDate() + 1);
  return at;
}
