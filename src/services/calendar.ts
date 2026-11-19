import { addDays, weekday, type DateStr } from '@/services/dates';
import { t } from '@/i18n';

/** Ayın takvim hücreleri, Pazartesi ile başlar; ay dışı hücreler null. month = 'YYYY-MM'. */
export function monthCells(month: string): (DateStr | null)[] {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekday(first);
  const cells: (DateStr | null)[] = Array(lead).fill(null);
  for (let i = 0; i < days; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export interface DayActivity {
  workouts: string[]; // tamamlanan antrenman adları
  water: number;
  steps: number;
  habits: number; // işaretlenen alışkanlık sayısı
  streak?: 'completed' | 'frozen' | 'missed';
}

export interface ActivityInput {
  sessions: { date: string; name: string | null }[];
  trackers: { type: string; date: string; value: number }[];
  habitLogs: { date: string }[];
  streak: { date: string; status: DayActivity['streak'] }[];
}

/** Ham kayıtları güne göre toplar. */
export function groupActivity(input: ActivityInput) {
  const map = new Map<string, DayActivity>();
  const day = (d: string) => {
    let a = map.get(d);
    if (!a) map.set(d, (a = { workouts: [], water: 0, steps: 0, habits: 0 }));
    return a;
  };
  for (const s of input.sessions) day(s.date).workouts.push(s.name ?? t('Antrenman'));
  for (const t of input.trackers) if (t.type === 'water' || t.type === 'steps') day(t.date)[t.type] += t.value;
  for (const h of input.habitLogs) day(h.date).habits++;
  for (const s of input.streak) day(s.date).streak = s.status;
  return map;
}
