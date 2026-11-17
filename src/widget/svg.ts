import { body } from '@/data/bodyPaths';
import { bodyRegions } from '@/data/bodyRegions';

/** İlerleme halkası (0..1), üstten saat yönünde. */
export function ringSvg(ratio: number, color: string, track: string, size: number, stroke: number) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, ratio));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>`
    + (p > 0 ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"`
      + ` stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>` : '')
    + '</svg>';
}

/** Mini manken (ön ve arka yan yana): çalışan bölgeler vurgu renginde. Döner: svg ve en/boy oranı. */
export function mannequinSvg(regions: string[], hit: string, base: string, silhouette: string) {
  const on = new Set(regions);
  const gap = 40;
  const f = body.front.viewBox;
  const b = body.back.viewBox;
  const w = f.w + gap + b.w;
  const side = (s: 'front' | 'back', dx: number) => {
    const vb = body[s].viewBox;
    return `<g transform="translate(${dx - vb.x} ${-vb.y})">`
      + body[s].silhouette.map((d) => `<path d="${d}" fill="${silhouette}"/>`).join('')
      + bodyRegions[s].map((r) => `<path d="${r.d}" fill="${on.has(r.id) ? hit : base}"/>`).join('')
      + '</g>';
  };
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${f.h}">${side('front', 0)}${side('back', f.w + gap)}</svg>`,
    aspect: w / f.h,
  };
}

/** Material ikon yolları (24×24). */
export const ICONS = {
  fire: 'M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.75-.55C9.29 3.71 6.68 8 8.87 13.62c.18.46-.36.89-.75.59-1.81-1.37-2-3.34-1.84-4.75.06-.52-.62-.77-.91-.34C4.69 10.16 4 11.84 4 14.37c.38 5.6 5.11 7.32 6.81 7.54 2.43.31 5.06-.14 6.95-1.87 2.08-1.93 2.84-5.01 1.72-7.69zM10.2 17.38c1.44-.35 2.18-1.39 2.38-2.31.33-1.43-.96-2.83-.09-5.09.33 1.87 3.27 3.04 3.27 5.08-.08 2.53-2.82 4.7-5.56 2.32z',
  walk: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
  moon: 'M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z',
};
export const iconSvg = (d: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="${color}"/></svg>`;
