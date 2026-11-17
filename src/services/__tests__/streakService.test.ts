import { addDays, diffDays, toDateStr, weekday } from '../dates';
import { buildDayInputs, computeStreak, isDayComplete, type DayInput } from '../streakService';

const workout = (date: string, done = true): DayInput => ({
  date, kind: 'workout', workoutDone: done, stepGoalMet: false, checklistRatio: 0,
});
const rest = (date: string, steps = false, ratio = 0): DayInput => ({
  date, kind: 'rest', workoutDone: false, stepGoalMet: steps, checklistRatio: ratio,
});
/** start'tan itibaren n gün boyunca tamamlanmış antrenman günü */
const doneRun = (start: string, n: number) => Array.from({ length: n }, (_, i) => workout(addDays(start, i)));

describe('dates', () => {
  it('gün geçişi: ay ve yıl sonu', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('DST geçişinde gün kaymaz (Avrupa 29 Mart, ABD 8 Mart 2026)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
  });

  it('haftanın günü: 0 = Pazartesi', () => {
    expect(weekday('2026-11-02')).toBe(0);
    expect(weekday('2026-11-08')).toBe(6);
  });

  it('saat dilimi: UTC değil yerel takvim günü kullanılır', () => {
    // Yerel 01:30 → İstanbul'da (UTC+3) UTC'ye göre hâlâ önceki gün; toISOString() burada yanlış gün verirdi.
    expect(toDateStr(new Date(2026, 10, 3, 1, 30))).toBe('2026-11-03');
    expect(toDateStr(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02');
  });
});

describe('isDayComplete', () => {
  it('antrenman günü sadece antrenman bitince tamamlanır', () => {
    expect(isDayComplete(workout('2026-11-02', false))).toBe(false);
    expect(isDayComplete({ ...workout('2026-11-02', false), stepGoalMet: true, checklistRatio: 1 })).toBe(false);
    expect(isDayComplete(workout('2026-11-02'))).toBe(true);
  });

  it('dinlenme günü: adım hedefi veya checklist ≥ %50', () => {
    expect(isDayComplete(rest('2026-11-04', true))).toBe(true);
    expect(isDayComplete(rest('2026-11-04', false, 0.5))).toBe(true);
    expect(isDayComplete(rest('2026-11-04', false, 0.49))).toBe(false);
  });

  it('kural ayardan değişebilir', () => {
    const r = rest('2026-11-04', true, 0);
    expect(isDayComplete(r, { restDayMode: 'checklist', checklistThreshold: 0.5 })).toBe(false);
    expect(isDayComplete(rest('2026-11-04', false, 0.8), { restDayMode: 'checklist', checklistThreshold: 1 })).toBe(false);
  });
});

describe('computeStreak', () => {
  it('ardışık günleri sayar, bugün tamamlanmadıysa seri bozulmaz', () => {
    const r = computeStreak(doneRun('2026-11-01', 3), '2026-11-01', '2026-11-04');
    expect(r.current).toBe(3);
    expect(r.todayCompleted).toBe(false);
    expect(r.days.find((d) => d.date === '2026-11-04')).toBeUndefined();
  });

  it('dondurma hakkı yokken kaçırılan gün seriyi sıfırlar', () => {
    const inputs = [...doneRun('2026-11-01', 3), ...doneRun('2026-11-05', 2)];
    const r = computeStreak(inputs, '2026-11-01', '2026-11-06');
    expect(r.days.find((d) => d.date === '2026-11-04')?.status).toBe('missed');
    expect(r.current).toBe(2);
    expect(r.longest).toBe(3);
  });

  it('7 günde 1 hak kazanılır ve kaçırılan günde otomatik kullanılır', () => {
    const inputs = [...doneRun('2026-11-01', 7), ...doneRun('2026-11-09', 2)];
    const r = computeStreak(inputs, '2026-11-01', '2026-11-10');
    expect(r.days.find((d) => d.date === '2026-11-08')?.status).toBe('frozen');
    expect(r.current).toBe(9); // dondurulan gün sayılmaz ama seri sürer
    expect(r.freezesAvailable).toBe(0);
  });

  it('en fazla 3 hak birikir', () => {
    const r = computeStreak(doneRun('2026-11-01', 35), '2026-11-01', '2026-12-05');
    expect(r.freezesAvailable).toBe(3);
  });

  it('seviye ödülü hakkı o günden itibaren kaçırılan günü korur', () => {
    const inputs = [...doneRun('2026-11-01', 2), ...doneRun('2026-11-04', 1)];
    const grants = new Map([['2026-11-02', 1]]);
    const r = computeStreak(inputs, '2026-11-01', '2026-11-04', undefined, grants);
    expect(r.days.find((d) => d.date === '2026-11-03')?.status).toBe('frozen');
    expect(r.current).toBe(3);
    // ödül kaçırılan günden sonra gelirse korumaz
    const late = computeStreak(inputs, '2026-11-01', '2026-11-04', undefined, new Map([['2026-11-04', 1]]));
    expect(late.current).toBe(1);
  });

  it('hakkından fazla kaçırılan gün seriyi kırar', () => {
    const inputs = [...doneRun('2026-11-01', 14), ...doneRun('2026-11-18', 1)];
    const r = computeStreak(inputs, '2026-11-01', '2026-11-18');
    const status = (d: string) => r.days.find((x) => x.date === d)?.status;
    expect(status('2026-11-15')).toBe('frozen');
    expect(status('2026-11-16')).toBe('frozen');
    expect(status('2026-11-17')).toBe('missed');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(14);
  });

  it('hak bitince sonraki kaçırılan gün missed olur', () => {
    const inputs = [...doneRun('2026-11-01', 7), ...doneRun('2026-11-10', 1)];
    const r = computeStreak(inputs, '2026-11-01', '2026-11-10');
    const status = (d: string) => r.days.find((x) => x.date === d)?.status;
    expect(status('2026-11-08')).toBe('frozen');
    expect(status('2026-11-09')).toBe('missed');
    expect(r.current).toBe(1);
  });

  it('dinlenme ve antrenman günleri karışık; ay sonu geçişi', () => {
    const inputs = [workout('2026-10-30'), rest('2026-10-31', true), rest('2026-11-01', false, 0.6), workout('2026-11-02')];
    const r = computeStreak(inputs, '2026-10-30', '2026-11-02');
    expect(r.current).toBe(4);
    expect(r.todayCompleted).toBe(true);
  });

  it('kilometre taşları en uzun seriden gelir', () => {
    const r = computeStreak(doneRun('2026-01-01', 15), '2026-01-01', '2026-01-20');
    expect(r.milestones).toEqual([3, 7, 14]);
  });
});

describe('buildDayInputs', () => {
  it('günlük görev yalnızca kendi tarihinde, haftalık görev seçili günlerde sayılır', () => {
    const habits = [
      { id: 1, weekdays: 0b1111111, archived_at: null }, // haftalık, her gün
      { id: 2, weekdays: 0, only_date: '2026-11-18', archived_at: null }, // günlük
    ];
    const r = buildDayInputs('2026-11-17', '2026-11-18', {
      workoutWeekdays: new Set(), doneDates: new Set(), steps: new Map(), stepGoal: Infinity, habits,
      logs: new Set(['1|2026-11-17', '2|2026-11-18']),
    });
    expect(r.map((d) => d.checklistRatio)).toEqual([1, 0.5]);
  });
});
