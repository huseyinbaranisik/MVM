// Supabase'e geçişte istemciye taşınan hesaplar (eskiden SQL'deydi).
import { muscles } from '@/data/muscleMap';
import { seedExercises } from '@/data/seedExercises';
import { seedTemplates } from '@/data/seedProgram';

import { builtInExercises, exercisesForMuscles, fromUserRow, musclesOfRegion, regionsOf, sortForLibrary } from '../catalog';
import { filterFoods, sumMacros } from '../nutrition';
import { buildDayInputs, computeStreak, diffStreakDays } from '../streakService';
import { bestsByExercise } from '../workout';

describe('katalog', () => {
  const list = builtInExercises();

  it('hazır katalog tekrarsız; seed hareketler free-exercise-db kaydının yerine geçer; kaslar geçerli', () => {
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    expect(list.length).toBeGreaterThan(250);
    expect(list.filter((e) => e.source === 'seed')).toHaveLength(seedExercises.length);
    const ids = new Set(muscles.map((m) => m.id));
    expect(list.every((e) => [...e.primary, ...e.secondary].every((m) => ids.has(m)))).toBe(true);
  });

  it('seed programındaki tüm hareketler katalogda var', () => {
    const ids = new Set(list.map((e) => e.id));
    expect(seedTemplates.flatMap((t) => t.exercises).filter((x) => !ids.has(x.exerciseId))).toEqual([]);
  });

  it('bölge sorgusu tekrarsız, birincil olanlar önce', () => {
    const chest = exercisesForMuscles(list, musclesOfRegion('chest'), new Set());
    expect(new Set(chest.map((c) => c.e.id)).size).toBe(chest.length);
    const firstSecondary = chest.findIndex((c) => c.role === 'secondary');
    expect(chest.slice(firstSecondary === -1 ? chest.length : firstSecondary).every((c) => c.role === 'secondary')).toBe(true);
    expect(chest.find((c) => c.e.id === 'Dumbbell_Bench_Press')?.role).toBe('primary');
  });

  it('kullanıcı hareketi ve favori sıralaması', () => {
    const mine = fromUserRow({ id: 'user_1', name_tr: 'Zzz özel', equipment: 'other', mode: 'reps', description: null, photo_uri: null,
      primary_muscles: ['quad_outer'], secondary_muscles: [] });
    const sorted = sortForLibrary([...list, mine], new Set(['user_1']));
    expect(sorted[0].id).toBe('user_1');
    expect(regionsOf(mine)).toEqual(['quads']);
  });
});

describe('antrenman', () => {
  it('hareket bazında en ağır ve en yüksek e1RM; ağırlıksız setler sayılmaz', () => {
    const b = bestsByExercise([
      { exercise_id: 'a', weight_kg: 20, reps: 10 },
      { exercise_id: 'a', weight_kg: 25, reps: 3 },
      { exercise_id: 'b', weight_kg: null, reps: 12 },
    ]);
    expect(b.get('a')).toEqual({ maxKg: 25, maxE1rm: 25 * (1 + 3 / 30) }); // 27,5 > 20×10'un 26,7'si
    expect(b.has('b')).toBe(false);
  });
});

describe('kalori', () => {
  it('arama Türkçe büyük/küçük harfi ayırt etmez; makrolar toplanır', () => {
    const foods = [{ name: 'Çilek' }, { name: 'Işık kurabiyesi' }, { name: 'Elma' }];
    expect(filterFoods(foods, 'çİL').map((f) => f.name)).toEqual(['Çilek']);
    expect(filterFoods(foods, 'ışı').map((f) => f.name)).toEqual(['Işık kurabiyesi']);
    expect(filterFoods(foods, '  ')).toHaveLength(3);
    expect(sumMacros([{ kcal: 200, protein: 3, fat: 10, carbs: 25 }, { kcal: 600, protein: 9, fat: 30, carbs: 75 }]))
      .toEqual({ kcal: 800, protein: 12, fat: 40, carbs: 100 });
  });
});

describe('seri girdileri', () => {
  // Seed programı: Pzt, Sal, Cmt, Paz antrenman. 2026-11-02 Pazartesi.
  const base = {
    workoutWeekdays: new Set([0, 1, 5, 6]), stepGoal: 10000, steps: new Map<string, number>(),
    habits: [{ id: 1, weekdays: 127, archived_at: null }, { id: 2, weekdays: 127, archived_at: '2026-11-03T10:00:00Z' }],
    logs: new Set<string>(), doneDates: new Set<string>(),
  };

  it('antrenman günü oturumla, dinlenme günü adımla tamamlanır; kaçırılan gün seriyi sıfırlar', () => {
    const inputs = buildDayInputs('2026-11-02', '2026-11-04', { ...base, doneDates: new Set(['2026-11-02']), steps: new Map([['2026-11-04', 10000]]) });
    expect(inputs.map((d) => d.kind)).toEqual(['workout', 'workout', 'rest']);
    const r = computeStreak(inputs, '2026-11-02', '2026-11-04');
    expect(r.days.map((d) => d.status)).toEqual(['completed', 'missed', 'completed']);
    expect(r.current).toBe(1);
  });

  it('arşivlenen alışkanlık arşiv gününden sonra sayılmaz', () => {
    const inputs = buildDayInputs('2026-11-02', '2026-11-04', { ...base, logs: new Set(['1|2026-11-02', '1|2026-11-04']) });
    expect(inputs.map((d) => d.checklistRatio)).toEqual([0.5, 0, 1]);
  });

  it('sadece değişen günler yazılır, artık olmayanlar silinir', () => {
    const prev = new Map([['2026-11-02', 'completed' as const], ['2026-11-03', 'missed' as const], ['2026-11-04', 'completed' as const]]);
    expect(diffStreakDays(prev, [{ date: '2026-11-02', status: 'completed' }, { date: '2026-11-03', status: 'frozen' }]))
      .toEqual({ changed: [{ date: '2026-11-03', status: 'frozen' }], removed: ['2026-11-04'] });
  });
});
