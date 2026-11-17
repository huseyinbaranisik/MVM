import { notify, subscribe } from '@/db/bus';
import { must, supabase } from '@/db/supabase';
import { sessionHistory } from '@/services/workout';
import {
  builtInExercises, exercisesForMuscles, fromUserRow, musclesOfRegion, regionsOf, sortForLibrary,
  type CatalogExercise, type UserExerciseRow,
} from '@/services/catalog';

export interface ExerciseRow {
  id: string;
  name_tr: string;
  equipment: string;
  image_key: string | null;
  role: 'primary' | 'secondary';
}

type Catalog = Awaited<ReturnType<typeof loadCatalog>>;
let cached: Promise<Catalog> | null = null;
// her ekran ve mini harita kataloğu okur: kullanıcı hareketi/favori değişene kadar tek istek yeter
subscribe((t) => { if (t.has('*') || t.has('user_exercises') || t.has('exercise_favorites')) cached = null; });

/** Hazır katalog + kullanıcının hareketleri + favoriler. */
export function getCatalog(): Promise<Catalog> {
  cached ??= loadCatalog().catch((e) => { cached = null; throw e; });
  return cached;
}

async function loadCatalog() {
  const [users, favs] = await Promise.all([
    supabase.from('user_exercises').select('id, name_tr, equipment, mode, description, photo_uri, primary_muscles, secondary_muscles'),
    supabase.from('exercise_favorites').select('exercise_id'),
  ]);
  const list = [...builtInExercises(), ...must(users).map((u) => fromUserRow(u as UserExerciseRow))];
  return { list, byId: new Map(list.map((e) => [e.id, e])), favorites: new Set(must(favs).map((f) => f.exercise_id as string)) };
}

const toRows = (r: ReturnType<typeof exercisesForMuscles>): ExerciseRow[] =>
  r.map(({ e, role }) => ({ id: e.id, name_tr: e.name_tr, equipment: e.equipment, image_key: e.image_key, role }));

/** Bölgedeki tüm parçaların hareketleri, tekrarsız; herhangi bir parçada birincilse birincil sayılır. */
export async function getExercisesByRegion(regionId: string) {
  const c = await getCatalog();
  return toRows(exercisesForMuscles(c.list, musclesOfRegion(regionId), c.favorites));
}

export async function getExercisesByMuscle(muscleId: string) {
  const c = await getCatalog();
  return toRows(exercisesForMuscles(c.list, new Set([muscleId]), c.favorites));
}

export interface ExerciseListItem {
  id: string;
  name_tr: string;
  name_en: string | null;
  equipment: string;
  image_key: string | null;
  photo_uri: string | null;
  source: 'seed' | 'fedb' | 'user';
  is_favorite: 0 | 1;
  /** virgülle ayrılmış bölge id'leri */
  regions: string;
  /** birincil + ikincil kas id'leri */
  muscles: string[];
}

/** Kütüphanedeki tüm hareketler (filtreleme ekranda yapılır). Favoriler en üstte, sonra seed ve kullanıcı hareketleri. */
export async function getExerciseList(): Promise<ExerciseListItem[]> {
  const c = await getCatalog();
  return sortForLibrary(c.list, c.favorites).map((e) => ({
    id: e.id, name_tr: e.name_tr, name_en: e.name_en, equipment: e.equipment, image_key: e.image_key, photo_uri: e.photo_uri,
    source: e.source, is_favorite: c.favorites.has(e.id) ? 1 : 0, regions: regionsOf(e).join(','), muscles: [...e.primary, ...e.secondary],
  }));
}

export interface ExerciseDetail {
  id: string;
  name_tr: string;
  name_en: string | null;
  equipment: string;
  mode: 'reps' | 'time';
  description: string | null;
  instructions: string[];
  mistakes: string[];
  tips: string[];
  instructionsAreEnglish: boolean;
  image_key: string | null;
  photo_uri: string | null;
  source: 'seed' | 'fedb' | 'user';
  is_favorite: boolean;
  primary: string[];
  secondary: string[];
}

export async function getExercise(id: string): Promise<ExerciseDetail | null> {
  const c = await getCatalog();
  const e: CatalogExercise | undefined = c.byId.get(id);
  if (!e) return null;
  const tr = e.instructions_tr;
  return {
    id: e.id, name_tr: e.name_tr, name_en: e.name_en, equipment: e.equipment, mode: e.mode, description: e.description,
    instructions: tr.length ? tr : e.instructions_en,
    instructionsAreEnglish: !tr.length && e.instructions_en.length > 0,
    mistakes: e.mistakes_tr, tips: e.tips_tr,
    image_key: e.image_key, photo_uri: e.photo_uri, source: e.source, is_favorite: c.favorites.has(e.id),
    primary: e.primary, secondary: e.secondary,
  };
}

/** Kullanıcının kendi hareketi. */
export async function createUserExercise(x: {
  name: string; description: string; equipment: string; mode: 'reps' | 'time'; photoUri: string | null;
  primary: string[]; secondary: string[];
}) {
  const id = `user_${Date.now()}`;
  must(await supabase.from('user_exercises').insert({
    id, name_tr: x.name, equipment: x.equipment, mode: x.mode, description: x.description || null, photo_uri: x.photoUri,
    primary_muscles: x.primary, secondary_muscles: x.secondary,
  }));
  notify('user_exercises');
  return id;
}

/** Hareketin geçmişi: her bitmiş oturum için en ağır set ve toplam hacim. */
export async function getExerciseHistory(exerciseId: string) {
  const rows = must(await supabase.from('session_sets')
    .select('weight_kg, reps, session_id, workout_sessions!inner(date, status)')
    .eq('exercise_id', exerciseId).eq('workout_sessions.status', 'done'));
  return sessionHistory(rows.map((r) => ({ ...r, date: (r.workout_sessions as unknown as { date: string }).date })));
}

export async function setFavorite(id: string, favorite: boolean) {
  if (favorite) must(await supabase.from('exercise_favorites').upsert({ exercise_id: id }));
  else must(await supabase.from('exercise_favorites').delete().eq('exercise_id', id));
  notify('exercise_favorites');
}
