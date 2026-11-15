import { seedFoods } from '@/data/foods';
import { notify } from '@/db/bus';
import { must, supabase } from '@/db/supabase';

/** id: hazır yiyecekler "s<sıra>", kullanıcının eklediği "u<id>" */
export interface Food { id: string; name: string; kcal: number; protein: number; fat: number; carbs: number; source: 'seed' | 'user' }
/** Öğün kaydı; kalori ve makrolar gram üzerinden hesaplanmış halde. */
export interface FoodLog { id: number; name: string; grams: number; kcal: number; protein: number; fat: number; carbs: number }

const BUILT_IN: Food[] = seedFoods.map(([name, kcal, protein, fat, carbs], i) => ({ id: `s${i}`, name, kcal, protein, fat, carbs, source: 'seed' }));

/** Kullanıcının eklediği yiyecekler önce. Arama ekranda yapılır (Türkçe harf duyarlı). */
export async function getFoods(): Promise<Food[]> {
  const own = must(await supabase.from('user_foods').select('id, name, kcal, protein, fat, carbs').order('name'));
  return [...own.map((f) => ({ ...f, id: `u${f.id}`, source: 'user' as const })), ...[...BUILT_IN].sort((a, b) => a.name.localeCompare(b.name, 'tr'))];
}

export async function addFood(f: Omit<Food, 'id' | 'source'>): Promise<Food> {
  const r = must(await supabase.from('user_foods').insert(f).select('id').single());
  notify('user_foods');
  return { ...f, id: `u${r.id}`, source: 'user' };
}

/** Değerler kayda kopyalanır; yiyecek sonradan değişse de geçmiş doğru kalır. */
export async function logFood(date: string, food: Pick<Food, 'name' | 'kcal' | 'protein' | 'fat' | 'carbs'>, grams: number) {
  must(await supabase.from('food_logs').insert({
    date, name: food.name, grams, kcal_100: food.kcal, protein_100: food.protein, fat_100: food.fat, carbs_100: food.carbs,
  }));
  notify('food_logs');
}

export async function deleteFoodLog(id: number) {
  must(await supabase.from('food_logs').delete().eq('id', id));
  notify('food_logs');
}

type LogRow = { id: number; date: string; name: string; grams: number; kcal_100: number; protein_100: number; fat_100: number; carbs_100: number };
const toLog = (l: LogRow): FoodLog => ({
  id: l.id, name: l.name, grams: l.grams, kcal: (l.grams * l.kcal_100) / 100, protein: (l.grams * l.protein_100) / 100,
  fat: (l.grams * l.fat_100) / 100, carbs: (l.grams * l.carbs_100) / 100,
});

export async function getFoodLogs(date: string): Promise<FoodLog[]> {
  return must(await supabase.from('food_logs').select('*').eq('date', date).order('id')).map((l) => toLog(l as LogRow));
}

/** Günlük toplam kalori; getTrackerHistory ile aynı biçim. */
export async function getCalorieHistory(from: string, to: string) {
  const rows = must(await supabase.from('food_logs').select('*').gte('date', from).lte('date', to)) as LogRow[];
  const byDate = new Map<string, number>();
  for (const l of rows) byDate.set(l.date, (byDate.get(l.date) ?? 0) + toLog(l).kcal);
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}
