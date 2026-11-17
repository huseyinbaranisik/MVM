import { levelFromXp, levelReward, rankOf, streakXp, totalXp, xpForLevel } from '../xp';

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
    expect(rankOf(30)).toBe('Platin');
    expect(rankOf(99)).toBe('Efsane');
  });

  it('seri XP: artan, tavanlı; dondurma korur, kaçırma sıfırlar', () => {
    expect(streakXp(['completed', 'completed', 'completed'])).toBe(5 + 10 + 15);
    expect(streakXp(Array(12).fill('completed'))).toBe(5 * 55 + 50 * 2);
    expect(streakXp(['completed', 'frozen', 'completed'])).toBe(5 + 10);
    expect(streakXp(['completed', 'missed', 'completed'])).toBe(5 + 5);
  });

  it('seviye ödülleri ve eşik XP', () => {
    expect(levelReward(1)).toBeNull();
    expect(levelReward(2)).toEqual({ kind: 'freeze' });
    expect(levelReward(5)).toMatchObject({ kind: 'rank', name: 'Demir' });
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(3)).toBe(250);
    expect(levelFromXp(xpForLevel(12)).level).toBe(12);
  });

  it('antrenman bonusu', () => {
    expect(totalXp({ workouts: 2, sets: 0, habitLogs: 0, waterDays: 0, stepDays: 0, streak: [] })).toBe(100);
  });

  it('toplam', () => {
    expect(totalXp({ sets: 3, habitLogs: 2, waterDays: 1, stepDays: 1, streak: ['completed'] })).toBe(30 + 10 + 10 + 10 + 5);
  });
});
