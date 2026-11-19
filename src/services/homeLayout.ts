import { t } from '@/i18n';
export type HomeCardId = 'workout' | 'water' | 'steps' | 'calories' | 'sleep' | 'checklist';
export type HomeCardSize = 'small' | 'large';
export interface HomeItem { id: HomeCardId; size: HomeCardSize }

export const HOME_CARD_NAMES: Record<HomeCardId, string> = {
  workout: t('Antrenman'), water: t('Su'), steps: t('Adım'), calories: t('Kalori'), sleep: t('Uyku'), checklist: t('Görevler'),
};
export const ALL_CARDS = Object.keys(HOME_CARD_NAMES) as HomeCardId[];
/** Küçük/büyük seçilebilen kartlar; diğerleri yalnızca büyük. */
export const RESIZABLE: HomeCardId[] = ['water', 'steps', 'calories', 'sleep'];

export const DEFAULT_LAYOUT: HomeItem[] = [
  { id: 'workout', size: 'large' },
  { id: 'water', size: 'small' },
  { id: 'steps', size: 'small' },
  { id: 'calories', size: 'large' },
  { id: 'sleep', size: 'large' },
  { id: 'checklist', size: 'large' },
];

export const defaultSize = (id: HomeCardId) => DEFAULT_LAYOUT.find((x) => x.id === id)!.size;

/** Kayıtlı düzeni doğrular: bilinmeyen ve tekrarlanan kartları atar, izinsiz boyutu büyük yapar; boşsa varsayılan. */
export function sanitize(raw: unknown): HomeItem[] {
  if (!Array.isArray(raw)) return DEFAULT_LAYOUT;
  const seen = new Set<string>();
  const out: HomeItem[] = [];
  for (const x of raw) {
    const id = (x as HomeItem)?.id;
    if (!ALL_CARDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    const size = (x as HomeItem).size === 'small' && RESIZABLE.includes(id) ? 'small' : 'large';
    out.push({ id, size });
  }
  return out.length ? out : DEFAULT_LAYOUT;
}

/** Ekrandaki satırlar: art arda iki küçük kart yan yana, tek kalan küçük kart kendi satırında. */
export function toRows(items: HomeItem[]): HomeItem[][] {
  const rows: HomeItem[][] = [];
  for (const it of items) {
    const last = rows.at(-1);
    if (it.size === 'small' && last?.length === 1 && last[0].size === 'small') last.push(it);
    else rows.push([it]);
  }
  return rows;
}
