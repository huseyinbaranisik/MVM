// Kas haritası verisi: SVG path id → isim → bölge.
// Path id'leri (muscles[].id) bodyPaths.front/back.ts içindeki path'lerle birebir aynı olmalı.
// Figma'dan yeni SVG export ettiğinde sadece path'lerin `d` değerlerini değiştir; bu dosya aynı kalır.

export type Side = 'front' | 'back';

export interface Region {
  id: string;
  nameTr: string;
  side: Side;
}

export interface Muscle {
  id: string;
  nameTr: string;
  nameLatin: string;
  regionId: string;
  description: string;
}

export const regions: Region[] = [
  { id: 'chest', nameTr: 'Göğüs', side: 'front' },
  { id: 'shoulders', nameTr: 'Omuz', side: 'front' },
  { id: 'biceps', nameTr: 'Biceps', side: 'front' },
  { id: 'forearm_front', nameTr: 'Ön kol', side: 'front' },
  { id: 'abs', nameTr: 'Karın', side: 'front' },
  { id: 'quads', nameTr: 'Ön bacak', side: 'front' },
  { id: 'neck', nameTr: 'Boyun', side: 'front' },
  { id: 'traps', nameTr: 'Trapez', side: 'back' },
  { id: 'back', nameTr: 'Sırt', side: 'back' },
  { id: 'rear_delts', nameTr: 'Arka omuz', side: 'back' },
  { id: 'triceps', nameTr: 'Triceps', side: 'back' },
  { id: 'forearm_back', nameTr: 'Ön kol', side: 'back' },
  { id: 'glutes', nameTr: 'Kalça', side: 'back' },
  { id: 'hamstrings', nameTr: 'Arka bacak', side: 'back' },
  { id: 'calves', nameTr: 'Baldır', side: 'back' },
];

export const muscles: Muscle[] = [
  // ÖN
  { id: 'chest_upper', nameTr: 'Üst göğüs', nameLatin: 'Pectoralis major (pars clavicularis)', regionId: 'chest',
    description: 'Kolu öne ve yukarı iter. Gelişmiş üst göğüs, göğsün köprücük kemiğine kadar dolu görünmesini sağlar.' },
  { id: 'chest_middle', nameTr: 'Orta göğüs', nameLatin: 'Pectoralis major (pars sternocostalis)', regionId: 'chest',
    description: 'Göğsün en büyük kısmı; itme ve kolu gövdeye yaklaştırma hareketlerinin ana gücü. Göğsün genişliğini belirler.' },
  { id: 'chest_lower', nameTr: 'Alt göğüs', nameLatin: 'Pectoralis major (pars abdominalis)', regionId: 'chest',
    description: 'Kolu aşağı ve öne iter (dips, decline press). Göğsün alt çizgisini keskinleştirir.' },
  { id: 'delt_front', nameTr: 'Ön omuz', nameLatin: 'Deltoideus (pars clavicularis)', regionId: 'shoulders',
    description: 'Kolu öne kaldırır, tüm press hareketlerinde çalışır. Omzun önden dolgun görünmesini sağlar.' },
  { id: 'delt_side', nameTr: 'Yan omuz', nameLatin: 'Deltoideus (pars acromialis)', regionId: 'shoulders',
    description: 'Kolu yana kaldırır. Omuz genişliğinin ve "V" görünümün ana kaynağı.' },
  { id: 'biceps_long', nameTr: 'Biceps uzun baş', nameLatin: 'Biceps brachii (caput longum)', regionId: 'biceps',
    description: 'Dirseği büker ve ön kolu dışa çevirir. Biceps tepesinin (peak) yüksekliğini belirler.' },
  { id: 'biceps_short', nameTr: 'Biceps kısa baş', nameLatin: 'Biceps brachii (caput breve)', regionId: 'biceps',
    description: 'Dirseği büker; kolun iç tarafında, bicepsin kalınlığını ve dolgunluğunu verir.' },
  { id: 'forearm_inner', nameTr: 'Ön kol (iç)', nameLatin: 'Flexores antebrachii', regionId: 'forearm_front',
    description: 'Bileği ve parmakları büker; kavrama gücünün kaynağı.' },
  { id: 'abs_upper', nameTr: 'Üst karın', nameLatin: 'Rectus abdominis (pars superior)', regionId: 'abs',
    description: 'Gövdeyi öne büker (crunch). Karın kaslarının üst "kareleri".' },
  { id: 'abs_lower', nameTr: 'Alt karın', nameLatin: 'Rectus abdominis (pars inferior)', regionId: 'abs',
    description: 'Leğeni yukarı kıvırır (bacak kaldırma). Alt karın çizgisini belirginleştirir.' },
  { id: 'obliques', nameTr: 'Oblikler (yan karın)', nameLatin: 'Obliquus externus abdominis', regionId: 'abs',
    description: 'Gövdeyi döndürür ve yana büker; beli stabil tutar. Belin yan hattını şekillendirir.' },
  { id: 'quad_outer', nameTr: 'Dış quadriceps', nameLatin: 'Vastus lateralis', regionId: 'quads',
    description: 'Dizi açar; uyluğun dış kavisini ve genişliğini verir.' },
  { id: 'quad_middle', nameTr: 'Orta quadriceps', nameLatin: 'Rectus femoris', regionId: 'quads',
    description: 'Dizi açar ve kalçayı büker. Uyluğun ön ortasında uzanır.' },
  { id: 'quad_inner', nameTr: 'İç quadriceps (damla kası)', nameLatin: 'Vastus medialis', regionId: 'quads',
    description: 'Dizin son açılma derecesinde çalışır ve diz kapağını dengeler. Diz üstündeki damla şekli.' },
  { id: 'adductors', nameTr: 'İç bacak (adduktor)', nameLatin: 'Adductor magnus / longus', regionId: 'quads',
    description: 'Bacağı içe çeker; squat ve lunge sırasında kalçayı dengeler.' },
  { id: 'neck_front', nameTr: 'Boyun (ön)', nameLatin: 'Sternocleidomastoideus', regionId: 'neck',
    description: 'Başı öne büker ve döndürür.' },
  // ARKA
  { id: 'trap_upper', nameTr: 'Üst trapez', nameLatin: 'Trapezius (pars descendens)', regionId: 'traps',
    description: 'Omuzları yukarı kaldırır (shrug). Boyun–omuz hattının kalınlığını verir.' },
  { id: 'trap_middle', nameTr: 'Orta trapez', nameLatin: 'Trapezius (pars transversa)', regionId: 'traps',
    description: 'Kürek kemiklerini birbirine yaklaştırır; duruşu düzeltir, sırt ortasına kalınlık katar.' },
  { id: 'trap_lower', nameTr: 'Alt trapez', nameLatin: 'Trapezius (pars ascendens)', regionId: 'traps',
    description: 'Kürek kemiklerini aşağı çeker; omuz sağlığı ve baş üstü hareketler için önemli.' },
  { id: 'lats', nameTr: 'Kanat (latissimus)', nameLatin: 'Latissimus dorsi', regionId: 'back',
    description: 'Kolu aşağı ve geriye çeker (çekiş hareketleri). Sırtın genişliğini ve "V" formunu verir.' },
  { id: 'rhomboids', nameTr: 'Rhomboid', nameLatin: 'Rhomboideus major / minor', regionId: 'back',
    description: 'Kürek kemiklerini omurgaya doğru çeker; row hareketlerinin ana yardımcısı.' },
  { id: 'erector_spinae', nameTr: 'Bel (erector spinae)', nameLatin: 'Erector spinae', regionId: 'back',
    description: 'Omurgayı dik tutar ve geriye açar. Deadlift ve squatta beli korur.' },
  { id: 'delt_rear', nameTr: 'Arka omuz', nameLatin: 'Deltoideus (pars spinalis)', regionId: 'rear_delts',
    description: 'Kolu geriye açar. Omzun arkadan dolgun ve yuvarlak görünmesini sağlar, duruşa yardım eder.' },
  { id: 'triceps_long', nameTr: 'Triceps uzun baş', nameLatin: 'Triceps brachii (caput longum)', regionId: 'triceps',
    description: 'Dirseği açar ve omuzdan da geçer; baş üstü hareketlerde tam gerilir. Kolun arka kütlesinin büyük kısmı.' },
  { id: 'triceps_lateral', nameTr: 'Triceps yan baş', nameLatin: 'Triceps brachii (caput laterale)', regionId: 'triceps',
    description: 'Dirseği açar; kolun dış tarafındaki at nalı görünümü verir.' },
  { id: 'triceps_medial', nameTr: 'Triceps iç baş', nameLatin: 'Triceps brachii (caput mediale)', regionId: 'triceps',
    description: 'Her dirsek açılışında çalışan derin baş; dirseğe yakın kısımda görünür.' },
  { id: 'forearm_outer', nameTr: 'Ön kol (dış)', nameLatin: 'Extensores antebrachii / Brachioradialis', regionId: 'forearm_back',
    description: 'Bileği geriye açar; brachioradialis hammer curl ile dirsek bükmeye de katılır.' },
  { id: 'glute_max', nameTr: 'Büyük kalça', nameLatin: 'Gluteus maximus', regionId: 'glutes',
    description: 'Kalçayı açar (ayağa kalkma, sıçrama). Vücudun en güçlü kası; kalçanın şeklini belirler.' },
  { id: 'glute_med', nameTr: 'Yan kalça', nameLatin: 'Gluteus medius', regionId: 'glutes',
    description: 'Bacağı yana açar ve tek bacak üzerinde leğeni dengeler; diz içe çökmesini önler.' },
  { id: 'hamstring_outer', nameTr: 'Hamstring dış', nameLatin: 'Biceps femoris', regionId: 'hamstrings',
    description: 'Dizi büker ve kalçayı açar; uyluğun arka dış hattı.' },
  { id: 'hamstring_inner', nameTr: 'Hamstring iç', nameLatin: 'Semitendinosus / Semimembranosus', regionId: 'hamstrings',
    description: 'Dizi büker, kalçayı açar; uyluğun arka iç hattı.' },
  { id: 'gastrocnemius', nameTr: 'Gastrocnemius', nameLatin: 'Gastrocnemius', regionId: 'calves',
    description: 'Topuğu kaldırır (düz dizle). Baldırın görünen kalp şeklindeki kısmı.' },
  { id: 'soleus', nameTr: 'Soleus', nameLatin: 'Soleus', regionId: 'calves',
    description: 'Topuğu kaldırır (bükük dizle). Gastrocnemiusun altında; baldıra kalınlık verir.' },
];

/** Liste filtresi chip'leri → bölgeler */
export const filterGroups: { label: string; regionIds: string[] }[] = [
  { label: 'Göğüs', regionIds: ['chest'] },
  { label: 'Sırt', regionIds: ['traps', 'back'] },
  { label: 'Omuz', regionIds: ['shoulders', 'rear_delts'] },
  { label: 'Biceps', regionIds: ['biceps'] },
  { label: 'Triceps', regionIds: ['triceps'] },
  { label: 'Bacak', regionIds: ['quads', 'hamstrings'] },
  { label: 'Karın', regionIds: ['abs'] },
  { label: 'Kalça', regionIds: ['glutes'] },
  { label: 'Baldır', regionIds: ['calves'] },
];

export const muscleIds = new Set(muscles.map((m) => m.id));
