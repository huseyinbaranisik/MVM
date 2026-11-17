// Supabase'e geçişte istemciye taşınan hesaplar (eskiden SQL'deydi).
import { muscles } from '@/data/muscleMap';
import { seedExercises } from '@/data/seedExercises';

import { builtInExercises, exercisesForMuscles, fromUserRow, musclesOfRegion, regionsOf, sortForLibrary } from '../catalog';
import { filterFoods, proteinTarget, suggestCalories, sumMacros } from '../nutrition';
import { buildDayInputs, computeStreak, diffStreakDays, nextStreakReminder } from '../streakService';
import { adjustRestState, bestsByExercise, exerciseStats, regionVolume } from '../workout';

describe('katalog', () => {
  const list = builtInExercises();

  it('hazır katalog tekrarsız; seed hareketler free-exercise-db kaydının yerine geçer; kaslar geçerli', () => {
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    expect(list.length).toBeGreaterThan(250);
    expect(list.filter((e) => e.source === 'seed')).toHaveLength(seedExercises.length);
    const ids = new Set(muscles.map((m) => m.id));
    expect(list.every((e) => [...e.primary, ...e.secondary].every((m) => ids.has(m)))).toBe(true);
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

describe('kalori hedefi', () => {
  it('Mifflin-St Jeor × 1,55, 50 kcal yuvarlı; eksik bilgide null', () => {
    // erkek 80 kg 180 cm 25 yaş: BMR 1805 → ×1,55 = 2797,75 → 2800
    expect(suggestCalories({ weightKg: 80, heightCm: 180, age: 25, sex: 'male' })).toBe(2800);
    // kadın 60 kg 165 cm 30 yaş: BMR 1320,25 → 2046,4 → 2050
    expect(suggestCalories({ weightKg: 60, heightCm: 165, age: 30, sex: 'female' })).toBe(2050);
    expect(suggestCalories({ weightKg: 80, heightCm: null, age: 25, sex: 'male' })).toBeNull();
    expect(proteinTarget(80)).toBe(144);
    expect(proteinTarget(null)).toBeNull();
  });
});

describe('seri hatırlatması', () => {
  const now = new Date(2026, 10, 15, 18, 30);
  it('gün tamamlanmadıysa bugün, tamamlandıysa veya saat geçtiyse yarın', () => {
    expect(nextStreakReminder(now, '20:00', false)).toEqual(new Date(2026, 10, 15, 20, 0));
    expect(nextStreakReminder(now, '20:00', true)).toEqual(new Date(2026, 10, 16, 20, 0));
    expect(nextStreakReminder(now, '18:00', false)).toEqual(new Date(2026, 10, 16, 18, 0));
  });
  it('ay sonunda bir sonraki aya geçer', () => {
    expect(nextStreakReminder(new Date(2026, 10, 30, 21, 0), '20:00', false)).toEqual(new Date(2026, 11, 1, 20, 0));
  });
});

describe('dinlenme ±15', () => {
  const now = 1_000_000;
  it('azaltınca toplam sabit, yüzde düşer; art arda azaltma 1 sn altına inmez', () => {
    let s = { endsAt: now + 90_000, total: 90 };
    s = adjustRestState(s, -15, now);
    expect(s).toEqual({ endsAt: now + 75_000, total: 90 });
    for (let i = 0; i < 10; i++) s = adjustRestState(s, -15, now);
    expect(s).toEqual({ endsAt: now + 1000, total: 90 });
  });
  it('eklemede kalan toplamı aşarsa toplam büyür', () => {
    expect(adjustRestState({ endsAt: now + 90_000, total: 90 }, 15, now)).toEqual({ endsAt: now + 105_000, total: 105 });
    expect(adjustRestState({ endsAt: now + 30_000, total: 90 }, 15, now)).toEqual({ endsAt: now + 45_000, total: 90 });
  });
});

describe('antrenman özeti', () => {
  const sets = [
    { exercise_id: 'a', weight_kg: 50, reps: 10 },
    { exercise_id: 'a', weight_kg: 55, reps: 8 },
    { exercise_id: 'b', weight_kg: null, reps: 15 },
  ];
  it('hareket istatistikleri', () => {
    const st = exerciseStats(sets);
    expect(st.get('a')).toMatchObject({ sets: 2, reps: 18, volume: 940, best: { kg: 55, reps: 8 } });
    expect(st.get('b')).toMatchObject({ volume: 0, best: { kg: 0, reps: 15 } });
  });
  it('bölge hacmi', () => {
    expect(regionVolume(sets, (id) => (id === 'a' ? ['chest', 'chest', 'triceps'] : ['abs']))).toEqual([['chest', 940], ['triceps', 940]]);
  });
});
