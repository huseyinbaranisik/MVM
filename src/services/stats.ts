import { addDays, diffDays, weekday, type DateStr } from '@/services/dates';

export interface Point { date: DateStr; value: number }

/** Son değer, ortalama ve ilk–son değişim. Boşsa null. */
export function summarize(points: Point[]) {
  if (!points.length) return null;
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const avg = sorted.reduce((a, p) => a + p.value, 0) / sorted.length;
  return { last: sorted.at(-1)!.value, avg, change: sorted.at(-1)!.value - sorted[0].value };
}

/** Çok noktada grafiği sadeleştirir: aralık uzunsa haftalık ortalamaya (hafta Pazartesi başlar) indirir. */
export function bucket(points: Point[], from: DateStr, to: DateStr): Point[] {
  const sorted = [...points].filter((p) => p.date >= from && p.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  if (diffDays(to, from) <= 90) return sorted;
  const weeks = new Map<string, number[]>();
  for (const p of sorted) {
    const monday = addDays(p.date, -weekday(p.date));
    weeks.set(monday, [...(weeks.get(monday) ?? []), p.value]);
  }
  return [...weeks].map(([date, vs]) => ({ date, value: vs.reduce((a, v) => a + v, 0) / vs.length }));
}

/** Haftalık toplam (çubuk grafik için): her haftanın Pazartesi tarihi ve toplamı; boş haftalar 0. */
export function weeklyTotals(points: Point[], from: DateStr, to: DateStr): Point[] {
  const out = new Map<string, number>();
  for (let d = addDays(from, -weekday(from)); d <= to; d = addDays(d, 7)) out.set(d, 0);
  for (const p of points) {
    const monday = addDays(p.date, -weekday(p.date));
    if (out.has(monday)) out.set(monday, out.get(monday)! + p.value);
  }
  return [...out].map(([date, value]) => ({ date, value }));
}
