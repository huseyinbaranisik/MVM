import { migrate } from '../migrate';
import { archiveHabit, getHabitsForDate, saveHabit, setHabitDone } from '../repos/habits';
import { getSetting, setSetting } from '../repos/settings';
import { getSleep, saveSleep } from '../repos/sleep';
import { addTrackerValue, getTrackerSettings, getTrackerValue, updateTrackerSettings } from '../repos/trackers';
import { nodeDb } from '../testDb';

async function freshDb() {
  const db = nodeDb();
  await migrate(db);
  return db;
}

describe('repolar', () => {
  it('tracker değeri eklenir, 0 altına inmez', async () => {
    const db = await freshDb();
    await addTrackerValue(db, 'water', '2026-11-02', 250);
    await addTrackerValue(db, 'water', '2026-11-02', 250);
    expect(await getTrackerValue(db, 'water', '2026-11-02')).toBe(500);
    await addTrackerValue(db, 'water', '2026-11-02', -1000);
    expect(await getTrackerValue(db, 'water', '2026-11-02')).toBe(0);
    await addTrackerValue(db, 'steps', '2026-11-03', -500);
    expect(await getTrackerValue(db, 'steps', '2026-11-03')).toBe(0);
  });

  it('tracker ayarları kısmi güncellenir', async () => {
    const db = await freshDb();
    await updateTrackerSettings(db, 'water', { display_unit: 'liter' });
    expect(await getTrackerSettings(db, 'water')).toMatchObject({ goal: 2500, display_unit: 'liter', unit_size: 250 });
    await updateTrackerSettings(db, 'steps', { unit_size: null });
    expect((await getTrackerSettings(db, 'steps'))?.unit_size).toBeNull();
  });

  it('uyku: uyanılan güne kaydedilir, süre gece yarısını geçer, tekrar kayıt üzerine yazar', async () => {
    const db = await freshDb();
    await saveSleep(db, '2026-11-02', '23:40', '07:00', 4);
    await saveSleep(db, '2026-11-02', '00:10', '07:00', 3);
    expect(await getSleep(db, '2026-11-02')).toMatchObject({ duration_min: 410, quality: 3 });
  });

  it('alışkanlıklar haftanın gününe göre görünür, tik atılır, arşivlenir', async () => {
    const db = await freshDb();
    expect(await getHabitsForDate(db, '2026-11-02')).toHaveLength(4); // seed: her gün
    await saveHabit(db, { name: 'Sadece salı', icon: 'check', weekdays: 1 << 1 });
    expect(await getHabitsForDate(db, '2026-11-02')).toHaveLength(4); // pazartesi
    const tuesday = await getHabitsForDate(db, '2026-11-03');
    expect(tuesday).toHaveLength(5);

    const id = tuesday[0].id;
    await setHabitDone(db, id, '2026-11-03', true);
    await setHabitDone(db, id, '2026-11-03', true);
    expect((await getHabitsForDate(db, '2026-11-03')).filter((h) => h.done)).toHaveLength(1);
    await setHabitDone(db, id, '2026-11-03', false);
    expect((await getHabitsForDate(db, '2026-11-03')).filter((h) => h.done)).toHaveLength(0);

    await archiveHabit(db, id);
    expect(await getHabitsForDate(db, '2026-11-03')).toHaveLength(4);
  });

  it('ayarlar JSON olarak okunur/yazılır, eksikse varsayılan', async () => {
    const db = await freshDb();
    expect((await getSetting(db, 'profile')).name).toBe('Baran');
    expect(await getSetting(db, 'lastSleepPrompt')).toBeNull();
    await setSetting(db, 'lastSleepPrompt', '2026-11-02');
    expect(await getSetting(db, 'lastSleepPrompt')).toBe('2026-11-02');
  });
});
