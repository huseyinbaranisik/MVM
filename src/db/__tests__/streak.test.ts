import { migrate } from '../migrate';
import { deleteMeasurement, getMeasurements, saveMeasurement } from '../repos/measurements';
import { setSetting } from '../repos/settings';
import { evaluateStreak, getBadges, getStreakDays, getStreakState } from '../repos/streak';
import { addTrackerValue } from '../repos/trackers';
import { nodeDb } from '../testDb';

// Seed programı: Pzt, Sal, Cmt, Paz antrenman; Çar–Cum yürüyüş. 2026-11-02 Pazartesi.
async function setup() {
  const db = nodeDb();
  await migrate(db);
  await setSetting(db, 'startDate', '2026-11-02');
  const workout = (date: string) => db.runAsync(
    "INSERT INTO workout_sessions (date, started_at, status) VALUES (?, '2026-11-02T10:00:00Z', 'done')", date);
  return { db, workout };
}

describe('streak repo', () => {
  it('antrenman günü oturumla, dinlenme günü adım hedefiyle tamamlanır; kaçırılan gün seriyi sıfırlar', async () => {
    const { db, workout } = await setup();
    await workout('2026-11-02');
    await addTrackerValue(db, 'steps', '2026-11-04', 10000);
    const r = await evaluateStreak(db, '2026-11-04');
    expect(r).toMatchObject({ current: 1, longest: 1, fresh: [] });
    expect((await getStreakDays(db, '2026-11-01', '2026-11-30')).map((d) => d.status)).toEqual(['completed', 'missed', 'completed']);
    expect(await getStreakState(db)).toMatchObject({ current: 1, longest: 1 });
  });

  it('3 gün serisi rozet verir, tekrar hesaplamada yeni rozet çıkmaz', async () => {
    const { db, workout } = await setup();
    await workout('2026-11-02');
    await workout('2026-11-03');
    await addTrackerValue(db, 'steps', '2026-11-04', 12000);
    expect((await evaluateStreak(db, '2026-11-04')).fresh).toEqual([3]);
    expect((await evaluateStreak(db, '2026-11-04')).fresh).toEqual([]);
    expect((await getBadges(db)).map((b) => b.milestone)).toEqual([3]);
  });

  it('bugün henüz yapılmadıysa seri bozulmaz', async () => {
    const { db, workout } = await setup();
    await workout('2026-11-02');
    expect((await evaluateStreak(db, '2026-11-03')).current).toBe(1);
  });
});

describe('ölçümler', () => {
  it('aynı gün üzerine yazar, tarihe göre sıralı döner, silinir', async () => {
    const db = nodeDb();
    await migrate(db);
    await saveMeasurement(db, 'weight', 82, '2026-11-05');
    await saveMeasurement(db, 'weight', 80, '2026-11-01');
    await saveMeasurement(db, 'weight', 81.5, '2026-11-05');
    const list = await getMeasurements(db, 'weight');
    expect(list.map((m) => m.value)).toEqual([80, 81.5]);
    await deleteMeasurement(db, list[0].id);
    expect(await getMeasurements(db, 'weight')).toHaveLength(1);
  });
});

describe('streak yazımı', () => {
  it('değişmeyen gün tekrar yazılmaz, bugün tamamlanmaktan çıkınca kaydı silinir', async () => {
    const { db, workout } = await setup();
    await workout('2026-11-02');
    await addTrackerValue(db, 'steps', '2026-11-04', 10000);
    await evaluateStreak(db, '2026-11-04');
    const before = await db.getAllAsync('SELECT rowid, date, status FROM streak_days');
    await evaluateStreak(db, '2026-11-04');
    expect(await db.getAllAsync('SELECT rowid, date, status FROM streak_days')).toEqual(before);

    await addTrackerValue(db, 'steps', '2026-11-04', -10000);
    expect((await evaluateStreak(db, '2026-11-04')).current).toBe(0);
    expect((await getStreakDays(db, '2026-11-04', '2026-11-04'))).toEqual([]);
  });
});
