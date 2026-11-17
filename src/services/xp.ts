// XP her seferinde kayıtlı veriden hesaplanır (kalıcı XP tablosu yok): geçmiş sayılır, aynı iş iki kez sayılmaz.

export const XP_RULES = {
  set: 10, // tamamlanan antrenmandaki her set
  habit: 5, // işaretlenen her alışkanlık
  waterDay: 10, // su hedefinin tuttuğu gün
  stepDay: 10, // adım hedefinin tuttuğu gün
  streakDay: 5, // seri günü × o günkü seri uzunluğu …
  streakCap: 10, // … en fazla bu uzunluğa kadar (günde en çok 50)
  levelBase: 100, // 1 → 2 için gereken XP
  levelStep: 50, // her seviyede artış
};

export const RANKS: { from: number; name: string }[] = [
  { from: 1, name: 'Çaylak' },
  { from: 5, name: 'Demir' },
  { from: 10, name: 'Bronz' },
  { from: 15, name: 'Gümüş' },
  { from: 20, name: 'Altın' },
  { from: 30, name: 'Elmas' },
  { from: 40, name: 'Efsane' },
];

export type StreakDayStatus = 'completed' | 'frozen' | 'missed';

/** Tarih sırasındaki seri günlerinden XP: tamamlanan gün sayacı artırır, dondurulan korur (XP yok), kaçırılan sıfırlar. */
export function streakXp(statuses: StreakDayStatus[]) {
  let run = 0;
  let xp = 0;
  for (const s of statuses) {
    if (s === 'completed') xp += XP_RULES.streakDay * Math.min(++run, XP_RULES.streakCap);
    else if (s === 'missed') run = 0;
  }
  return xp;
}

export interface XpSources { sets: number; habitLogs: number; waterDays: number; stepDays: number; streak: StreakDayStatus[] }

export function totalXp(s: XpSources) {
  return s.sets * XP_RULES.set + s.habitLogs * XP_RULES.habit + s.waterDays * XP_RULES.waterDay
    + s.stepDays * XP_RULES.stepDay + streakXp(s.streak);
}

export const rankOf = (level: number) => [...RANKS].reverse().find((r) => level >= r.from)!.name;

/** Toplam XP → seviye, seviye içindeki ilerleme ve bir sonraki seviyeye gereken XP. */
export function levelFromXp(xp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  let needed = XP_RULES.levelBase;
  while (rest >= needed) {
    rest -= needed;
    level++;
    needed = XP_RULES.levelBase + XP_RULES.levelStep * (level - 1);
  }
  return { level, intoLevel: rest, needed, rank: rankOf(level), total: Math.max(0, Math.floor(xp)) };
}
