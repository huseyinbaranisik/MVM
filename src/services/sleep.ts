// Saatler 'HH:MM'. Uyku kaydı uyanılan güne aittir.

export type SleepDisplay = 'hm' | 'decimal';

const pad = (n: number) => String(n).padStart(2, '0');

export function parseHM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
export const toHM = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

/** Gece yarısını geçen uykular dahil süre (dk). */
export function sleepDuration(bedtime: string, wake: string): number {
  return (parseHM(wake) - parseHM(bedtime) + 1440) % 1440;
}

export function formatDuration(min: number, display: SleepDisplay = 'hm'): string {
  if (display === 'decimal') return `${(min / 60).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} s`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}s ${m}dk` : `${h}s`;
}

/** Ortalama yatış saati; gece yarısı etrafında doğru ortalar (23:30 ve 00:30 → 00:00). */
export function averageBedtime(times: string[]): string | null {
  if (!times.length) return null;
  const shifted = times.map((t) => {
    const m = parseHM(t);
    return m < 12 * 60 ? m + 1440 : m; // öğleden önceki saatler "gecenin devamı"
  });
  const avg = Math.round(shifted.reduce((a, b) => a + b, 0) / shifted.length);
  return toHM(avg % 1440);
}

export const QUALITY_EMOJI = ['😫', '😕', '😐', '🙂', '😴'] as const;
