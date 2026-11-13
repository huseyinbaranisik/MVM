import { migrate } from '../migrate';
import {
  deleteSet, endSession, getDayWorkoutProgress, getPreviousBests, getPreviousSets, getSessionSets, saveSet, startSession,
} from '../repos/sessions';
import { nodeDb } from '../testDb';

const set = (kg: number, reps: number) => ({ weight_kg: kg, reps, duration_sec: null });

describe('oturumlar', () => {
  it('açık oturum tekrar kullanılır; set güncellenir/silinir; ilerleme sayılır', async () => {
    const db = nodeDb();
    await migrate(db);
    const id = await startSession(db, 1, '2026-11-02');
    expect(await startSession(db, 1, '2026-11-02')).toBe(id);

    await saveSet(db, id, 'Dumbbell_Bench_Press', 0, set(20, 8));
    await saveSet(db, id, 'Dumbbell_Bench_Press', 0, set(22, 8)); // aynı set → üzerine yazar
    await saveSet(db, id, 'Dumbbell_Bench_Press', 1, set(22, 7));
    expect((await getSessionSets(db, id)).map((s) => s.weight_kg)).toEqual([22, 22]);
    await deleteSet(db, id, 'Dumbbell_Bench_Press', 1);
    expect(await getDayWorkoutProgress(db, '2026-11-02', 1)).toMatchObject({ doneSets: 1, totalSets: 20, finished: false });

    await endSession(db, id, 'done');
    expect((await getDayWorkoutProgress(db, '2026-11-02', 1)).finished).toBe(true);

    // sonraki hafta: önceki değerler ve önceki en iyiler
    const next = await startSession(db, 1, '2026-11-09');
    await saveSet(db, next, 'Dumbbell_Bench_Press', 0, set(24, 6));
    expect((await getPreviousSets(db, 'Dumbbell_Bench_Press', next)).map((s) => [s.weight_kg, s.reps])).toEqual([[22, 8]]);
    expect((await getPreviousBests(db, next)).get('Dumbbell_Bench_Press')?.maxKg).toBe(22);
  });
});
