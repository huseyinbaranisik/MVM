// XP her seferinde kayıtlı veriden hesaplanır (kalıcı XP tablosu yok): geçmiş sayılır, aynı iş iki kez sayılmaz.

export const XP_RULES = {
  workout: 50, // tamamlanan her antrenman
  set: 10, // tamamlanan antrenmandaki her set
  habit: 5, // işaretlenen her alışkanlık
  waterDay: 10, // su hedefinin tuttuğu gün
  stepDay: 10, // adım hedefinin tuttuğu gün
  streakDay: 5, // seri günü × o günkü seri uzunluğu …
  streakCap: 10, // … en fazla bu uzunluğa kadar (günde en çok 50)
  levelBase: 100, // 1 → 2 için gereken XP
  levelStep: 50, // her seviyede artış
};

/** Rank'lar ve rozet renkleri (tema dışı sabit: metal tonları her temada aynı okunur). */
export const RANKS: { from: number; name: string; color: string }[] = [
  { from: 1, name: 'Çaylak', color: '#9AA3AD' },
  { from: 5, name: 'Demir', color: '#7D8790' },
  { from: 10, name: 'Bronz', color: '#B87333' },
  { from: 15, name: 'Gümüş', color: '#C0C7CF' },
  { from: 20, name: 'Altın', color: '#E2B33C' },
  { from: 30, name: 'Platin', color: '#6FC3C0' },
  { from: 40, name: 'Elmas', color: '#6FA8F2' },
  { from: 50, name: 'Usta', color: '#B07CF0' },
  { from: 65, name: 'Efsane', color: '#F0647A' },
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

export interface XpSources { workouts?: number; sets: number; habitLogs: number; waterDays: number; stepDays: number; streak: StreakDayStatus[] }

export function totalXp(s: XpSources) {
  return (s.workouts ?? 0) * XP_RULES.workout + s.sets * XP_RULES.set + s.habitLogs * XP_RULES.habit + s.waterDays * XP_RULES.waterDay
    + s.stepDays * XP_RULES.stepDay + streakXp(s.streak);
}

export const rankInfo = (level: number) => [...RANKS].reverse().find((r) => level >= r.from)!;
export const rankOf = (level: number) => rankInfo(level).name;

/** Her seviye atlayışında kazanılan seri dondurma hakkı. */
export const FREEZES_PER_LEVEL = 1;

/** Seviye yolundaki bir durağın ödülü: rank başlangıcında yeni rank, diğerlerinde dondurma hakkı. */
export function levelReward(level: number): { kind: 'rank'; name: string; color: string } | { kind: 'freeze' } | null {
  if (level <= 1) return null;
  const r = RANKS.find((x) => x.from === level);
  return r ? { kind: 'rank', name: r.name, color: r.color } : { kind: 'freeze' };
}

/** Bir seviyeye ulaşmak için gereken toplam XP. */
export function xpForLevel(level: number) {
  let xp = 0;
  for (let l = 1; l < level; l++) xp += XP_RULES.levelBase + XP_RULES.levelStep * (l - 1);
  return xp;
}

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
