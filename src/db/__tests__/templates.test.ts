import { focusCrop } from '@/data/bodyFocus';
import { body } from '@/data/bodyPaths';
import { muscles } from '@/data/muscleMap';

import { migrate } from '../migrate';
import { createUserExercise, getExercise, getExerciseList, getExercisesByRegion, setFavorite } from '../repos/exercises';
import { getDayPlan } from '../repos/schedule';
import {
  addExerciseToDay, deleteTemplate, getTemplateExercises, reorderTemplateExercises, updateTemplateExercise,
} from '../repos/templates';
import { nodeDb } from '../testDb';

async function freshDb() {
  const db = nodeDb();
  await migrate(db);
  return db;
}

describe('şablonlar ve program', () => {
  it('programıma ekle: şablonu olan güne ekler, olmayan güne yeni şablon açar', async () => {
    const db = await freshDb();
    await addExerciseToDay(db, 0, 'Pazartesi', 'Side_Lateral_Raise');
    const mon = await getDayPlan(db, 0);
    expect(mon?.exerciseCount).toBe(7);

    const tplId = await addExerciseToDay(db, 2, 'Çarşamba', 'Plank');
    const wed = await getDayPlan(db, 2);
    expect(wed).toMatchObject({ kind: 'workout', templateId: tplId, templateName: 'Çarşamba antrenmanı', exerciseCount: 1 });
    expect((await getTemplateExercises(db, tplId))[0]).toMatchObject({ duration_sec: 30, rep_min: null }); // süreli hareket
  });

  it('sıralama ve düzenleme', async () => {
    const db = await freshDb();
    const list = await getTemplateExercises(db, 1);
    await reorderTemplateExercises(db, [...list].reverse().map((x) => x.id));
    const after = await getTemplateExercises(db, 1);
    expect(after[0].exercise_id).toBe(list[list.length - 1].exercise_id);
    await updateTemplateExercise(db, after[0].id, { sets: 5, rest_sec: 90 });
    expect((await getTemplateExercises(db, 1))[0]).toMatchObject({ sets: 5, rest_sec: 90 });
  });

  it('şablon silinince gün dinlenmeye döner', async () => {
    const db = await freshDb();
    await deleteTemplate(db, 1);
    expect(await getDayPlan(db, 0)).toMatchObject({ kind: 'rest', templateId: null });
  });

  it('kendi hareketini ekleme', async () => {
    const db = await freshDb();
    const id = await createUserExercise(db, {
      name: 'Kapı barfiksi', description: '', equipment: 'bodyweight', mode: 'reps', photoUri: null,
      primary: ['lats'], secondary: ['biceps_long'],
    });
    expect(await getExercise(db, id)).toMatchObject({ source: 'user', primary: ['lats'], secondary: ['biceps_long'] });
    expect((await getExerciseList(db)).find((e) => e.id === id)?.regions.split(',').sort()).toEqual(['back', 'biceps']);
  });

  it('seed hareketin Türkçe talimatı, kütüphane hareketinin İngilizce talimatı gelir', async () => {
    const db = await freshDb();
    expect(await getExercise(db, 'Goblet_Squat')).toMatchObject({ instructionsAreEnglish: false });
    expect(await getExercise(db, 'Arnold_Dumbbell_Press')).toMatchObject({ instructionsAreEnglish: true });
  });
});

describe('favoriler', () => {
  it('favori hareketler listelerin en üstünde, kaldırınca eski yerine döner', async () => {
    const db = await freshDb();
    await setFavorite(db, 'Arnold_Dumbbell_Press', true);
    expect((await getExerciseList(db))[0]).toMatchObject({ id: 'Arnold_Dumbbell_Press', is_favorite: 1 });
    expect((await getExercise(db, 'Arnold_Dumbbell_Press'))?.is_favorite).toBe(true);
    // kas detayında birincil/ikincil sırası korunur, grubun içinde favori önce
    expect((await getExercisesByRegion(db, 'shoulders'))[0].id).toBe('Arnold_Dumbbell_Press');
    await setFavorite(db, 'Arnold_Dumbbell_Press', false);
    expect((await getExerciseList(db))[0].id).not.toBe('Arnold_Dumbbell_Press');
  });
});

describe('vücut haritası', () => {
  it('kas haritasındaki her parça çizimde var, çizimdeki her id kas haritasında tanımlı', () => {
    const drawn = new Set([...body.front.muscles, ...body.back.muscles].map((p) => p.id));
    expect([...drawn].sort()).toEqual(muscles.map((m) => m.id).sort());
  });

  it('her parçanın sağ ve sol dokunma kutusu var, kutular görünüm içinde', () => {
    for (const side of [body.front, body.back]) {
      const v = side.viewBox;
      for (const [id, boxes] of Object.entries(side.boxes)) {
        expect(boxes.length).toBeGreaterThanOrEqual(2);
        for (const b of boxes) {
          expect(b.cx).toBeGreaterThan(v.x);
          expect(b.cx).toBeLessThan(v.x + v.w);
          expect(b.w * b.h).toBeGreaterThan(0);
          expect(id).toBeTruthy();
        }
      }
    }
  });
});

describe('odaklı mini harita', () => {
  it('bacak kasları için kadraj alt yarıda, üst vücut için üst yarıda', () => {
    const legs = focusCrop(body.front, ['quad_outer', 'quad_middle', 'quad_inner'])!;
    const chest = focusCrop(body.front, ['chest_upper', 'chest_middle'])!;
    const v = body.front.viewBox;
    expect(legs.y).toBeGreaterThan(v.y + v.h * 0.35);
    expect(chest.y + chest.h).toBeLessThan(v.y + v.h * 0.6);
    for (const c of [legs, chest]) {
      expect(c.x).toBeGreaterThanOrEqual(v.x);
      expect(c.x + c.w).toBeLessThanOrEqual(v.x + v.w + 0.01);
      expect(c.w).toBeLessThan(v.w);
    }
  });

  it('bu yüzde olmayan kaslar için kadraj yok', () => {
    expect(focusCrop(body.front, ['glute_max'])).toBeNull();
  });
});
