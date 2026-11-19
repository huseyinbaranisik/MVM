// Kas haritası verisi: SVG path id → isim → bölge.
// Path id'leri (muscles[].id) bodyPaths.front/back.ts içindeki path'lerle birebir aynı olmalı.
// Figma'dan yeni SVG export ettiğinde sadece path'lerin `d` değerlerini değiştir; bu dosya aynı kalır.

import { t } from '@/i18n';

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
  { id: 'chest', nameTr: t('Göğüs'), side: 'front' },
  { id: 'shoulders', nameTr: t('Omuz'), side: 'front' },
  { id: 'biceps', nameTr: t('Biceps'), side: 'front' },
  { id: 'forearm_front', nameTr: t('Ön kol'), side: 'front' },
  { id: 'abs', nameTr: t('Karın'), side: 'front' },
  { id: 'quads', nameTr: t('Ön bacak'), side: 'front' },
  { id: 'neck', nameTr: t('Boyun'), side: 'front' },
  { id: 'traps', nameTr: t('Trapez'), side: 'back' },
  { id: 'back', nameTr: t('Sırt'), side: 'back' },
  { id: 'rear_delts', nameTr: t('Arka omuz'), side: 'back' },
  { id: 'triceps', nameTr: t('Triceps'), side: 'back' },
  { id: 'forearm_back', nameTr: t('Ön kol'), side: 'back' },
  { id: 'glutes', nameTr: t('Kalça'), side: 'back' },
  { id: 'hamstrings', nameTr: t('Arka bacak'), side: 'back' },
  { id: 'calves', nameTr: t('Baldır'), side: 'back' },
];

export const muscles: Muscle[] = [
  // ÖN
  { id: 'chest_upper', nameTr: t('Üst göğüs'), nameLatin: 'Pectoralis major (pars clavicularis)', regionId: 'chest',
    description: t('Kolu öne ve yukarı iter. Gelişmiş üst göğüs, göğsün köprücük kemiğine kadar dolu görünmesini sağlar.') },
  { id: 'chest_middle', nameTr: t('Orta göğüs'), nameLatin: 'Pectoralis major (pars sternocostalis)', regionId: 'chest',
    description: t('Göğsün en büyük kısmı; itme ve kolu gövdeye yaklaştırma hareketlerinin ana gücü. Göğsün genişliğini belirler.') },
  { id: 'chest_lower', nameTr: t('Alt göğüs'), nameLatin: 'Pectoralis major (pars abdominalis)', regionId: 'chest',
    description: t('Kolu aşağı ve öne iter (dips, decline press). Göğsün alt çizgisini keskinleştirir.') },
  { id: 'delt_front', nameTr: t('Ön omuz'), nameLatin: 'Deltoideus (pars clavicularis)', regionId: 'shoulders',
    description: t('Kolu öne kaldırır, tüm press hareketlerinde çalışır. Omzun önden dolgun görünmesini sağlar.') },
  { id: 'delt_side', nameTr: t('Yan omuz'), nameLatin: 'Deltoideus (pars acromialis)', regionId: 'shoulders',
    description: t('Kolu yana kaldırır. Omuz genişliğinin ve "V" görünümün ana kaynağı.') },
  { id: 'biceps_long', nameTr: t('Biceps uzun baş'), nameLatin: 'Biceps brachii (caput longum)', regionId: 'biceps',
    description: t('Dirseği büker ve ön kolu dışa çevirir. Biceps tepesinin (peak) yüksekliğini belirler.') },
  { id: 'biceps_short', nameTr: t('Biceps kısa baş'), nameLatin: 'Biceps brachii (caput breve)', regionId: 'biceps',
    description: t('Dirseği büker; kolun iç tarafında, bicepsin kalınlığını ve dolgunluğunu verir.') },
  { id: 'forearm_inner', nameTr: t('Ön kol (iç)'), nameLatin: 'Flexores antebrachii', regionId: 'forearm_front',
    description: t('Bileği ve parmakları büker; kavrama gücünün kaynağı.') },
  { id: 'abs_upper', nameTr: t('Üst karın'), nameLatin: 'Rectus abdominis (pars superior)', regionId: 'abs',
    description: t('Gövdeyi öne büker (crunch). Karın kaslarının üst "kareleri".') },
  { id: 'abs_lower', nameTr: t('Alt karın'), nameLatin: 'Rectus abdominis (pars inferior)', regionId: 'abs',
    description: t('Leğeni yukarı kıvırır (bacak kaldırma). Alt karın çizgisini belirginleştirir.') },
  { id: 'obliques', nameTr: t('Oblikler (yan karın)'), nameLatin: 'Obliquus externus abdominis', regionId: 'abs',
    description: t('Gövdeyi döndürür ve yana büker; beli stabil tutar. Belin yan hattını şekillendirir.') },
  { id: 'quad_outer', nameTr: t('Dış quadriceps'), nameLatin: 'Vastus lateralis', regionId: 'quads',
    description: t('Dizi açar; uyluğun dış kavisini ve genişliğini verir.') },
  { id: 'quad_middle', nameTr: t('Orta quadriceps'), nameLatin: 'Rectus femoris', regionId: 'quads',
    description: t('Dizi açar ve kalçayı büker. Uyluğun ön ortasında uzanır.') },
  { id: 'quad_inner', nameTr: t('İç quadriceps (damla kası)'), nameLatin: 'Vastus medialis', regionId: 'quads',
    description: t('Dizin son açılma derecesinde çalışır ve diz kapağını dengeler. Diz üstündeki damla şekli.') },
  { id: 'adductors', nameTr: t('İç bacak (adduktor)'), nameLatin: 'Adductor magnus / longus', regionId: 'quads',
    description: t('Bacağı içe çeker; squat ve lunge sırasında kalçayı dengeler.') },
  { id: 'neck_front', nameTr: t('Boyun (ön)'), nameLatin: 'Sternocleidomastoideus', regionId: 'neck',
    description: t('Başı öne büker ve döndürür.') },
  // ARKA
  { id: 'trap_upper', nameTr: t('Üst trapez'), nameLatin: 'Trapezius (pars descendens)', regionId: 'traps',
    description: t('Omuzları yukarı kaldırır (shrug). Boyun–omuz hattının kalınlığını verir.') },
  { id: 'trap_middle', nameTr: t('Orta trapez'), nameLatin: 'Trapezius (pars transversa)', regionId: 'traps',
    description: t('Kürek kemiklerini birbirine yaklaştırır; duruşu düzeltir, sırt ortasına kalınlık katar.') },
  { id: 'trap_lower', nameTr: t('Alt trapez'), nameLatin: 'Trapezius (pars ascendens)', regionId: 'traps',
    description: t('Kürek kemiklerini aşağı çeker; omuz sağlığı ve baş üstü hareketler için önemli.') },
  { id: 'lats', nameTr: t('Kanat (latissimus)'), nameLatin: 'Latissimus dorsi', regionId: 'back',
    description: t('Kolu aşağı ve geriye çeker (çekiş hareketleri). Sırtın genişliğini ve "V" formunu verir.') },
  { id: 'rhomboids', nameTr: t('Rhomboid'), nameLatin: 'Rhomboideus major / minor', regionId: 'back',
    description: t('Kürek kemiklerini omurgaya doğru çeker; row hareketlerinin ana yardımcısı.') },
  { id: 'erector_spinae', nameTr: t('Bel (erector spinae)'), nameLatin: 'Erector spinae', regionId: 'back',
    description: t('Omurgayı dik tutar ve geriye açar. Deadlift ve squatta beli korur.') },
  { id: 'delt_rear', nameTr: t('Arka omuz'), nameLatin: 'Deltoideus (pars spinalis)', regionId: 'rear_delts',
    description: t('Kolu geriye açar. Omzun arkadan dolgun ve yuvarlak görünmesini sağlar, duruşa yardım eder.') },
  { id: 'triceps_long', nameTr: t('Triceps uzun baş'), nameLatin: 'Triceps brachii (caput longum)', regionId: 'triceps',
    description: t('Dirseği açar ve omuzdan da geçer; baş üstü hareketlerde tam gerilir. Kolun arka kütlesinin büyük kısmı.') },
  { id: 'triceps_lateral', nameTr: t('Triceps yan baş'), nameLatin: 'Triceps brachii (caput laterale)', regionId: 'triceps',
    description: t('Dirseği açar; kolun dış tarafındaki at nalı görünümü verir.') },
  { id: 'triceps_medial', nameTr: t('Triceps iç baş'), nameLatin: 'Triceps brachii (caput mediale)', regionId: 'triceps',
    description: t('Her dirsek açılışında çalışan derin baş; dirseğe yakın kısımda görünür.') },
  { id: 'forearm_outer', nameTr: t('Ön kol (dış)'), nameLatin: 'Extensores antebrachii / Brachioradialis', regionId: 'forearm_back',
    description: t('Bileği geriye açar; brachioradialis hammer curl ile dirsek bükmeye de katılır.') },
  { id: 'glute_max', nameTr: t('Büyük kalça'), nameLatin: 'Gluteus maximus', regionId: 'glutes',
    description: t('Kalçayı açar (ayağa kalkma, sıçrama). Vücudun en güçlü kası; kalçanın şeklini belirler.') },
  { id: 'glute_med', nameTr: t('Yan kalça'), nameLatin: 'Gluteus medius', regionId: 'glutes',
    description: t('Bacağı yana açar ve tek bacak üzerinde leğeni dengeler; diz içe çökmesini önler.') },
  { id: 'hamstring_outer', nameTr: t('Hamstring dış'), nameLatin: 'Biceps femoris', regionId: 'hamstrings',
    description: t('Dizi büker ve kalçayı açar; uyluğun arka dış hattı.') },
  { id: 'hamstring_inner', nameTr: t('Hamstring iç'), nameLatin: 'Semitendinosus / Semimembranosus', regionId: 'hamstrings',
    description: t('Dizi büker, kalçayı açar; uyluğun arka iç hattı.') },
  { id: 'gastrocnemius', nameTr: t('Gastrocnemius'), nameLatin: 'Gastrocnemius', regionId: 'calves',
    description: t('Topuğu kaldırır (düz dizle). Baldırın görünen kalp şeklindeki kısmı.') },
  { id: 'soleus', nameTr: t('Soleus'), nameLatin: 'Soleus', regionId: 'calves',
    description: t('Topuğu kaldırır (bükük dizle). Gastrocnemiusun altında; baldıra kalınlık verir.') },
];

/** Liste filtresi chip'leri → bölgeler */
export const filterGroups: { label: string; regionIds: string[] }[] = [
  { label: t('Göğüs'), regionIds: ['chest'] },
  { label: t('Sırt'), regionIds: ['traps', 'back'] },
  { label: t('Omuz'), regionIds: ['shoulders', 'rear_delts'] },
  { label: t('Biceps'), regionIds: ['biceps'] },
  { label: t('Triceps'), regionIds: ['triceps'] },
  { label: t('Bacak'), regionIds: ['quads', 'hamstrings'] },
  { label: t('Karın'), regionIds: ['abs'] },
  { label: t('Kalça'), regionIds: ['glutes'] },
  { label: t('Baldır'), regionIds: ['calves'] },
];

export const muscleIds = new Set(muscles.map((m) => m.id));
