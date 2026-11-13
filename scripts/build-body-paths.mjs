// MuscleMap (Melih Colpan, MIT) erkek vücut path'lerini bizim kas parçası id'lerimize çevirir → src/data/bodyPaths.ts
// Çalıştırma: git clone https://github.com/melihcolpan/MuscleMap <klasör>
//            node scripts/build-body-paths.mjs <klasör>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = process.argv[2];
if (!repo) throw new Error('Kullanım: node scripts/build-body-paths.mjs <MuscleMap klasörü>');

function readSwift(file) {
  const src = readFileSync(join(repo, 'Sources/MuscleMap/Data', file), 'utf8');
  const out = {};
  for (const block of src.split('BodyPartPathData(').slice(1)) {
    const slug = block.match(/slug:\s*\.(\w+)/)[1];
    const part = out[slug] ?? (out[slug] = []);
    for (const key of ['left', 'right', 'common']) {
      const m = block.match(new RegExp(key + ':\\s*\\[([\\s\\S]*?)\\]'));
      if (m) part.push(...[...m[1].matchAll(/"([^"]+)"/g)].map((x) => ({ d: x[1], side: key })));
    }
  }
  return out;
}

// --- SVG path sınır kutusu (kontrol noktaları dahil, yaklaşık ama kapsayıcı) ---
function bbox(d) {
  const re = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g;
  const toks = d.match(re);
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const xs = [], ys = [];
  const pt = (px, py) => { xs.push(px); ys.push(py); };
  const num = () => Number(toks[i++]);
  // yay bayrakları "01.94" gibi bitişik yazılabilir: tek karakter oku
  const flag = () => {
    const t = toks[i];
    if (t === '0' || t === '1') { i++; return Number(t); }
    toks[i] = t.slice(1);
    return Number(t[0]);
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': x = ox + num(); y = oy + num(); sx = x; sy = y; pt(x, y); cmd = rel ? 'l' : 'L'; break;
      case 'L': case 'T': x = ox + num(); y = oy + num(); pt(x, y); break;
      case 'H': x = (rel ? x : 0) + num(); pt(x, y); break;
      case 'V': y = (rel ? y : 0) + num(); pt(x, y); break;
      case 'C': pt(ox + num(), oy + num()); pt(ox + num(), oy + num()); x = ox + num(); y = oy + num(); pt(x, y); break;
      case 'S': case 'Q': pt(ox + num(), oy + num()); x = ox + num(); y = oy + num(); pt(x, y); break;
      case 'A': { const rx = num(), ry = num(); num(); flag(); flag(); x = ox + num(); y = oy + num(); pt(x, y); pt(x + rx, y + ry); pt(x - rx, y - ry); break; }
      case 'Z': x = sx; y = sy; break;
      default: throw new Error(`Bilinmeyen komut ${cmd}`);
    }
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

const round = (n) => Math.round(n * 10) / 10;
const VIEW = {
  front: { x: 0, y: 95, w: 727, h: 1280 },
  back: { x: 718, y: 95, w: 727, h: 1280 },
};

function build(sideName, file, mapping) {
  const src = readSwift(file);
  const center = VIEW[sideName].x + VIEW[sideName].w / 2;
  const muscles = []; // { id, d, clip? }
  const used = new Set();
  const add = (id, entries, clip) => entries.forEach((e) => muscles.push({ id, d: e.d, clip: clip?.(e) }));

  for (const [slug, rule] of Object.entries(mapping)) {
    const entries = src[slug];
    if (!entries) throw new Error(`${sideName}: ${slug} yok`);
    used.add(slug);
    if (typeof rule === 'string') { add(rule, entries); continue; }
    rule(entries, add, center);
  }
  // kas olmayan her şey silüet
  const silhouette = Object.entries(src).filter(([slug]) => !used.has(slug)).flatMap(([, es]) => es.map((e) => e.d));
  return { muscles, silhouette };
}

// Bir path'i dikey veya yatay ortadan iki kas parçasına böler (kırpma dikdörtgeni ile)
const splitY = (topId, bottomId) => (entries, add) => entries.forEach((e) => {
  const b = bbox(e.d), mid = b.cy;
  add(topId, [e], () => ({ x: b.minX - 2, y: b.minY - 2, w: b.maxX - b.minX + 4, h: mid - b.minY + 2 }));
  add(bottomId, [e], () => ({ x: b.minX - 2, y: mid, w: b.maxX - b.minX + 4, h: b.maxY - mid + 2 }));
});
const splitOuterInner = (outerId, innerId) => (entries, add, center) => entries.forEach((e) => {
  const b = bbox(e.d), mid = b.cx;
  const left = { x: b.minX - 2, y: b.minY - 2, w: mid - b.minX + 2, h: b.maxY - b.minY + 4 };
  const right = { x: mid, y: b.minY - 2, w: b.maxX - mid + 2, h: b.maxY - b.minY + 4 };
  const outerIsLeft = b.cx < center;
  add(outerId, [e], () => (outerIsLeft ? left : right));
  add(innerId, [e], () => (outerIsLeft ? right : left));
});
// Birden fazla path'li kasları konuma göre dağıt: rank fonksiyonu her path'e bir id verir
const byPosition = (assign) => (entries, add, center) => {
  const sides = ['left', 'right', 'common'].map((s) => entries.filter((e) => e.side === s)).filter((g) => g.length);
  for (const group of sides) {
    const boxes = group.map((e) => ({ e, b: bbox(e.d) }));
    for (const { e, b } of boxes) add(assign(b, boxes.map((x) => x.b), center), [e]);
  }
};

const front = build('front', 'MaleFrontPaths.swift', {
  chest: 'chest_middle', // ana göğüs; üstüne üst/alt parçalar biner
  upperChest: 'chest_upper',
  lowerChest: splitY('chest_middle', 'chest_lower'),
  deltoids: 'delt_side',
  frontDeltoid: 'delt_front',
  biceps: splitOuterInner('biceps_long', 'biceps_short'),
  forearm: 'forearm_inner',
  upperAbs: 'abs_upper',
  lowerAbs: 'abs_lower',
  obliques: 'obliques',
  quadriceps: 'quad_middle',
  outerQuad: 'quad_outer',
  innerQuad: 'quad_inner',
  adductors: 'adductors',
  neck: 'neck_front',
  upperTrapezius: 'trap_upper',
  calves: 'gastrocnemius',
});

const back = build('back', 'MaleBackPaths.swift', {
  trapezius: 'trap_middle',
  upperTrapezius: 'trap_upper',
  lowerTrapezius: 'trap_lower',
  rhomboids: 'rhomboids',
  upperBack: 'lats',
  lowerBack: 'erector_spinae',
  deltoids: 'delt_side',
  rearDeltoid: 'delt_rear',
  // triceps: en üstteki path yan baş; kalan ikisinden gövdeye yakın olan uzun baş, diğeri (dirsek tarafı) iç baş
  triceps: byPosition((b, all, center) => {
    const top = [...all].sort((p, q) => p.cy - q.cy)[0];
    if (b === top) return 'triceps_lateral';
    const rest = all.filter((x) => x !== top);
    const closest = [...rest].sort((p, q) => Math.abs(p.cx - center) - Math.abs(q.cx - center))[0];
    return b === closest ? 'triceps_long' : 'triceps_medial';
  }),
  forearm: 'forearm_outer',
  // kalça: üstteki küçük path yan kalça, büyük olan büyük kalça
  gluteal: byPosition((b, all) => (b.minY === Math.min(...all.map((x) => x.minY)) && all.length > 1 ? 'glute_med' : 'glute_max')),
  // hamstring: gövde merkezine uzak olanlar dış (biceps femoris)
  hamstring: byPosition((b, all, center) => {
    const mean = all.reduce((a, x) => a + Math.abs(x.cx - center), 0) / all.length;
    return Math.abs(b.cx - center) >= mean ? 'hamstring_outer' : 'hamstring_inner';
  }),
  // baldır: üst yarıdaki path'ler gastrocnemius, alttakiler soleus
  calves: byPosition((b, all) => {
    const mean = all.reduce((a, x) => a + x.cy, 0) / all.length;
    return b.cy <= mean ? 'gastrocnemius' : 'soleus';
  }),
  adductors: 'adductors',
});

// --- dokunma alanı için kas başına sınır kutuları (kırpma dahil) ---
function boxesFor(muscles) {
  const out = {};
  for (const m of muscles) {
    let { minX, maxX, minY, maxY } = bbox(m.d);
    if (m.clip) {
      minX = Math.max(minX, m.clip.x); maxX = Math.min(maxX, m.clip.x + m.clip.w);
      minY = Math.max(minY, m.clip.y); maxY = Math.min(maxY, m.clip.y + m.clip.h);
    }
    (out[m.id] ??= []).push({ cx: round((minX + maxX) / 2), cy: round((minY + maxY) / 2), w: round(maxX - minX), h: round(maxY - minY) });
  }
  return out;
}

const fmt = (side) => ({
  viewBox: VIEW[side.name],
  silhouette: side.data.silhouette,
  muscles: side.data.muscles.map((m) => (m.clip ? { id: m.id, d: m.d, clip: Object.fromEntries(Object.entries(m.clip).map(([k, v]) => [k, round(v)])) } : { id: m.id, d: m.d })),
  boxes: boxesFor(side.data.muscles),
});

const body = { front: fmt({ name: 'front', data: front }), back: fmt({ name: 'back', data: back }) };
writeFileSync(join(ROOT, 'src/data/bodyPaths.ts'),
  `// scripts/build-body-paths.mjs tarafından üretildi — elle düzenleme.
// Vücut çizimleri: MuscleMap, Copyright (c) 2026 Melih Colpan, MIT Lisansı (bkz. CREDITS.md).
// Figma'dan kendi çizimini kullanmak istersen: aynı yapıda (id → path) bu dosyayı değiştir.

export interface BodyPath { id: string; d: string; clip?: { x: number; y: number; w: number; h: number } }
export interface HitBox { cx: number; cy: number; w: number; h: number }
export interface BodySide {
  viewBox: { x: number; y: number; w: number; h: number };
  silhouette: string[];
  muscles: BodyPath[];
  boxes: Record<string, HitBox[]>;
}

export const body: { front: BodySide; back: BodySide } = ${JSON.stringify(body)};
`);
for (const s of ['front', 'back']) {
  const ids = Object.entries(body[s].boxes).map(([id, bs]) => `${id}(${bs.length})`).join(' ');
  console.log(s, body[s].muscles.length, 'path ·', ids);
}
