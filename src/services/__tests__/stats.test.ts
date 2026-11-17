import { bucket, summarize, weeklyTotals } from '../stats';

describe('istatistik', () => {
  it('özet', () => {
    expect(summarize([])).toBeNull();
    expect(summarize([{ date: '2026-11-03', value: 80 }, { date: '2026-11-01', value: 82 }, { date: '2026-11-02', value: 81 }]))
      .toEqual({ last: 80, avg: 81, change: -2 });
  });

  it('kısa aralık aynen, uzun aralık haftalık ortalama', () => {
    const pts = [{ date: '2026-11-16', value: 10 }, { date: '2026-11-17', value: 20 }, { date: '2026-11-23', value: 30 }];
    expect(bucket(pts, '2026-11-01', '2026-11-30')).toHaveLength(3);
    expect(bucket(pts, '2026-01-01', '2026-11-30')).toEqual([{ date: '2026-11-16', value: 15 }, { date: '2026-11-23', value: 30 }]);
  });

  it('haftalık toplam boş haftaları sıfırla doldurur', () => {
    const w = weeklyTotals([{ date: '2026-11-17', value: 2 }, { date: '2026-11-18', value: 1 }], '2026-11-02', '2026-11-22');
    expect(w).toEqual([{ date: '2026-11-02', value: 0 }, { date: '2026-11-09', value: 0 }, { date: '2026-11-16', value: 3 }]);
  });
});
