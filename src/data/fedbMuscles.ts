// free-exercise-db'nin kaba kas adlarını (ör. "chest") bizim kas parçalarımıza çevirir.
// Seed hareketler bunu kullanmaz; onların eşleşmesi seedExercises.ts'de elle yapılmıştır.

export type Role = 'primary' | 'secondary';

function partsFor(group: string, name: string): string[] {
  const n = name.toLowerCase();
  switch (group) {
    case 'chest':
      if (n.includes('incline')) return ['chest_upper'];
      if (n.includes('decline') || n.includes('dip')) return ['chest_lower'];
      return ['chest_middle'];
    case 'shoulders':
      if (/rear|reverse/.test(n)) return ['delt_rear'];
      if (/lateral|side|upright/.test(n)) return ['delt_side'];
      return ['delt_front'];
    case 'biceps': return ['biceps_long', 'biceps_short'];
    case 'triceps': return ['triceps_long', 'triceps_lateral', 'triceps_medial'];
    case 'forearms': return ['forearm_inner', 'forearm_outer'];
    case 'abdominals':
      return /oblique|twist|side|russian|wood/.test(n) ? ['obliques'] : ['abs_upper', 'abs_lower'];
    case 'quadriceps': return ['quad_outer', 'quad_middle', 'quad_inner'];
    case 'adductors': return ['adductors'];
    case 'abductors': return ['glute_med'];
    case 'hamstrings': return ['hamstring_outer', 'hamstring_inner'];
    case 'glutes': return ['glute_max'];
    case 'calves': return ['gastrocnemius', 'soleus'];
    case 'lats': return ['lats'];
    case 'middle back': return ['rhomboids', 'trap_middle'];
    case 'lower back': return ['erector_spinae'];
    case 'traps': return ['trap_upper'];
    case 'neck': return ['neck_front'];
    default: return [];
  }
}

export function mapFedbMuscles(name: string, primary: string[], secondary: string[]): { muscleId: string; role: Role }[] {
  const out = new Map<string, Role>();
  for (const g of primary) for (const m of partsFor(g, name)) out.set(m, 'primary');
  for (const g of secondary) for (const m of partsFor(g, name)) if (!out.has(m)) out.set(m, 'secondary');
  return [...out].map(([muscleId, role]) => ({ muscleId, role }));
}
