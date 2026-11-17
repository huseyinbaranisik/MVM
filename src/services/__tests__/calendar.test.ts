import { groupActivity, monthCells } from '../calendar';

describe('takvim', () => {
  it('Kasım 2026: Pazar başlar, 30 gün, 7nin katı', () => {
    const c = monthCells('2026-11');
    expect(c.length % 7).toBe(0);
    expect(c.slice(0, 6)).toEqual(Array(6).fill(null)); // 1 Kasım 2026 Pazar
    expect(c[6]).toBe('2026-11-01');
    expect(c.filter(Boolean)).toHaveLength(30);
  });

  it('Şubat artık yıl', () => {
    expect(monthCells('2028-02').filter(Boolean)).toHaveLength(29);
  });

  it('günlük toplama', () => {
    const m = groupActivity({
      sessions: [{ date: '2026-11-17', name: 'Üst A' }, { date: '2026-11-17', name: null }],
      trackers: [{ type: 'water', date: '2026-11-17', value: 500 }, { type: 'steps', date: '2026-11-16', value: 8000 }],
      habitLogs: [{ date: '2026-11-17' }, { date: '2026-11-17' }],
      streak: [{ date: '2026-11-16', status: 'completed' }],
    });
    expect(m.get('2026-11-17')).toEqual({ workouts: ['Üst A', 'Antrenman'], water: 500, steps: 0, habits: 2 });
    expect(m.get('2026-11-16')).toMatchObject({ steps: 8000, streak: 'completed' });
  });
});
