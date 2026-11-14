/** Türkçe harf duyarlı arama: "ışık" ↔ "IŞIK", "çilek" ↔ "Çilek". */
export function filterFoods<T extends { name: string }>(foods: T[], query: string) {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  return q ? foods.filter((f) => f.name.toLocaleLowerCase('tr-TR').includes(q)) : foods;
}

export function sumMacros(logs: { kcal: number; protein: number; fat: number; carbs: number }[]) {
  return logs.reduce((a, l) => ({ kcal: a.kcal + l.kcal, protein: a.protein + l.protein, fat: a.fat + l.fat, carbs: a.carbs + l.carbs }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 });
}
