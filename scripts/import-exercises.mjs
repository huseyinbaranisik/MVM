// free-exercise-db'den (Unlicense) uygulamada kullanılan hareketleri ve görsellerini indirir.
// Çalıştırma: node scripts/import-exercises.mjs   (Node 24+, .ts import için type stripping gerekir)
// Çıktılar repoya girer; uygulama çalışırken internet gerekmez.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedExercises } from '../src/data/seedExercises.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const EQUIPMENT = { dumbbell: 'dumbbell', 'body only': 'bodyweight', machine: 'machine' };

// shortcut: kelime bazlı çeviri; sadece pozisyon/ekipman kelimelerini Türkçeleştirir, hareket adları İngilizce kalır.
// Daha doğal adlar istenirse exercises tablosunda name_tr elle düzenlenebilir.
const WORDS = [
  [/\bDumbbells?\b|\bDB\b/g, 'Dambıl'],
  [/\bSmith Machine\b/g, 'Smith makine'],
  [/\bMachine\b/g, 'Makine'],
  [/\bSeated\b/g, 'Oturarak'],
  [/\bStanding\b/g, 'Ayakta'],
  [/\bLying\b/g, 'Yatarak'],
  [/\bKneeling\b/g, 'Diz üstü'],
  [/\bBent[- ]Over\b/gi, 'Eğilerek'],
  [/\bOne[- ]Arm(ed)?\b/gi, 'Tek kol'],
  [/\bTwo[- ]Arm(ed)?\b/gi, 'Çift kol'],
  [/\b(One|Single)[- ]Leg(ged)?\b/gi, 'Tek bacak'],
  [/\bAlternat(e|ing)\b/g, 'Alternatif'],
  [/\bPush[- ]?Ups?\b/gi, 'Şınav'],
  [/\bPull[- ]?Ups?\b/gi, 'Barfiks'],
  [/\bSit[- ]?Ups?\b/gi, 'Mekik'],
  [/\bBodyweight\b/g, 'Vücut ağırlığı'],
];
const translate = (name) => WORDS.reduce((s, [re, tr]) => s.replace(re, tr), name);

const res = await fetch(`${BASE}/dist/exercises.json`);
if (!res.ok) throw new Error(`exercises.json indirilemedi: ${res.status}`);
const all = await res.json();
const byId = new Map(all.map((e) => [e.id, e]));

const seedImageIds = new Set(seedExercises.map((s) => s.imageId));
for (const id of seedImageIds) if (!byId.has(id)) throw new Error(`Seed görsel kaydı yok: ${id}`);

const library = all.filter((e) => e.category === 'strength' && e.equipment in EQUIPMENT && e.images.length > 0);
const imageIds = new Set([...library.map((e) => e.id), ...seedImageIds]);

// Görseller (var olanı atla, 8 paralel)
const queue = [...imageIds].flatMap((id) => byId.get(id).images.map((p) => ({ id, p })));
let done = 0;
async function worker() {
  for (let job = queue.pop(); job; job = queue.pop()) {
    const out = join(ROOT, 'assets', 'exercises', job.p);
    try { await access(out); } catch {
      const r = await fetch(`${BASE}/exercises/${job.p}`);
      if (!r.ok) throw new Error(`${job.p}: ${r.status}`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(await r.arrayBuffer()));
    }
    if (++done % 100 === 0) console.log(`${done} görsel`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

// Uygulama verisi
const seedIds = new Set(seedExercises.map((s) => s.id));
const data = library
  .filter((e) => !seedIds.has(e.id)) // seed kaydı kendi Türkçe içeriğiyle bunun yerine geçer
  .map((e) => ({
    id: e.id,
    nameTr: translate(e.name),
    nameEn: e.name,
    equipment: EQUIPMENT[e.equipment],
    mechanic: e.mechanic,
    primary: e.primaryMuscles,
    secondary: e.secondaryMuscles,
    instructions: e.instructions,
  }));
await writeFile(join(ROOT, 'src/data/exercises.fedb.json'), JSON.stringify(data));

// Metro sadece statik require() görür; bu yüzden id → require haritası üretilir.
const lines = [...imageIds].sort().map((id) => {
  const reqs = byId.get(id).images.map((p) => `require('../../assets/exercises/${p}')`).join(', ');
  return `  ${JSON.stringify(id)}: [${reqs}],`;
});
await writeFile(
  join(ROOT, 'src/data/exerciseImages.ts'),
  `// scripts/import-exercises.mjs tarafından üretildi — elle düzenleme.\n` +
    `export const exerciseImages: Record<string, number[]> = {\n${lines.join('\n')}\n};\n`,
);
console.log(`${data.length} kütüphane hareketi + ${seedExercises.length} seed, ${imageIds.size} görsel seti`);
