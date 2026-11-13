// Antrenman hesapları; saf fonksiyonlar.

export interface SetLike {
  exercise_id: string;
  weight_kg: number | null;
  reps: number | null;
}

/** Tahmini 1RM (Epley). Tekrar yoksa 0. */
export const e1rm = (kg: number, reps: number) => (reps > 0 ? kg * (1 + reps / 30) : 0);

export const volume = (sets: SetLike[]) => sets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);

export const DUMBBELL_STEP_KG = 2;

/**
 * Progressive overload: önceki oturumda planlanan tüm setler tekrar aralığının üst sınırına ulaştıysa
 * ağırlık artırılmalı. Önerilen ağırlık = önceki en ağır + adım. Öneri yoksa null.
 */
export function overloadSuggestion(prev: SetLike[], plannedSets: number, repMax: number | null): number | null {
  if (!repMax || prev.length < plannedSets) return null;
  if (!prev.every((s) => (s.reps ?? 0) >= repMax)) return null;
  const maxKg = Math.max(...prev.map((s) => s.weight_kg ?? 0));
  return maxKg > 0 ? maxKg + DUMBBELL_STEP_KG : null;
}

export interface PR { exercise_id: string; kind: 'weight' | 'e1rm'; value: number }

/**
 * Bu oturumun kişisel rekorları. previousBest: hareket bazında bu oturumdan önceki en iyi değerler.
 * Hareket ilk kez yapılıyorsa (önceki kayıt yok) rekor sayılmaz.
 */
export function findPRs(current: SetLike[], previousBest: Map<string, { maxKg: number; maxE1rm: number }>): PR[] {
  const prs: PR[] = [];
  for (const id of new Set(current.map((s) => s.exercise_id))) {
    const prev = previousBest.get(id);
    if (!prev) continue;
    const sets = current.filter((s) => s.exercise_id === id && s.weight_kg);
    if (!sets.length) continue;
    const maxKg = Math.max(...sets.map((s) => s.weight_kg!));
    const maxE1rm = Math.max(...sets.map((s) => e1rm(s.weight_kg!, s.reps ?? 0)));
    if (maxKg > prev.maxKg) prs.push({ exercise_id: id, kind: 'weight', value: maxKg });
    if (maxE1rm > prev.maxE1rm + 0.01) prs.push({ exercise_id: id, kind: 'e1rm', value: Math.round(maxE1rm * 10) / 10 });
  }
  return prs;
}

/** sn → "1:05" */
export const mmss = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, '0')}`;
