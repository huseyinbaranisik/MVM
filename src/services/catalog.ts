// Hareket kataloğu: uygulamayla gelen hazır hareketler + kullanıcının kendi hareketleri (Supabase user_exercises).
// Saf fonksiyonlar; DB'ye dokunmaz, böylece Jest'te test edilir.
import fedb from '@/data/exercises.fedb.json';
import { mapFedbMuscles } from '@/data/fedbMuscles';
import { muscles } from '@/data/muscleMap';
import { seedExercises } from '@/data/seedExercises';

export interface CatalogExercise {
  id: string;
  name_tr: string;
  name_en: string | null;
  equipment: string;
  mode: 'reps' | 'time';
  is_heavy: boolean;
  description: string | null;
  instructions_tr: string[];
  mistakes_tr: string[];
  tips_tr: string[];
  instructions_en: string[];
  image_key: string | null;
  photo_uri: string | null;
  source: 'seed' | 'fedb' | 'user';
  primary: string[];
  secondary: string[];
}

/** Supabase user_exercises satırı */
export interface UserExerciseRow {
  id: string; name_tr: string; equipment: string; mode: 'reps' | 'time'; description: string | null; photo_uri: string | null;
  primary_muscles: string[]; secondary_muscles: string[];
}

let builtIn: CatalogExercise[] | null = null;

/** Hazır katalog (bir kez kurulur). Seed hareket, aynı id'li free-exercise-db kaydının yerine geçer. */
export function builtInExercises(): CatalogExercise[] {
  if (builtIn) return builtIn;
  const seed: CatalogExercise[] = seedExercises.map((s) => ({
    id: s.id, name_tr: s.nameTr, name_en: null, equipment: s.equipment, mode: s.mode, is_heavy: s.heavy, description: null,
    instructions_tr: s.instructions, mistakes_tr: s.mistakes, tips_tr: s.tips, instructions_en: [],
    image_key: s.imageId, photo_uri: null, source: 'seed', primary: s.primary, secondary: s.secondary,
  }));
  const seen = new Set(seed.map((s) => s.id));
  const rest: CatalogExercise[] = fedb.filter((e) => !seen.has(e.id)).map((e) => {
    const ms = mapFedbMuscles(e.nameEn, e.primary, e.secondary);
    return {
      id: e.id, name_tr: e.nameTr, name_en: e.nameEn, equipment: e.equipment, mode: 'reps',
      // shortcut: bileşik + ağırlıklı hareketleri "ağır" (120 sn) say; kullanıcı şablonda değiştirebilir
      is_heavy: e.mechanic === 'compound' && e.equipment !== 'bodyweight', description: null,
      instructions_tr: [], mistakes_tr: [], tips_tr: [], instructions_en: e.instructions,
      image_key: e.id, photo_uri: null, source: 'fedb',
      primary: ms.filter((m) => m.role === 'primary').map((m) => m.muscleId),
      secondary: ms.filter((m) => m.role === 'secondary').map((m) => m.muscleId),
    };
  });
  builtIn = [...seed, ...rest];
  return builtIn;
}

export function fromUserRow(u: UserExerciseRow): CatalogExercise {
  return {
    id: u.id, name_tr: u.name_tr, name_en: null, equipment: u.equipment, mode: u.mode, is_heavy: false, description: u.description,
    instructions_tr: [], mistakes_tr: [], tips_tr: [], instructions_en: [], image_key: null, photo_uri: u.photo_uri,
    source: 'user', primary: u.primary_muscles, secondary: u.secondary_muscles,
  };
}

const regionOf = new Map(muscles.map((m) => [m.id, m.regionId]));
const sourceRank = (s: CatalogExercise['source']) => (s === 'fedb' ? 1 : 0);

/** Kütüphane sırası: favoriler, sonra seed/kullanıcı, sonra free-exercise-db; her grupta ada göre. */
export function sortForLibrary<T extends CatalogExercise>(list: T[], favorites: ReadonlySet<string>) {
  return [...list].sort((a, b) =>
    Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || sourceRank(a.source) - sourceRank(b.source)
    || a.name_tr.localeCompare(b.name_tr, 'tr'));
}

export const regionsOf = (e: CatalogExercise) => [...new Set([...e.primary, ...e.secondary].map((m) => regionOf.get(m)).filter((r) => r != null))];

/**
 * Verilen kas parçalarından en az birini çalıştıran hareketler, tekrarsız.
 * Herhangi bir parçada birincilse birincil sayılır; birinciller önce, sonra favoriler, sonra ada göre.
 */
export function exercisesForMuscles(list: CatalogExercise[], muscleIds: ReadonlySet<string>, favorites: ReadonlySet<string>) {
  const out: { e: CatalogExercise; role: 'primary' | 'secondary' }[] = [];
  for (const e of list) {
    if (e.primary.some((m) => muscleIds.has(m))) out.push({ e, role: 'primary' });
    else if (e.secondary.some((m) => muscleIds.has(m))) out.push({ e, role: 'secondary' });
  }
  return out.sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1)
    || Number(favorites.has(b.e.id)) - Number(favorites.has(a.e.id)) || a.e.name_tr.localeCompare(b.e.name_tr, 'tr'));
}

export const musclesOfRegion = (regionId: string) => new Set(muscles.filter((m) => m.regionId === regionId).map((m) => m.id));
