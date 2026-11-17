import fedb from '../exercises.fedb.json';
import { exerciseImages } from '../exerciseImages';
import { mapFedbMuscles } from '../fedbMuscles';
import { muscleIds, muscles, regions } from '../muscleMap';
import { seedExercises } from '../seedExercises';

describe('seed verisi tutarlı', () => {
  it('her kas geçerli bir bölgeye bağlı, id\'ler tekil', () => {
    const regionIds = new Set(regions.map((r) => r.id));
    expect(muscles.every((m) => regionIds.has(m.regionId))).toBe(true);
    expect(muscleIds.size).toBe(muscles.length);
  });

  it('seed hareketlerin tüm kasları kas haritasında var ve birincil boş değil', () => {
    for (const s of seedExercises) {
      expect(s.primary.length).toBeGreaterThan(0);
      for (const m of [...s.primary, ...s.secondary]) expect(muscleIds).toContain(m);
      expect(s.primary.some((m) => s.secondary.includes(m))).toBe(false);
    }
  });

  it('her hareketin görseli gömülü', () => {
    for (const s of seedExercises) expect(exerciseImages[s.imageId]?.length).toBeGreaterThan(0);
    for (const e of fedb) expect(exerciseImages[e.id]?.length).toBeGreaterThan(0);
  });

  it('kütüphanedeki her hareket en az bir kasa eşleniyor, seed ile çakışmıyor', () => {
    const seedIds = new Set(seedExercises.map((s) => s.id));
    for (const e of fedb) {
      const mapped = mapFedbMuscles(e.nameEn, e.primary, e.secondary);
      expect(mapped.length).toBeGreaterThan(0);
      for (const { muscleId } of mapped) expect(muscleIds).toContain(muscleId);
      expect(seedIds.has(e.id)).toBe(false);
    }
  });
});

describe('mapFedbMuscles', () => {
  it('incline → üst göğüs, birincil ikincili ezer', () => {
    expect(mapFedbMuscles('Incline Dumbbell Press', ['chest'], ['shoulders', 'chest'])).toEqual([
      { muscleId: 'chest_upper', role: 'primary' },
      { muscleId: 'delt_front', role: 'secondary' },
    ]);
  });
});
