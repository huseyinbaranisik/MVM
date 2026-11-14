import type { BodySide } from './bodyPaths';

export interface Crop { x: number; y: number; w: number; h: number }

/**
 * Vurgulanan kasların çevresini kadrajlayan viewBox (bacak günü → bacaklar, üst vücut → gövde ve kollar).
 * Kaslar bu yüzde değilse null. Çevredeki kaslar da görünsün diye pay bırakılır, çok küçük kadraj büyütülür.
 */
export function focusCrop(side: BodySide, ids: string[], pad = 0.18, minFrac = 0.4): Crop | null {
  const boxes = ids.flatMap((id) => side.boxes[id] ?? []);
  if (!boxes.length) return null;
  const v = side.viewBox;
  let x1 = Math.min(...boxes.map((b) => b.cx - b.w / 2));
  let x2 = Math.max(...boxes.map((b) => b.cx + b.w / 2));
  let y1 = Math.min(...boxes.map((b) => b.cy - b.h / 2));
  let y2 = Math.max(...boxes.map((b) => b.cy + b.h / 2));
  const grow = (lo: number, hi: number, min: number) => {
    const size = Math.max(hi - lo, min);
    const mid = (lo + hi) / 2;
    return [mid - size / 2, mid + size / 2];
  };
  const p = pad * Math.max(x2 - x1, y2 - y1);
  [x1, x2] = grow(x1 - p, x2 + p, v.w * minFrac);
  [y1, y2] = grow(y1 - p, y2 + p, v.h * minFrac * 0.6);
  // görünüm dışına taşmasın
  const cx = Math.min(Math.max(x1, v.x), v.x + v.w - (x2 - x1));
  const cy = Math.min(Math.max(y1, v.y), v.y + v.h - (y2 - y1));
  return { x: cx, y: cy, w: Math.min(x2 - x1, v.w), h: Math.min(y2 - y1, v.h) };
}
