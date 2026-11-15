/** Türkçe harf duyarlı arama: "ışık" ↔ "IŞIK", "çilek" ↔ "Çilek". */
export function filterFoods<T extends { name: string }>(foods: T[], query: string) {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  return q ? foods.filter((f) => f.name.toLocaleLowerCase('tr-TR').includes(q)) : foods;
}

export function sumMacros(logs: { kcal: number; protein: number; fat: number; carbs: number }[]) {
  return logs.reduce((a, l) => ({ kcal: a.kcal + l.kcal, protein: a.protein + l.protein, fat: a.fat + l.fat, carbs: a.carbs + l.carbs }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 });
}

/** Haftada ~4 antrenman + yürüyüş günleri: "orta aktif" çarpanı. */
export const ACTIVITY_FACTOR = 1.55;
export const PROTEIN_G_PER_KG = 1.8; // kas kazanımı/korunması için önerilen 1,6–2,2 g/kg aralığının ortası

/**
 * Günlük kalori ihtiyacı: Mifflin-St Jeor bazal metabolizma × aktivite çarpanı, 50'ye yuvarlı.
 * Cinsiyet belirtilmemişse iki formülün ortası kullanılır. Eksik bilgi varsa null.
 */
export function suggestCalories(p: { weightKg: number | null; heightCm: number | null; age: number | null; sex: 'male' | 'female' | null }) {
  if (!p.weightKg || !p.heightCm || !p.age) return null;
  const sexTerm = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexTerm;
  return Math.round((bmr * ACTIVITY_FACTOR) / 50) * 50;
}

export const proteinTarget = (weightKg: number | null) => (weightKg ? Math.round(weightKg * PROTEIN_G_PER_KG) : null);
