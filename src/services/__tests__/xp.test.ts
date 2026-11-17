import { levelFromXp, rankOf, streakXp, totalXp } from '../xp';

describe('XP', () => {
  it('seviye eşikleri', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0, needed: 100, rank: 'Çaylak' });
    expect(levelFromXp(99)).toMatchObject({ level: 1, intoLevel: 99 });
    expect(levelFromXp(100)).toMatchObject({ level: 2, intoLevel: 0, needed: 150 });
    expect(levelFromXp(250)).toMatchObject({ level: 3, intoLevel: 0, needed: 200 });
    expect(levelFromXp(-5).level).toBe(1);
  });

  it('rank aralıkları', () => {
    expect(rankOf(4)).toBe('Çaylak');
    expect(rankOf(5)).toBe('Demir');
    expect(rankOf(29)).toBe('Altın');
    expect(rankOf(99)).toBe('Efsane');
  });

  it('seri XP: artan, tavanlı; dondurma korur, kaçırma sıfırlar', () => {
    expect(streakXp(['completed', 'completed', 'completed'])).toBe(5 + 10 + 15);
    expect(streakXp(Array(12).fill('completed'))).toBe(5 * 55 + 50 * 2);
    expect(streakXp(['completed', 'frozen', 'completed'])).toBe(5 + 10);
    expect(streakXp(['completed', 'missed', 'completed'])).toBe(5 + 5);
  });

  it('toplam', () => {
    expect(totalXp({ sets: 3, habitLogs: 2, waterDays: 1, stepDays: 1, streak: ['completed'] })).toBe(30 + 10 + 10 + 10 + 5);
  });
});
