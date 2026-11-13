# Antrenman & Alışkanlık Uygulaması — Plan (onay bekliyor)

> Durum: **Plan aşaması.** Kod yazılmadı. Onayından sonra Aşama 1'e başlanacak; her aşama sonunda durup onay beklenecek.

---

## 0. Kararlar ve kontroller

### 0.1 free-exercise-db lisansı
- `yuhonas/free-exercise-db` → **Unlicense** (kamu malı benzeri; kopyalama, değiştirme, ticari kullanım serbest, atıf zorunlu değil).
- Veri, `wrkout/exercises.json` (Ollie Jennings) projesinden türetilmiş; o da **Unlicense**.
- ⚠️ **Dikkat:** İki repo da **görsellerin ilk kaynağını belirtmiyor**. Kişisel kullanım için sorun yok. Uygulamayı ileride mağazaya koyarsan görsellerin telif durumu tam belli değil; o noktada görselleri kendi çizimlerin/fotoğraflarınla değiştirmek en güvenlisi. Koda bir `CREDITS.md` ekleyeceğim (atıf zorunlu değil ama iyi pratik).
- Yapı: her hareket `id, name, force, level, mechanic, equipment, primaryMuscles[], secondaryMuscles[], instructions[] (EN), category, images[]` (genelde `0.jpg` = başlangıç, `1.jpg` = bitiş → 3.5'teki başlangıç/bitiş görseline birebir uyuyor).

### 0.2 Kütüphane seçimleri (en az bağımlılık)
| İhtiyaç | Seçim | Neden |
|---|---|---|
| Çatı | Expo SDK (en güncel, `create-expo-app` default template), TS, Expo Router | İstendi |
| DB | `expo-sqlite` + `SQLiteProvider onInit` ile migration | Platformun kendi mekanizması, ekstra ORM yok |
| State | `zustand` | İstendi; sadece UI/oturum state'i. Kalıcı veri SQLite'ta |
| Grafik | **`react-native-gifted-charts`** (+ zorunlu `expo-linear-gradient`) | SVG tabanlı, Skia gerektirmez; noktalı çizgi + tooltip (`pointerConfig`), bar + hedef çizgisi (`referenceLine`) hazır. victory-native Skia ister, daha ağır |
| SVG | `react-native-svg` | Halkalar, vücut haritası |
| Animasyon | `react-native-reanimated` (+ `react-native-gesture-handler`) | Lottie **eklemiyorum**; alev/kutlama reanimated + SVG ile yeterli |
| Bottom sheet | `@gorhom/bottom-sheet` | Çok yerde kullanılıyor, Expo Go'da çalışır |
| Sürükle-bırak | `react-native-draggable-flatlist` | Şablon hareket sıralama |
| Saat seçici | `@react-native-community/datetimepicker` | Uyku, bildirim saatleri |
| Titreşim | `expo-haptics` | Hedef dolunca, timer bitince |
| Bildirim | `expo-notifications` (sadece **yerel** bildirim) | Expo Go'da yerel bildirim çalışır |
| Yedek | `expo-file-system` + `expo-sharing` + `expo-document-picker` (içe aktarma için dosya seçimi) | |
| Özel hareket fotoğrafı | `expo-image-picker` | 3.4 "kendi fotoğrafı" |
| Adım | `expo-sensors` (Pedometer) | Aşağıda 0.3 |
| Test | `jest-expo` | streakService ve saf hesaplamalar |

### 0.3 Adım sayma seçenekleri

| | A) `expo-sensors` Pedometer | B) Health Connect (`react-native-health-connect` + config plugin) |
|---|---|---|
| Expo Go | ✅ Çalışır | ❌ **Dev build** gerekir (EAS Build veya Android Studio ile yerel build) |
| iOS | ✅ `getStepCountAsync` ile geçmiş adım (Core Motion, ~7 gün) | iOS'ta yok (HealthKit ayrı iş) |
| Android | ⚠️ Sadece `watchStepCount`: **uygulama açıkken** sayar, geçmiş okuyamaz → günlük toplam eksik kalır | ✅ Telefonun/Samsung Health/Google Fit'in tüm gün adımı, geçmiş dahil |
| Kurulum | Sıfır | İzin akışı, Android 13- için Health Connect uygulaması, mağazaya çıkılırsa Play izin beyanı |

**Önerim (hibrit):** `src/services/steps.ts` içinde tek bir `getStepsForDate(date)` fonksiyonu.
- Aşama 2'de: iOS → Pedometer geçmişi, Android → uygulama açıkken canlı sayım + **manuel giriş her zaman açık**. Sensör yok / izin reddi → otomatik manuel moda düşer.
- Android kullanıyorsan: Aşama 6'da dev build'e geçip Health Connect kaynağını aynı fonksiyonun arkasına eklemek. Ekranlar değişmez.

---

## 1. Klasör yapısı

```
MVM/
├─ src/app/                          # Expo Router (sadece ekran dosyaları; SDK 58 şablonu gereği src/ altında)
│  ├─ _layout.tsx                    # SQLiteProvider(onInit=migrate), GestureHandlerRoot, BottomSheetModalProvider, tema
│  ├─ (tabs)/
│  │  ├─ _layout.tsx                 # FloatingTabBar (ortada bordo "+")
│  │  ├─ index.tsx                   # Bugün (Ana sayfa)
│  │  ├─ program.tsx                 # Program planlayıcı (7 gün)
│  │  ├─ library.tsx                 # Hareket kütüphanesi + kas haritası
│  │  └─ stats.tsx                   # İstatistikler
│  ├─ profile.tsx                    # Profil (ana sayfa avatarından)
│  ├─ settings.tsx
│  ├─ streak.tsx                     # Streak sayfası
│  ├─ celebration.tsx                # Tam ekran kutlama (modal)
│  ├─ template/[id].tsx              # Şablon oluştur/düzenle
│  ├─ exercise/[id].tsx              # Hareket detay
│  ├─ exercise/new.tsx               # Kendi hareketini ekle
│  ├─ muscle/[id].tsx                # Kas detay (id = bölge veya parça)
│  ├─ workout/[sessionId].tsx        # Aktif antrenman
│  ├─ workout/summary/[sessionId].tsx
│  ├─ tracker/[type].tsx             # Su/adım/uyku geçmişi
│  └─ measurement/[type].tsx         # Kilo/boy/bel... grafik+tablo
├─ src/
│  ├─ theme/
│  │  ├─ colors.ts                   # TÜM renk token'ları (tek kaynak)
│  │  └─ index.ts                    # spacing, radius (20/24), tipografi
│  ├─ db/
│  │  ├─ migrate.ts                  # PRAGMA user_version tabanlı, transaction içinde
│  │  ├─ migrations/001_schema.ts
│  │  ├─ migrations/002_seed.ts      # kaslar, bölgeler, hareketler, şablonlar, program
│  │  └─ repos/                      # her alan için bir dosya: exercises, templates, sessions,
│  │                                 # habits, trackers, sleep, measurements, streak, settings, backup
│  ├─ data/
│  │  ├─ muscleMap.ts                # path id → isim → bölge (+ latin ad, açıklama)
│  │  ├─ bodyPaths.front.ts          # { id, d }[]  ← Figma export'u buraya yapıştırılır
│  │  ├─ bodyPaths.back.ts
│  │  ├─ seedExercises.ts            # 25 seed hareket: TR ad, TR talimat/hata/ipucu, kas eşleşmesi
│  │  ├─ exercises.fedb.json         # script çıktısı (filtrelenmiş free-exercise-db)
│  │  └─ exerciseImages.ts           # script çıktısı: id → [require(0.jpg), require(1.jpg)]
│  ├─ services/                      # saf mantık, UI'sız, test edilebilir
│  │  ├─ streakService.ts (+ __tests__/streakService.test.ts)
│  │  ├─ dates.ts                    # yerel 'YYYY-MM-DD' yardımcıları (UTC yok)
│  │  ├─ sleep.ts                    # süre, gece yarısı, ortalama yatış saati
│  │  ├─ units.ts                    # ml↔bardak/L, adım↔km, kg↔lb
│  │  ├─ workout.ts                  # hacim, e1RM (Epley), PR, overload önerisi
│  │  ├─ steps.ts                    # 0.3'teki hibrit kaynak
│  │  ├─ notifications.ts
│  │  └─ backup.ts                   # JSON dışa/içe aktarma + doğrulama
│  ├─ stores/                        # zustand
│  │  ├─ useDayStore.ts              # seçili gün
│  │  ├─ useSettingsStore.ts         # settings tablosunun önbelleği
│  │  └─ useWorkoutStore.ts          # aktif antrenman + dinlenme timer'ı
│  └─ components/
│     ├─ ui/       PillButton, Chip, SegmentedControl, Card, Counter(+/-), IconButton, Sheet
│     ├─ RingGauge.tsx               # 270° açık halka, animasyonlu, glow
│     ├─ TrackerCard.tsx             # Su/Adım/Uyku bunun üzerine kurulu
│     ├─ DaySelector.tsx
│     ├─ FloatingTabBar.tsx
│     ├─ ActivityCalendar.tsx        # GitHub tarzı noktalar
│     ├─ StreakFlame.tsx
│     ├─ BodyMap/ BodyMap.tsx, MusclePath.tsx (memo), FlipContainer.tsx
│     └─ charts/  LineChartCard, BarChartCard (gifted-charts sarmalayıcısı değil, sadece ortak stil)
├─ assets/exercises/<id>/0.jpg, 1.jpg
├─ scripts/import-exercises.mjs      # free-exercise-db'den alt küme çekip assets'e kopyalar
├─ CREDITS.md
└─ PLAN.md
```

Kurallar: renk sadece `src/theme/colors.ts`'den; ekranlar repos/services'i çağırır, SQL sadece `repos/` içinde.

---

## 2. Veri modeli

Tarihler **yerel** `YYYY-MM-DD` metni (saat dilimi/DST hatası olmasın), zaman damgaları ISO metni. Ağırlık hep **kg**, su hep **ml**, adım hep **adım** saklanır; gösterim birimi ayardan.

| Tablo | Kolonlar | Not |
|---|---|---|
| `regions` | `id` PK, `name_tr`, `side` ('front'/'back'), `sort` | Ön kol iki bölge: `forearm_front`, `forearm_back` |
| `muscles` | `id` PK (= SVG path id), `name_tr`, `name_latin`, `region_id` FK, `description` | `side` bölgeden gelir (istediğin `muscles.side` kolonunu tekrar olmasın diye koymuyorum) |
| `exercises` | `id` PK, `name_tr`, `name_en`, `equipment` ('dumbbell'/'machine'/'bodyweight'/'barbell'/'cable'/'other'), `mode` ('reps'/'time'), `is_heavy` (120 sn dinlenme), `instructions_tr`, `mistakes_tr`, `tips_tr`, `instructions_en` (JSON dizi), `image_key` (gömülü görsel), `photo_uri` (kullanıcı fotoğrafı), `source` ('fedb'/'user'/'seed') | |
| `exercise_muscles` | `exercise_id`, `muscle_id`, `role` ('primary'/'secondary'); PK(exercise_id, muscle_id) | |
| `workout_templates` | `id` PK, `name`, `notes` | |
| `template_exercises` | `id` PK, `template_id` FK, `exercise_id` FK, `position`, `sets`, `rep_min`, `rep_max`, `duration_sec`, `rest_sec` (NULL = varsayılan), `per_side` (her bacak/taraf), `superset_group` (NULL veya aynı numara) | "Curl + kickback süperset" = aynı `superset_group`'lu 2 satır |
| `day_schedule` | `weekday` PK (0=Pzt…6=Paz), `kind` ('workout'/'rest'/'walk'), `template_id` FK NULL | |
| `workout_sessions` | `id` PK, `template_id`, `date`, `started_at`, `ended_at`, `status` ('active'/'done'/'abandoned') | Hacim/süre setlerden hesaplanır, saklanmaz |
| `session_sets` | `id` PK, `session_id` FK, `exercise_id`, `set_index`, `weight_kg`, `reps`, `duration_sec`, `completed_at` | "Önceki değer" = aynı hareketin son `done` oturumundaki setler |
| `habits` | `id` PK, `name`, `icon`, `weekdays` (bitmask 0-127), `position`, `archived_at` | Silme = arşiv (geçmiş istatistik bozulmasın) |
| `habit_logs` | `habit_id`, `date`; PK(habit_id, date) | Satır varsa yapılmış |
| `daily_trackers` | `id` PK, `type` ('water'/'steps'/…), `date`, `value`; UNIQUE(type, date) | Yeni takip = yeni `type`, şema değişmez |
| `tracker_settings` | `type` PK, `goal`, `display_unit`, `unit_size` | su: bardak ml (250); adım: adım uzunluğu cm (NULL = boy × 0.415); uyku: hedef dk, gösterim, hatırlatıcı saati |
| `sleep_logs` | `id` PK, `date` UNIQUE (uyanılan gün), `bedtime` 'HH:MM', `wake_time` 'HH:MM', `duration_min`, `quality` 1-5, `note` | süre = (kalkış − yatış + 1440) mod 1440 |
| `body_measurements` | `id` PK, `type` ('weight'/'height'/'chest'/'waist'/'arm'/'shoulder'), `value`, `date`; INDEX(type, date) | Profildeki "güncel kilo/boy" = son kayıt |
| `streak_days` | `date` PK, `status` ('completed'/'frozen'/'missed') | streakService'in çıktısı (önbellek) |
| `streak_state` | `id`=1, `current`, `longest`, `freezes_available`, `last_evaluated` | |
| `badges` | `id` PK, `milestone` UNIQUE, `earned_at` | 3/7/14/30/50/100/365 |
| `settings` | `key` PK, `value` (JSON) | isim, yaş, cinsiyet, hedef kilo, kg/lb, dinlenme süreleri, bildirim saatleri, streak kuralı, sabah uyku sorusu açık/kapalı |

**İlişkiler:** regions 1–N muscles; exercises N–N muscles (exercise_muscles); workout_templates 1–N template_exercises N–1 exercises; day_schedule N–1 workout_templates; workout_sessions 1–N session_sets N–1 exercises; habits 1–N habit_logs.

**Bölge sorgusu (tekrarsız, birincil önce):**
```sql
SELECT e.*, MIN(CASE em.role WHEN 'primary' THEN 0 ELSE 1 END) AS rank
FROM exercises e
JOIN exercise_muscles em ON em.exercise_id = e.id
JOIN muscles m ON m.id = em.muscle_id
WHERE m.region_id = ?
GROUP BY e.id
ORDER BY rank, e.name_tr;
```

---

## 3. Kas haritası

**Bölge → Parça (path id'leri)**

| Ön bölge | Parçalar |
|---|---|
| `chest` Göğüs | `chest_upper`, `chest_middle`, `chest_lower` |
| `shoulders` Omuz | `delt_front`, `delt_side` |
| `biceps` Biceps | `biceps_long`, `biceps_short` |
| `forearm_front` Ön kol | `forearm_inner` |
| `abs` Karın | `abs_upper`, `abs_lower`, `obliques` |
| `quads` Ön bacak | `quad_outer`, `quad_middle`, `quad_inner`, `adductors` |
| `neck` Boyun | `neck_front` |

| Arka bölge | Parçalar |
|---|---|
| `traps` Trapez | `trap_upper`, `trap_middle`, `trap_lower` |
| `back` Sırt | `lats`, `rhomboids`, `erector_spinae` |
| `rear_delts` Arka omuz | `delt_rear` |
| `triceps` Triceps | `triceps_long`, `triceps_lateral`, `triceps_medial` |
| `forearm_back` Ön kol | `forearm_outer` |
| `glutes` Kalça | `glute_max`, `glute_med` |
| `hamstrings` Arka bacak | `hamstring_outer`, `hamstring_inner` |
| `calves` Baldır | `gastrocnemius`, `soleus` |

Liste filtresi chip'leri bölgelere eşlenir: Sırt = traps+back, Omuz = shoulders+rear_delts, Bacak = quads+hamstrings, diğerleri birebir.

**Çizim ve davranış**
- `viewBox="0 0 200 420"`; gövde silüeti 1 path + her kas 1 path. Koordinatlar `bodyPaths.front.ts / back.ts` içinde `{ id, d }` dizisi → Figma'dan export ettiğinde sadece `d` stringlerini değiştirirsin; id'ler aynı kaldıkça başka hiçbir şey değişmez.
- Parça modu: her parça kendi tonu (#2A2523–#5C534C arası, `colors.ts`'de `muscleTone1..n` token), stroke = background, 1.5px.
- Bölge modu: bölgenin tüm path'leri aynı ton + **stroke = dolgu rengi** → çizgiler kaybolur, tek parça görünür; dokununca hepsi birlikte vurgulanır.
- Seçili: `primaryLight`; ikincil: `primaryLight` düşük opaklık. Seçimde kısa scale/opacity animasyonu.
- Çevir: reanimated `rotateY` 0→90° → ön/arka değiş → 90→0°.
- `MusclePath` `React.memo`; sadece `fill`'i değişen path yeniden çizilir.
- Küçük kaslar: path merkezine görünmez ≥44×44 pt dokunma alanı (ekran ölçeğine göre viewBox biriminden hesaplanır).

---

## 4. Seed program ve kas eşleşmesi

P = birincil, S = ikincil. "Ağır" (120 sn dinlenme) = ★, diğerleri 75 sn.

| Gün | Hareket | Set×Tekrar | P | S |
|---|---|---|---|---|
| Pzt — Üst Vücut A | ★ Dambıl bench press | 4×6-8 | chest_middle | chest_upper, chest_lower, delt_front, triceps (3 baş) |
| | ★ Tek kol dambıl row | 4×8-10 | lats, rhomboids | trap_middle, delt_rear, biceps_long, biceps_short |
| | ★ Ayakta omuz press | 3×8-10 | delt_front | delt_side, triceps, trap_upper |
| | Pullover | 3×10-12 | lats, chest_middle | triceps_long, chest_lower |
| | Hammer curl | 3×10-12 | biceps_long | forearm_inner, forearm_outer |
| | Baş üstü triceps extension | 3×10-12 | triceps_long | triceps_lateral, triceps_medial |
| Sal — Alt A + Karın | ★ Goblet squat | 4×8-10 | quad_outer, quad_middle, quad_inner, glute_max | adductors, erector_spinae |
| | ★ Romanian deadlift | 4×8-10 | hamstring_outer, hamstring_inner, glute_max | erector_spinae, adductors |
| | ★ Bulgarian split squat | 3×10 (her bacak) | quads, glute_max | glute_med, adductors, hamstrings |
| | Calf raise | 3×15 | gastrocnemius | soleus |
| | Lying leg raise | 3×12-15 | abs_lower | abs_upper, obliques |
| | Plank | 3×45 sn | abs_upper, abs_lower | obliques, delt_front, erector_spinae |
| Çar/Per/Cum | Yürüyüş günü | | | |
| Cmt — Üst Vücut B | ★ İncline dambıl press | 4×10-12 | chest_upper | delt_front, triceps |
| | ★ Dambıl row (iki kol) | 4×10-12 | lats, rhomboids, trap_middle | delt_rear, biceps, erector_spinae |
| | Lateral raise | 4×12-15 | delt_side | delt_front, trap_upper |
| | Reverse fly | 3×12-15 | delt_rear | rhomboids, trap_middle |
| | Dambıl shrug | 3×12-15 | trap_upper | trap_middle, forearm_outer |
| | Biceps curl ⟷ süperset | 3×12 | biceps_short, biceps_long | forearm_inner |
| | Triceps kickback ⟷ süperset | 3×12 | triceps_lateral | triceps_long, triceps_medial, delt_rear |
| Paz — Alt B + Karın | ★ Dambıl deadlift | 4×6-8 | glute_max, hamstrings, erector_spinae | quads, trap_upper, forearm_inner |
| | Walking lunge | 3×12 (her bacak) | quads, glute_max | glute_med, hamstrings, adductors, gastrocnemius |
| | Step-up | 3×10 (her bacak) | quads, glute_max | glute_med, hamstrings, gastrocnemius |
| | Russian twist | 3×20 | obliques | abs_upper, abs_lower |
| | Dambıl crunch | 3×15 | abs_upper | abs_lower, obliques |
| | Side plank | 3×30 sn (her taraf) | obliques | glute_med, abs_upper, abs_lower |

("quads" = üç quad parçası, "hamstrings" = iki hamstring parçası, "triceps" = üç baş.)

Bu 25 hareket free-exercise-db'deki karşılıklarına (ör. `Dumbbell_Bench_Press`, `Goblet_Squat`, `Hammer_Curls`) Aşama 1'de eşlenecek; birebir karşılığı olmayanlarda en yakın görsel kullanılır ve sana listelenir. Türkçe ad, adım adım talimat, sık hatalar ve ipuçları bu 25 hareket için elle yazılacak.

---

## 5. Hesaplama kuralları (önemli kenar durumlar)

**Streak (`streakService.ts`, saf fonksiyon):** girdi = gün listesi (tarih, o gün antrenman günü mü, antrenman bitti mi, adım hedefi tuttu mu, checklist oranı), kural, bugün → çıktı = gün durumları, current, longest, freezes, yeni rozetler.
- Antrenman günü: o günün `done` oturumu var. Dinlenme/yürüyüş: adım hedefi **veya** checklist ≥ %50. Kural ayardan değişebilir.
- Bugün henüz bitmediği için asla "missed" sayılmaz.
- Kaçırılan gün + dondurma hakkı varsa → `frozen` (seri kırılmaz, sayı artmaz). Hak yoksa seri 0.
- Her 7 ardışık tamamlanan günde +1 hak, en fazla 2.
- Tarih hesabı yerel `YYYY-MM-DD` ile, `Date` UTC'ye çevrilmeden; testler: gece yarısı geçişi, DST günü, saat dilimi değişimi, art arda 2-3 kaçırma, hak üst sınırı, kural değişimi.

**Uyku:** süre = (kalkış − yatış + 1440) mod 1440 dk; kayıt uyanılan güne. Ortalama yatış saati, gece yarısı etrafında doğru çıksın diye 12:00 öncesi saatlere +24s eklenerek hesaplanır (23:30 ve 00:30 ortalaması 00:00 olur, 12:00 değil). "Sabah sorusu": günün ilk açılışı 04:00–12:00 arası ve bugünün uyku kaydı yoksa.

**Antrenman:** hacim = Σ ağırlık × tekrar (tamamlanan setler); tahmini 1RM = Epley `w × (1 + r/30)`; PR = hareket bazında en yüksek ağırlık ve en yüksek e1RM. Overload önerisi: son oturumda tüm setler `rep_max`'a ulaştıysa → "ağırlığı artır" (dambılda +1–2 kg).

**Adım → km:** km = adım × adım uzunluğu (cm) / 100000; adım uzunluğu = elle girilmişse o, değilse son boy kaydı × 0.415.

**Yedekleme:** tüm tablolar `{ app, schemaVersion, exportedAt, tables }` JSON → paylaş. İçe aktarma: sürüm ve alan doğrulaması → tek transaction'da sil + yaz (hata olursa hiçbir şey değişmez). ⚠️ Kullanıcı fotoğrafları JSON'a girmez (ilk sürümde).

---

## 6. Ekran listesi

| Ekran | Yol | İçerik |
|---|---|---|
| Bugün | `(tabs)/index` | Avatar (→ Profil), "Selam, {isim}!", streak alevi, gün seçici, bugünün antrenmanı / yürüyüş kartı, Su + Adım + Uyku kartları, checklist (3/6), alışkanlık ekle |
| Program | `(tabs)/program` | 7 gün; her güne şablon veya dinlenme/yürüyüş; şablon listesi |
| Şablon düzenle | `template/[id]` | Hareket ekle, sürükle-bırak sırala, set/tekrar/süre/dinlenme/süperset |
| Kütüphane | `(tabs)/library` | Vücut haritası (Çevir, Bölge/Parça), chip + ekipman filtresi, arama, liste, "+ kendi hareketin" |
| Kas detay | `muscle/[id]` | Mini harita, TR + latin ad, açıklama, alt parçalar, hareketler (birincil önce), "Programıma ekle" |
| Hareket detay | `exercise/[id]` | Başlangıç/bitiş görseli (otomatik geçiş), harita, talimat/hata/ipucu, "Videoda izle", geçmiş + ağırlık grafiği |
| Hareket ekle | `exercise/new` | İsim, kaslar (P/S), fotoğraf, açıklama |
| Aktif antrenman | `workout/[sessionId]` | Setler (kg/tekrar, soluk önceki değer), tik, dinlenme halkası, kronometre, overload rozeti |
| Antrenman özeti | `workout/summary/[sessionId]` | Süre, toplam hacim, PR'lar |
| Takip geçmişi | `tracker/[type]` | Su/adım/uyku günlük grafik |
| Profil | `profile` | Bilgiler, kilo/BMI/değişim kartları, ölçüm türleri, rozet duvarı |
| Ölçüm | `measurement/[type]` | Grafik ↔ Tablo, Hafta/Ay/3 Ay/Yıl, hedef kesikli çizgi, kaydır-sil/düzenle |
| Streak | `streak` | Güncel/en uzun seri, aylık takvim (alev/buz/boş), kalan hak |
| Kutlama | `celebration` (modal) | Büyüyen alev, "🔥 12 gün!", hafta satırı |
| İstatistik | `(tabs)/stats` | Sekmeler: Antrenman / Vücut / Uyku / Günlük (su, adım, alışkanlık); dönem filtresi |
| Ayarlar | `settings` | İsim, kg/lb, dinlenme süreleri, bildirim saatleri, streak kuralı, sabah uyku sorusu, dışa/içe aktar |

**Bottom sheet'ler:** "+" hızlı ekleme (antrenman başlat, su, uyku, ölçüm, alışkanlık), tracker üç nokta menüsü, alışkanlık ekle/düzenle, "Dün gece nasıl uyudun?", "Programıma ekle" gün seçimi.

**Tab bar:** Bugün · Program · **[+]** · Kütüphane · İstatistik. Profil ana sayfa avatarından, Ayarlar profilden.

---

## 7. Aşamalar ve her aşamada nasıl test edilir

Her aşamada test: `npx expo start` → telefonda **Expo Go** ile QR okut (Expo Go'nun SDK sürümü projeyle aynı olmalı; mağazadaki son Expo Go = son SDK).

1. **Kurulum:** proje, bağımlılıklar, tema, floating tab bar, boş ekranlar, migration + seed, hareket import script'i ve görseller, streakService iskeleti + testleri (`npm test`). → Uygulama açılır, sekmeler gezilir, DB dolu.
2. **Ana sayfa:** gün seçici, bugünün antrenmanı, RingGauge + TrackerCard (Su/Adım/Uyku), üç nokta menüleri, birim değişimi, sabah uyku sheet'i, checklist + alışkanlık CRUD, adım kaynağı.
3. **Program + kütüphane:** planlayıcı, şablon editörü, kas haritası (ön/arka, bölge/parça, çevir), kas detay, hareket detay, kendi hareketin.
4. **Aktif antrenman:** set girişi, önceki değerler, dinlenme timer + titreşim + bildirim, kronometre, overload önerisi, özet + PR.
5. **Profil + streak:** ölçümler (grafik/tablo), BMI, rozetler, streak hesaplama bağlantısı, alev animasyonu, kutlama, streak sayfası, dondurma.
6. **İstatistik + bildirimler + yedek:** tüm grafikler, kas yoğunluk haritası, uyku–performans karşılaştırması, akşam streak bildirimi, yatma hatırlatıcısı, JSON dışa/içe aktarma. (Android ise burada dev build + Health Connect.)

---

## 8. Onayından önce cevabını istediğim 3 şey

1. **Telefonun Android mi iOS mu?** (Adım kaynağı kararı — 0.3)
2. **Kütüphane boyutu:** (a) sadece 25 seed hareket, (b) seed + free-exercise-db'deki tüm dambıl / makine / vücut ağırlığı hareketleri (birkaç yüz hareket, görsellerle tahminen onlarca MB; script toplam boyutu raporlar). Varsayılan önerim **(b)**; bu hareketlerin adları Türkçeye çevrilir, talimatları ise İngilizce kalır (Türkçe talimat sadece seed'lerde).
3. **Tab bar düzeni** yukarıdaki gibi uygun mu (Profil sekme yerine avatar)?
