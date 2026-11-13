// Seed programdaki 25 hareket: Türkçe içerik + kas parçası eşleşmesi.
// `id` free-exercise-db'de birebir karşılığı varsa onunla aynıdır (o kaydın yerine geçer);
// `imageId` görsellerin alındığı free-exercise-db kaydıdır.
// Bu dosya scripts/import-exercises.mjs tarafından da okunur: sadece silinebilir TS sözdizimi kullan (enum yok).

export type Equipment = 'dumbbell' | 'machine' | 'bodyweight' | 'barbell' | 'cable' | 'other';

export interface SeedExercise {
  id: string;
  nameTr: string;
  imageId: string;
  equipment: Equipment;
  mode: 'reps' | 'time';
  heavy: boolean;
  primary: string[];
  secondary: string[];
  instructions: string[];
  mistakes: string[];
  tips: string[];
}

const QUADS = ['quad_outer', 'quad_middle', 'quad_inner'];
const HAMS = ['hamstring_outer', 'hamstring_inner'];
const TRICEPS = ['triceps_long', 'triceps_lateral', 'triceps_medial'];
const BICEPS = ['biceps_long', 'biceps_short'];

export const seedExercises: SeedExercise[] = [
  {
    id: 'Dumbbell_Bench_Press', nameTr: 'Dambıl bench press', imageId: 'Dumbbell_Bench_Press',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['chest_middle'], secondary: ['chest_upper', 'chest_lower', 'delt_front', ...TRICEPS],
    instructions: [
      'Düz sehpaya sırtüstü uzan, dambılları dizlerinden göğüs hizasına getir.',
      'Kürek kemiklerini geriye ve aşağı sıkıştır, ayaklarını yere sağlam bas.',
      'Dambılları göğsün üzerinde, avuç içleri ayaklarına bakacak şekilde yukarı it.',
      'Dirsekler gövdeyle yaklaşık 45° açı yapacak şekilde kontrollü indir.',
      'Göğsünde hafif gerilme hissedince tekrar yukarı it.',
    ],
    mistakes: ['Dirsekleri 90° yana açmak (omuza yük bindirir)', 'Dambılları alt noktada sektirmek', 'Belini aşırı kavislendirip kalçayı sehpadan kaldırmak'],
    tips: ['Yukarıda dambılları birbirine çarpma; hafif yaklaştırmak yeterli.', 'İnişi 2-3 saniyede yap.'],
  },
  {
    id: 'One-Arm_Dumbbell_Row', nameTr: 'Tek kol dambıl row', imageId: 'One-Arm_Dumbbell_Row',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['lats', 'rhomboids'], secondary: ['trap_middle', 'delt_rear', ...BICEPS],
    instructions: [
      'Bir diz ve aynı taraftaki elini sehpaya koy, sırtını düz ve yere paralel tut.',
      'Diğer elinle dambılı sarkıt, kolun tam uzansın.',
      'Dirseği kalçana doğru çekerek dambılı yukarı kaldır.',
      'Üstte kürek kemiğini sıkıştır, sonra kontrollü indir.',
    ],
    mistakes: ['Gövdeyi döndürerek ağırlığı savurmak', 'Dirseği yana açıp omuza çekmek', 'Sırtı kamburlaştırmak'],
    tips: ['Elini kanca gibi düşün; çekişi dirsekten başlat.', 'Altta omzunun hafifçe aşağı uzamasına izin ver.'],
  },
  {
    id: 'Standing_Dumbbell_Press', nameTr: 'Ayakta omuz press', imageId: 'Standing_Dumbbell_Press',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['delt_front'], secondary: ['delt_side', ...TRICEPS, 'trap_upper'],
    instructions: [
      'Ayaklar kalça genişliğinde ayakta dur, dambılları omuz hizasında tut.',
      'Karnını ve kalçanı sık, gövdeni sabitle.',
      'Dambılları başının üzerine, kolların neredeyse düzleşene kadar it.',
      'Kontrollü şekilde omuz hizasına geri indir.',
    ],
    mistakes: ['Beli geriye bükerek itmek', 'Dizlerden yaylanıp ağırlığı fırlatmak', 'Yarım hareket (omuz hizasına inmemek)'],
    tips: ['Başını hafifçe geri çek, dambıllar yüzünün önünden geçsin.', 'Üstte omuzlarını hafifçe yukarı kaldırmak doğal ve güvenli.'],
  },
  {
    id: 'Straight-Arm_Dumbbell_Pullover', nameTr: 'Pullover', imageId: 'Straight-Arm_Dumbbell_Pullover',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['lats', 'chest_middle'], secondary: ['triceps_long', 'chest_lower'],
    instructions: [
      'Sehpaya sırtüstü uzan, tek dambılı iki elinle göğsünün üzerinde tut.',
      'Dirseklerin hafif bükük kalsın.',
      'Dambılı başının arkasına doğru, kollarını kulak hizasına kadar yay çizerek indir.',
      'Göğüs ve kanatlarında gerilme hissedince aynı yaydan geri çek.',
    ],
    mistakes: ['Dirsekleri bükerek hareketi triceps extension\'a çevirmek', 'Omuz esnekliğinin ötesine inmek', 'Beli sehpadan kaldırmak'],
    tips: ['Kaburgalarını aşağıda tut, karnını sık.', 'Hafif ağırlıkla tam açıklık, ağır ağırlıkla yarım hareketten iyidir.'],
  },
  {
    id: 'Hammer_Curls', nameTr: 'Hammer curl', imageId: 'Hammer_Curls',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['biceps_long'], secondary: ['forearm_inner', 'forearm_outer'],
    instructions: [
      'Ayakta dur, dambılları avuç içleri birbirine bakacak şekilde (çekiç tutuşu) yanlarda tut.',
      'Dirsekleri gövdene sabitle.',
      'Dambılları omuza doğru kaldır, tutuş açısını değiştirme.',
      'Kontrollü şekilde indir.',
    ],
    mistakes: ['Gövdeyle sallanmak', 'Dirsekleri öne kaydırmak', 'İnişi hızlı bırakmak'],
    tips: ['Tek tek veya aynı anda yapabilirsin.', 'Üstte bir an sık.'],
  },
  {
    id: 'Standing_Dumbbell_Triceps_Extension', nameTr: 'Baş üstü triceps extension', imageId: 'Standing_Dumbbell_Triceps_Extension',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['triceps_long'], secondary: ['triceps_lateral', 'triceps_medial'],
    instructions: [
      'Tek dambılı iki elinle tutup başının üzerine kaldır.',
      'Dirseklerini kulaklarının yanında sabit tut.',
      'Dambılı başının arkasına doğru indir.',
      'Dirsekleri açarak dambılı tekrar yukarı it.',
    ],
    mistakes: ['Dirsekleri yana açmak', 'Beli geriye bükmek', 'Yarım açıklıkta çalışmak'],
    tips: ['Oturarak yapmak beli rahatlatır.', 'Altta uzun başın gerildiğini hissetmelisin.'],
  },
  {
    id: 'Goblet_Squat', nameTr: 'Goblet squat', imageId: 'Goblet_Squat',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: [...QUADS, 'glute_max'], secondary: ['adductors', 'erector_spinae'],
    instructions: [
      'Dambılı dik tutarak göğsünün önünde iki elinle kavra.',
      'Ayaklar omuz genişliğinde, parmak uçları hafif dışa dönük.',
      'Kalçanı geriye ve aşağı göndererek çömel, göğsün dik kalsın.',
      'Dirsekler dizlerinin iç tarafına gelene kadar in.',
      'Topuklarından iterek ayağa kalk.',
    ],
    mistakes: ['Dizlerin içe çökmesi', 'Topukların yerden kalkması', 'Gövdenin öne kapanması'],
    tips: ['Dizlerini ayak parmaklarının yönünde it.', 'Dambılı göğsüne yapışık tutmak dengeyi kolaylaştırır.'],
  },
  {
    id: 'Dumbbell_Romanian_Deadlift', nameTr: 'Romanian deadlift', imageId: 'Stiff-Legged_Dumbbell_Deadlift',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: [...HAMS, 'glute_max'], secondary: ['erector_spinae', 'adductors'],
    instructions: [
      'Ayakta dur, dambılları uylukların önünde tut, dizler hafif bükük.',
      'Sırtını düz tutarak kalçanı geriye it ve gövdeni öne eğ.',
      'Dambıllar bacaklarına yakın, kaval kemiği ortasına kadar insin.',
      'Arka bacakta gerilme hissedince kalçanı öne iterek doğrul.',
    ],
    mistakes: ['Sırtı yuvarlamak', 'Dizleri fazla bükerek squat\'a çevirmek', 'Dambılları bacaklardan uzaklaştırmak'],
    tips: ['Kalçanla arkadaki bir kapıyı kapattığını düşün.', 'Üstte kalçanı sık ama beli geriye bükme.'],
  },
  {
    id: 'Dumbbell_Bulgarian_Split_Squat', nameTr: 'Bulgarian split squat', imageId: 'Split_Squat_with_Dumbbells',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: [...QUADS, 'glute_max'], secondary: ['glute_med', 'adductors', ...HAMS],
    instructions: [
      'Sehpanın önünde dur, bir ayağının üstünü arkadaki sehpaya koy.',
      'Dambılları yanlarda tut; öndeki ayak sehpadan yaklaşık bir adım ileride olsun.',
      'Arka dizini yere doğru indirerek çömel.',
      'Öndeki topuğundan iterek yukarı çık. Tüm tekrarları bitirip bacak değiştir.',
    ],
    mistakes: ['Öndeki dizin içe çökmesi', 'Ağırlığı arka bacağa vermek', 'Ön topuğun kalkması'],
    tips: ['Gövdeyi hafif öne eğmek kalçayı, dik tutmak ön bacağı daha çok çalıştırır.', 'Önce zayıf bacakla başla.'],
  },
  {
    id: 'Standing_Dumbbell_Calf_Raise', nameTr: 'Calf raise', imageId: 'Standing_Dumbbell_Calf_Raise',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['gastrocnemius'], secondary: ['soleus'],
    instructions: [
      'Dambılları yanlarda tut, ayak uçların bir basamağın kenarında olsun.',
      'Topuklarını basamaktan aşağı sarkıtarak baldırını ger.',
      'Parmak uçlarına yükselerek topuklarını olabildiğince kaldır.',
      'Üstte 1 saniye bekle, yavaşça indir.',
    ],
    mistakes: ['Dizlerden yaylanmak', 'Hızlı ve kısa tekrar yapmak', 'Alt noktada gerilmeyi atlamak'],
    tips: ['Denge için bir elinle duvara tutunabilirsin.', 'Ağırlık başparmak tarafında olsun.'],
  },
  {
    id: 'Flat_Bench_Lying_Leg_Raise', nameTr: 'Lying leg raise', imageId: 'Flat_Bench_Lying_Leg_Raise',
    equipment: 'bodyweight', mode: 'reps', heavy: false,
    primary: ['abs_lower'], secondary: ['abs_upper', 'obliques'],
    instructions: [
      'Sırtüstü uzan, ellerini kalçanın altına veya yanlara koy.',
      'Bacaklarını düz veya hafif bükük tutarak yukarı, dik açıya kadar kaldır.',
      'Üstte leğenini hafifçe yerden kıvır.',
      'Bacaklarını yere değdirmeden kontrollü indir.',
    ],
    mistakes: ['Belin yerden kalkması', 'Bacakları düşürür gibi indirmek', 'Momentumla sallanmak'],
    tips: ['Bel boşluğunu yere bastırmaya odaklan.', 'Zorlanırsan dizleri bükerek yap.'],
  },
  {
    id: 'Plank', nameTr: 'Plank', imageId: 'Plank',
    equipment: 'bodyweight', mode: 'time', heavy: false,
    primary: ['abs_upper', 'abs_lower'], secondary: ['obliques', 'delt_front', 'erector_spinae'],
    instructions: [
      'Ön kolların ve ayak parmak uçların üzerinde yüzüstü pozisyon al.',
      'Dirsekler omuzların altında olsun.',
      'Baştan topuğa düz bir çizgi oluştur; karın ve kalçayı sık.',
      'Süre boyunca bu pozisyonu koru, düzenli nefes al.',
    ],
    mistakes: ['Kalçayı yukarı kaldırmak', 'Belin çökmesi', 'Nefesi tutmak'],
    tips: ['Dirseklerini ayaklarına doğru çektiğini düşün; zorluk artar.', 'Form bozulunca seti bitir.'],
  },
  {
    id: 'Incline_Dumbbell_Press', nameTr: 'İncline dambıl press', imageId: 'Incline_Dumbbell_Press',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['chest_upper'], secondary: ['delt_front', ...TRICEPS],
    instructions: [
      'Sehpayı 30-45° açıya ayarla, sırtüstü yaslan.',
      'Dambılları üst göğüs hizasında tut, kürek kemiklerini sıkıştır.',
      'Dambılları üst göğsünün üzerine doğru yukarı it.',
      'Kontrollü şekilde göğüs hizasına indir.',
    ],
    mistakes: ['Sehpayı çok dik ayarlamak (omuz press\'e döner)', 'Dirsekleri yana açmak', 'Kalçayı sehpadan kaldırmak'],
    tips: ['30° çoğu kişi için üst göğsü en iyi hedefleyen açıdır.'],
  },
  {
    id: 'Bent_Over_Two-Dumbbell_Row', nameTr: 'Dambıl row', imageId: 'Bent_Over_Two-Dumbbell_Row',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['lats', 'rhomboids', 'trap_middle'], secondary: ['delt_rear', ...BICEPS, 'erector_spinae'],
    instructions: [
      'Dambılları tut, dizler hafif bükük, kalçadan menteşe yaparak gövdeni öne eğ.',
      'Sırtın düz, kolların aşağı sarkık olsun.',
      'Dirsekleri geriye çekerek dambılları kalçana doğru kaldır.',
      'Kürek kemiklerini sıkıştır, kontrollü indir.',
    ],
    mistakes: ['Sırtı yuvarlamak', 'Gövdeyi her tekrarda kaldırmak', 'Omuzları kulaklara çekmek'],
    tips: ['Belin zorlanıyorsa göğüs destekli (incline sehpada yüzüstü) yap.'],
  },
  {
    id: 'Side_Lateral_Raise', nameTr: 'Lateral raise', imageId: 'Side_Lateral_Raise',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['delt_side'], secondary: ['delt_front', 'trap_upper'],
    instructions: [
      'Dambılları yanlarda tut, dirsekler hafif bükük.',
      'Kollarını yana doğru omuz hizasına kadar kaldır.',
      'Üstte serçe parmak tarafın hafifçe yukarıda olsun.',
      'Yavaşça indir.',
    ],
    mistakes: ['Ağırlığı savurmak', 'Omuzları kulaklara çekmek', 'Omuz hizasının çok üstüne çıkmak'],
    tips: ['Hafif ağırlık ve yavaş tempo bu harekette en iyisidir.', 'Dambılları biraz önde (gövdenin 20-30° önünde) kaldırmak omuz için daha rahattır.'],
  },
  {
    id: 'Reverse_Flyes', nameTr: 'Reverse fly', imageId: 'Reverse_Flyes',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['delt_rear'], secondary: ['rhomboids', 'trap_middle'],
    instructions: [
      'Gövdeni öne eğ (oturarak veya ayakta), dambılları aşağı sarkıt.',
      'Dirsekler hafif bükük, kollarını yana doğru aç.',
      'Kollar gövdeyle aynı hizaya gelince bir an sık.',
      'Kontrollü indir.',
    ],
    mistakes: ['Kürek kemiklerini fazla sıkıştırıp hareketi row\'a çevirmek', 'Ağır ağırlıkla savurmak'],
    tips: ['Kollarını geriye değil, yana doğru geniş bir yay çizerek aç.'],
  },
  {
    id: 'Dumbbell_Shrug', nameTr: 'Dambıl shrug', imageId: 'Dumbbell_Shrug',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['trap_upper'], secondary: ['trap_middle', 'forearm_outer'],
    instructions: [
      'Dambılları yanlarda tut, kollar düz.',
      'Omuzlarını kulaklarına doğru dümdüz yukarı kaldır.',
      'Üstte 1-2 saniye sık.',
      'Yavaşça indir.',
    ],
    mistakes: ['Omuzları döndürmek', 'Dirsekleri bükmek', 'Başı öne uzatmak'],
    tips: ['Kavrama zayıfsa lifting strap kullanabilirsin.'],
  },
  {
    id: 'Dumbbell_Bicep_Curl', nameTr: 'Biceps curl', imageId: 'Dumbbell_Bicep_Curl',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['biceps_short', 'biceps_long'], secondary: ['forearm_inner'],
    instructions: [
      'Ayakta dur, dambılları avuç içleri öne bakacak şekilde yanlarda tut.',
      'Dirseklerini gövdene sabitle.',
      'Dambılları omuzlarına doğru kaldır.',
      'Kontrollü indir. Süperset: hemen ardından kickback setine geç.',
    ],
    mistakes: ['Gövdeyle sallanmak', 'Dirsekleri öne kaldırmak', 'Altta kolu tam açmamak'],
    tips: ['Üstte serçe parmağını hafifçe dışa çevirmek bicepsi daha çok sıkar.'],
  },
  {
    id: 'Tricep_Dumbbell_Kickback', nameTr: 'Triceps kickback', imageId: 'Tricep_Dumbbell_Kickback',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['triceps_lateral'], secondary: ['triceps_long', 'triceps_medial', 'delt_rear'],
    instructions: [
      'Gövdeni öne eğ, üst kolunu gövdene paralel ve sabit tut.',
      'Dirsek 90° bükük başla.',
      'Ön kolunu geriye doğru tamamen düzleştir.',
      'Üstte sık, kontrollü şekilde 90°\'ye geri dön.',
    ],
    mistakes: ['Üst kolu sallamak', 'Ağırlığı savurmak', 'Kolu tam düzleştirmemek'],
    tips: ['Hafif ağırlık yeterli; üstteki sıkışma her şeydir.'],
  },
  {
    id: 'Dumbbell_Deadlift', nameTr: 'Dambıl deadlift', imageId: 'Trap_Bar_Deadlift',
    equipment: 'dumbbell', mode: 'reps', heavy: true,
    primary: ['glute_max', ...HAMS, 'erector_spinae'], secondary: [...QUADS, 'trap_upper', 'forearm_inner'],
    instructions: [
      'Dambılları ayaklarının iki yanında yere koy, ayaklar kalça genişliğinde.',
      'Kalçanı geriye it, dizlerini bük ve sırtın düz şekilde dambılları kavra.',
      'Göğsünü kaldır, karnını sık, yeri ayaklarınla itiyormuş gibi ayağa kalk.',
      'Kalçanı geriye göndererek dambılları kontrollü şekilde yere indir.',
    ],
    mistakes: ['Sırtı yuvarlamak', 'Kalçanın göğüsten önce kalkması', 'Üstte beli geriye bükmek'],
    tips: ['Dambıllar hareket boyunca vücudunun yanında dikey hatta kalsın.', 'Her tekrarda nefes al, karnını sık, sonra kaldır.'],
  },
  {
    id: 'Dumbbell_Walking_Lunge', nameTr: 'Walking lunge', imageId: 'Bodyweight_Walking_Lunge',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: [...QUADS, 'glute_max'], secondary: ['glute_med', ...HAMS, 'adductors', 'gastrocnemius'],
    instructions: [
      'Dambılları yanlarda tut, dik dur.',
      'Bir adım öne at ve arka dizini yere yaklaştırarak çömel.',
      'Öndeki topuktan iterek kalk ve arka ayağı öne getirip yeni adımı at.',
      'Bacakları sırayla değiştirerek yürü.',
    ],
    mistakes: ['Çok kısa adım (diz parmakları fazla geçer)', 'Öndeki dizin içe çökmesi', 'Gövdenin öne kapanması'],
    tips: ['Yer darsa aynı yerde geri adım (reverse lunge) yapabilirsin.'],
  },
  {
    id: 'Dumbbell_Step_Ups', nameTr: 'Step-up', imageId: 'Dumbbell_Step_Ups',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: [...QUADS, 'glute_max'], secondary: ['glute_med', ...HAMS, 'gastrocnemius'],
    instructions: [
      'Dambılları yanlarda tut, bir ayağını sağlam bir basamağa/sehpaya koy.',
      'Üstteki topuğundan iterek basamağa çık, arka ayakla yerden itme.',
      'Üstte dik dur.',
      'Kontrollü şekilde aynı bacakla in. Tekrarları bitirip bacak değiştir.',
    ],
    mistakes: ['Arka ayakla zıplayarak çıkmak', 'Dizin içe çökmesi', 'Çok yüksek basamak'],
    tips: ['Diz yaklaşık 90° olacak yükseklik idealdir.'],
  },
  {
    id: 'Russian_Twist', nameTr: 'Russian twist', imageId: 'Russian_Twist',
    equipment: 'bodyweight', mode: 'reps', heavy: false,
    primary: ['obliques'], secondary: ['abs_upper', 'abs_lower'],
    instructions: [
      'Yere otur, dizler bükük, gövdeni hafifçe geriye yasla.',
      'Ellerini (veya bir dambılı) göğsünün önünde birleştir.',
      'Gövdeni sağa döndür, ardından sola. Her yön bir tekrar.',
    ],
    mistakes: ['Sadece kolları sallamak', 'Sırtı yuvarlamak', 'Çok hızlı yapmak'],
    tips: ['Zorlaştırmak için ayakları yerden kaldır.'],
  },
  {
    id: 'Dumbbell_Crunch', nameTr: 'Dambıl crunch', imageId: 'Weighted_Crunches',
    equipment: 'dumbbell', mode: 'reps', heavy: false,
    primary: ['abs_upper'], secondary: ['abs_lower', 'obliques'],
    instructions: [
      'Sırtüstü uzan, dizler bükük, dambılı göğsünde tut.',
      'Karnını sıkarak omuzlarını yerden kaldır, kaburgalarını leğenine yaklaştır.',
      'Üstte bir an bekle, kontrollü in.',
    ],
    mistakes: ['Boynu elle/öne çekmek', 'Tamamen oturur pozisyona gelmek', 'Momentum kullanmak'],
    tips: ['Çenenle göğsün arasında bir yumruk boşluk bırak.'],
  },
  {
    id: 'Side_Plank', nameTr: 'Side plank', imageId: 'Side_Bridge',
    equipment: 'bodyweight', mode: 'time', heavy: false,
    primary: ['obliques'], secondary: ['glute_med', 'abs_upper', 'abs_lower'],
    instructions: [
      'Yan yat, dirseğin omzunun altında olsun, bacaklar düz ve üst üste.',
      'Kalçanı kaldırarak baştan ayağa düz bir çizgi oluştur.',
      'Süre boyunca pozisyonu koru, sonra diğer tarafa geç.',
    ],
    mistakes: ['Kalçanın aşağı sarkması', 'Gövdenin öne/arkaya dönmesi'],
    tips: ['Zorlanırsan alttaki dizini yere koy.'],
  },
];
