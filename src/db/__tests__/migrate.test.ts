import { migrate, SCHEMA_VERSION } from '../migrate';
import { getExercisesByRegion } from '../repos/exercises';
import { getWeekPlan } from '../repos/schedule';
import { nodeDb } from '../testDb';

describe('migrate', () => {
  it('boş veritabanını kurar ve seed eder; ikinci çalıştırma bir şey yapmaz', async () => {
    const db = nodeDb();
    await migrate(db);
    await migrate(db);
    expect((await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(SCHEMA_VERSION);

    const count = async (t: string) => (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`))!.n;
    expect(await count('exercises')).toBeGreaterThan(250);
    expect(await count('workout_templates')).toBe(4);
    expect(await count('habits')).toBe(4);
    expect(await count("exercises WHERE source = 'seed'")).toBe(25);
    expect((await db.getAllAsync('PRAGMA foreign_key_check')).length).toBe(0);

    const week = await getWeekPlan(db);
    expect(week.map((d) => d.kind)).toEqual(['workout', 'workout', 'walk', 'walk', 'walk', 'workout', 'workout']);
    expect(week[0]).toMatchObject({ templateName: 'Üst Vücut A', exerciseCount: 6 });
    expect(week[5].exerciseCount).toBe(7);
  });

  it('bölge sorgusu tekrarsız döner, birincil olanlar önce', async () => {
    const db = nodeDb();
    await migrate(db);
    const chest = await getExercisesByRegion(db, 'chest');
    const ids = chest.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const firstSecondary = chest.findIndex((e) => e.role === 'secondary');
    expect(chest.slice(firstSecondary).every((e) => e.role === 'secondary')).toBe(true);
    expect(chest.find((e) => e.id === 'Incline_Dumbbell_Press')?.role).toBe('primary');
    expect((await getExercisesByRegion(db, 'shoulders')).find((e) => e.id === 'Incline_Dumbbell_Press')?.role).toBe('secondary');
  });
});
