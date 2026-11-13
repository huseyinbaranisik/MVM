import { e1rm, findPRs, mmss, overloadSuggestion, volume } from '../workout';

const s = (kg: number | null, reps: number | null, exercise_id = 'bench') => ({ exercise_id, weight_kg: kg, reps });

describe('antrenman hesapları', () => {
  it('hacim ve 1RM', () => {
    expect(volume([s(20, 8), s(20, 6), s(null, 10)])).toBe(280);
    expect(e1rm(30, 0)).toBe(0);
    expect(e1rm(30, 10)).toBeCloseTo(40);
  });

  it('tüm setler üst sınıra ulaştıysa ağırlık artırma önerisi', () => {
    expect(overloadSuggestion([s(20, 8), s(20, 8), s(20, 8), s(20, 9)], 4, 8)).toBe(22);
    expect(overloadSuggestion([s(20, 8), s(20, 7), s(20, 8), s(20, 8)], 4, 8)).toBeNull(); // bir set eksik tekrar
    expect(overloadSuggestion([s(20, 8), s(20, 8)], 4, 8)).toBeNull(); // planlanandan az set
    expect(overloadSuggestion([s(20, 8)], 1, null)).toBeNull(); // süreli hareket
  });

  it('rekorlar: önceki kayıt varsa ve aşılırsa', () => {
    const prev = new Map([['bench', { maxKg: 20, maxE1rm: e1rm(20, 8) }]]);
    expect(findPRs([s(22, 6)], prev).map((p) => p.kind)).toEqual(['weight', 'e1rm']);
    expect(findPRs([s(20, 10)], prev).map((p) => p.kind)).toEqual(['e1rm']);
    expect(findPRs([s(20, 8)], prev)).toEqual([]);
    expect(findPRs([s(50, 5, 'ilk')], prev)).toEqual([]); // ilk kez yapılan hareket
  });

  it('süre biçimi', () => {
    expect(mmss(65)).toBe('1:05');
    expect(mmss(-3)).toBe('0:00');
  });
});
