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

/** Hareket bazında en ağır set ve en yüksek tahmini 1RM (getPreviousBests için). */
export function bestsByExercise(sets: SetLike[]) {
  const out = new Map<string, { maxKg: number; maxE1rm: number }>();
  for (const s of sets) {
    if (s.weight_kg == null) continue;
    const b = out.get(s.exercise_id) ?? { maxKg: 0, maxE1rm: 0 };
    b.maxKg = Math.max(b.maxKg, s.weight_kg);
    b.maxE1rm = Math.max(b.maxE1rm, e1rm(s.weight_kg, s.reps ?? 0));
    out.set(s.exercise_id, b);
  }
  return out;
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

/** Set seçicisindeki değerler: kilo 2,5–50 (2,5 adım), tekrar 5–20. */
export const KG_VALUES = Array.from({ length: 20 }, (_, i) => (i + 1) * 2.5);
export const REP_VALUES = Array.from({ length: 16 }, (_, i) => i + 5);

/** Listede olmayan bir değer için en yakın seçenek (ör. 12 kg → 12,5). */
export function nearest<T extends number>(values: T[], v: number): T {
  return values.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), values[0]);
}

/**
 * Dinlenmeye süre ekleyip çıkarır. Toplam süre azaltmada sabit kalır (yoksa çubuğun yüzdesi değişmez);
 * eklemede kalan süre toplamı aşarsa toplam büyür, çubuk %100'ü geçmez. Bitiş en erken 1 sn sonra.
 */
export function adjustRestState(s: { endsAt: number; total: number }, deltaSec: number, now: number) {
  const endsAt = Math.max(now + 1000, s.endsAt + deltaSec * 1000);
  return { endsAt, total: Math.max(s.total, Math.ceil((endsAt - now) / 1000)) };
}

/** Hareket bazında özet: set, toplam tekrar, hacim ve en iyi set (en ağır; eşitse çok tekrarlı). */
export function exerciseStats(sets: (SetLike & { duration_sec?: number | null })[]) {
  const out = new Map<string, { sets: number; reps: number; volume: number; best: { kg: number; reps: number } | null; seconds: number }>();
  for (const s of sets) {
    const e = out.get(s.exercise_id) ?? { sets: 0, reps: 0, volume: 0, best: null, seconds: 0 };
    e.sets++;
    e.reps += s.reps ?? 0;
    e.seconds += s.duration_sec ?? 0;
    e.volume += (s.weight_kg ?? 0) * (s.reps ?? 0);
    const kg = s.weight_kg ?? 0;
    if (s.reps && (!e.best || kg > e.best.kg || (kg === e.best.kg && s.reps > e.best.reps))) e.best = { kg, reps: s.reps };
    out.set(s.exercise_id, e);
  }
  return out;
}

/** Hacmin bölgelere dağılımı: her hareketin hacmi birincil kaslarının bölgelerine (bölge başına bir kez) yazılır. */
export function regionVolume(sets: SetLike[], primaryRegions: (exerciseId: string) => string[]) {
  const out = new Map<string, number>();
  for (const [id, st] of exerciseStats(sets)) {
    for (const r of new Set(primaryRegions(id))) out.set(r, (out.get(r) ?? 0) + st.volume);
  }
  return [...out].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
}
