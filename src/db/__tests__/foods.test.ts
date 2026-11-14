import { filterFoods, sumMacros } from '@/services/nutrition';

import { migrate } from '../migrate';
import { addFood, deleteFoodLog, getCalorieHistory, getFoodLogs, getFoods, logFood } from '../repos/foods';
import { getTrackerSettings } from '../repos/trackers';
import { nodeDb } from '../testDb';

describe('kalori', () => {
  it('seed yiyecekler ve kalori hedefi kurulur', async () => {
    const db = nodeDb();
    await migrate(db);
    expect((await getFoods(db)).length).toBeGreaterThan(40);
    expect(await getTrackerSettings(db, 'calories')).toMatchObject({ goal: 2000, display_unit: 'kcal' });
  });

  it('öğün gram üzerinden hesaplanır, günlük toplam ve silme çalışır', async () => {
    const db = nodeDb();
    await migrate(db);
    const id = await addFood(db, { name: 'Ev keki', kcal: 400, protein: 6, fat: 20, carbs: 50 });
    expect((await getFoods(db))[0]).toMatchObject({ id, source: 'user' });

    await logFood(db, '2026-11-14', id, 50);
    await logFood(db, '2026-11-14', id, 150);
    await logFood(db, '2026-11-15', id, 100);
    const logs = await getFoodLogs(db, '2026-11-14');
    expect(logs[0]).toMatchObject({ name: 'Ev keki', grams: 50, kcal: 200, fat: 10 });
    expect(sumMacros(logs)).toEqual({ kcal: 800, protein: 12, fat: 40, carbs: 100 });
    expect(await getCalorieHistory(db, '2026-11-14', '2026-11-15')).toEqual([
      { date: '2026-11-14', value: 800 }, { date: '2026-11-15', value: 400 },
    ]);

    await deleteFoodLog(db, logs[0].id);
    expect(sumMacros(await getFoodLogs(db, '2026-11-14')).kcal).toBe(600);
  });

  it('arama Türkçe büyük/küçük harfi ayırt etmez', () => {
    const foods = [{ name: 'Çilek' }, { name: 'Işık kurabiyesi' }, { name: 'Elma' }];
    expect(filterFoods(foods, 'çİL').map((f) => f.name)).toEqual(['Çilek']);
    expect(filterFoods(foods, 'ışı').map((f) => f.name)).toEqual(['Işık kurabiyesi']);
    expect(filterFoods(foods, '  ')).toHaveLength(3);
  });
});
