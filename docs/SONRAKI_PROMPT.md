# Sonraki oturum promptu

> Bu dosyanın tamamını yeni oturuma ilk mesaj olarak yapıştır. Tek kaynak budur: proje özeti, kurallar, kod haritası (dosya yolları, imzalar, şema) ve görevler burada.
>
> **Oturuma not:** Bu dosyadaki bilgiler 2026-11-17 itibarıyla günceldir. Keşif için kod tabanını tarama, alt ajan açma, README/docs okuma. Sadece düzenleyeceğin dosyayı oku; buradaki bir bilgi koda uymazsa o dosyayı oku ve devam et. İş büyük: görevleri sırayla yap, her birini ayrı commit'le push et. Bağlam dolarsa kaldığın görevi bu dosyanın "İlerleme" bölümüne yaz ve commit'le.

## 1. Proje

MVM: Türkçe arayüzlü antrenman + günlük alışkanlık takip uygulaması.

- **Repo:** `huseyinbaranisik/MVM`.
- **Dallar:** çalışma dalı `feature/antrenman-uygulamasi`; `master` her zaman aynı commit'te tutulur.
- **Klasör:** `C:\Users\win\OneDrive\Masaüstü\Ekmek\MVM`.
- **Çatı:** Expo SDK 58, React Native 0.88, React 19, TypeScript, React Compiler açık. Import kısayolu `@/` = `src/`.
- **Rotalar:** Expo Router, `src/app/`, typed routes. Yeni rota eklenince tipleri yenile: `CI=1 timeout 50 npx expo start --port 8099`.
- **Veri:** Supabase projesi **MVM-EU** (`ureiashbziekfccmirhj`, Frankfurt).
  - Her tabloda RLS `user_id = auth.uid()` var, `user_id` varsayılanı `auth.uid()`.
  - Migration'lar `supabase/migrations/` altında; Supabase MCP `apply_migration` ile uygula.
  - Uyguladıktan sonra repodaki dosya adını sunucudaki sürümle eşle (`select version from supabase_migrations.schema_migrations`).
- **Tema:** `src/theme/colors.ts`.
  - `PALETTES` (3 renk: `bg`, `primary`, `highlight`, `light`) ve `derive()` ile türetilen `colors` tokenları. Diğer tokenlar `src/theme`'den gelir: `spacing`, `radius`, `type`.
  - Önemli renk anahtarları: `primary`, `primaryLight`, `accent`, `accentMuted`, `onPrimary` (ana renk dolgusunun üstündeki yazı/ikon), `surface`, `surfaceElevated`, `divider`, `textPrimary`, `textSecondary`, `neutral`, `overlay`.
  - Bileşende sabit renk kodu kullanma.
  - Seçili tema localStorage `mvm.theme` anahtarında; tema değişince uygulama yeniden başlar (`src/theme/select.ts`). Testi: `src/services/__tests__/theme.test.ts`.
- **Test:** Jest. Saf mantık `src/services/` altında, testleri `src/services/__tests__/` altında. Jest'te Reanimated, Supabase ve yerel modüller yüklenmez.

## 2. Kurallar

- **Ekrana açıklama veya yönlendirme cümlesi yazma** ("…için dokun", "sonra değiştirebilirsin" gibi). Yalnızca etiket, değer, kısa boş durum ("Kayıt yok.") ve işe yarar hata mesajı olur.
- Her görevden sonra `npx tsc --noEmit`, `npx expo lint` ve `npx jest` çalıştır. Ardından commit'le ve push et: `git push origin feature/antrenman-uygulamasi` ve `git push origin feature/antrenman-uygulamasi:master`.
- Yeni paket eklemeden önce `https://docs.expo.dev/versions/v58.0.0/` belgelerine bak ve `npx expo install` kullan.
- **Bitti demeden önce emülatörde dene:**
  - AVD `Medium_Phone_API_36.1`. adb `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`; Git Bash'te `MSYS_NO_PATHCONV=1` kullan.
  - Expo Go SDK 58 sürümü gerekir; eskiyse `CI=1 npx expo start --android` kurar.
  - Bağlantı: `npx expo start`, sonra `adb reverse tcp:8081 tcp:8081`, sonra `adb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081`.
  - Ekran görüntüsü `adb exec-out screencap -p > shot.png`, dokunma `adb shell input tap x y`, arayüz ağacı `adb shell uiautomator dump`.
  - Test hesabı git dışındaki `.env.test.local` dosyasında.
- **APK yalnızca `C:\dev\mvm` kopyasında derlenir;** yoldaki "ü" derlemeyi bozuyor.
  - Adımlar: `git pull`, sonra `npx expo prebuild --platform android`, sonra `android\gradlew.bat assembleRelease`. `ANDROID_HOME` ayarlı olmalı.
  - `android/local.properties` dosyasında iki satır olmalı: `sdk.dir=C:/Users/win/AppData/Local/Android/Sdk` ve `cmake.dir=C:/dev/cmake`. Prebuild dosyayı silerse yeniden yaz.
  - Çıktı: `android/app/build/outputs/apk/release/app-release.apk`.
  - GitHub'a yeni sürüm yayınlamadan önce kullanıcıya sor.
- **Android Fabric hatası:** sonradan eklenen arka plan `borderRadius`'u yok sayar ve kare çizilir. Çözüm: arka planı her zaman çiz ve opaklığını değiştir, ya da `key` ile yeniden oluştur.

## 3. Kod haritası (okumadan kullan)

**Veri katmanı**
- `src/db/supabase.ts`: `supabase` istemcisi, `must(r)` (hata fırlatır) ve `maybe(r)` (null olabilir).
- `src/db/bus.ts`: `notify(...tables)` ve `subscribe(fn(tables: Set))`; `'*'` tüm tablolar demek.
- `src/db/useDb.ts`: `useDb(query, deps, tables): T | undefined`. Verilen tablolar `notify` edilince sorguyu yeniden çalıştırır.
- `src/db/repos/settings.ts`:
  - `Settings` alanları: `profile: { name; age: number|null; sex: 'male'|'female'|null; targetWeightKg: number|null }`, `weightUnit`, `restSec`, `notifications`, `streakRule`, `morningSleepPrompt`, `lastSleepPrompt`, `startDate`, `onboarded`.
  - `DEFAULT_SETTINGS`.
  - `getSetting(key)`: satır yoksa varsayılanı döner.
  - `setSetting(key, value)`: `settings` tablosuna upsert eder, sonra `notify('settings')`.
- `src/db/repos/streak.ts`:
  - `STREAK_INPUT_TABLES`.
  - `evaluateStreak()` → `{ current, todayCompleted, fresh: number[] … }`; `badges` tablosuna yazar.
  - `getStreakState()`, `getStreakDays(from, to)`, `getBadges()`.
- `src/db/repos/trackers.ts`:
  - `TrackerType = 'water'|'steps'|'sleep'|'calories'`.
  - `getTrackerValue`, `addTrackerValue`, `getTrackerSettings(type)` (`{goal, …}` döner), `updateTrackerSettings`, `getTrackerHistory(type, from, to)`, `getLatestMeasurement(type)`.
- `src/db/repos/measurements.ts`: türler `'weight'|'height'`; `saveMeasurement(type, value, date)`, `getMeasurements(type)`. Boy buradan okunur.
- `src/db/repos/schedule.ts`:
  - `DayPlan {weekday, kind, templateId, templateName, …}`.
  - `getWeekPlan()`, `getDayPlan(weekday)`.
  - Sorgu: `weekday, kind, template_id, workout_templates(name, template_exercises(count))`.
- `src/db/repos/bootstrap.ts` (`ensureUserData`): ilk girişte `src/data/seedProgram.ts`'teki `seedTemplates`, `seedHabits` ve `walkDays` ile şablonları, alışkanlıkları ve 7 günlük `day_schedule`'ı yazar.

**Şema (ilgili tablolar)**
- `workout_templates(id, name, notes)`
- `template_exercises(template_id, exercise_id, position, sets, rep_min, rep_max, duration_sec, rest_sec, per_side, superset_group)`
- `day_schedule(weekday 0-6, kind 'workout'|'rest'|'walk', template_id)`, PK `(user_id, weekday)`
- `workout_sessions(id, template_id, date, started_at, ended_at, status 'active'|'done'|'abandoned')`
- `session_sets(id, session_id, exercise_id, set_index, weight_kg, reps, duration_sec, completed_at)`
- `habits(id, name, icon, weekdays, position, archived_at)`, `habit_logs(habit_id, date)`
- `daily_trackers(type, date, value)`, PK `(user_id, type, date)`; `tracker_settings(type, goal, display_unit, unit_size)`
- `sleep_logs(date, bedtime, wake_time, duration_min, quality, note)`
- `body_measurements(type, value, date)`
- `user_foods(name, kcal, protein, fat, carbs)`, `food_logs(date, name, grams, logged_at, …)`
- `streak_days(date, status 'completed'|'frozen'|'missed')`, `streak_state(current, longest, freezes_available)`, `badges(milestone, earned_at)`
- `settings(key, value jsonb)`, PK `(user_id, key)`

**Arayüz parçaları**

| Bileşen | Kullanım |
|---|---|
| `Screen` (`@/components/Screen`) | `{children}`: kaydırılabilir sayfa, alt bar boşluğu dahil |
| `TrackerCard` (`@/components/TrackerCard`) | `{title, icon, color, progress, value, caption, onMenu, onPress?, footer?, side?, layout?: 'square'\|'wide', resetKey?}`. `square` = `flex:1` yarım kart, `wide` = halka solda, `side` sağda. Aynı dosyada `Counter({onMinus, onPlus, minusLabel, plusLabel})` |
| `RingGauge` | `{size, stroke?, progress, color, trackColor?, children}` |
| `PillButton`, `SegmentedControl` (`@/components/ui/PillButton`) | `PillButton{label, onPress, active?, variant?, disabled?, style?}`, `SegmentedControl{options: {value, label}[], value, onChange}` |
| `PressableScale` (`@/components/ui/PressableScale`) | `Pressable` props'larına ek olarak basınca küçülür |
| `Sheet`, `SheetRow` (`@/components/ui/Sheet`) | `Sheet{visible, onClose, title?, children}`, `SheetRow{label, value?, onPress?}` |
| `NumberPrompt` (`@/components/ui/NumberPrompt`) | `{visible, title, initial?, suffix?, min?, quick?, onSubmit(n), onClose}` |
| `@/components/ui/overlays` | `confirm({title, message?, confirmLabel?, destructive?}) → Promise<boolean>`, `toast(msg)`, `pickTime(init)` |
| `@/components/ui/Skeleton` | `Skeleton`, `LoadingScreen`, `Appear{index, style?}` |
| `DraggableList` (`@/components/DraggableList`) | `{items, keyOf, rowHeight, renderRow(item, i), onReorder(keys)}`, tutamaç dahil |
| `Icon` (`@/components/Icon`) | `{name, size, color}`, Material Symbols adları |
| `BodyMap` (`@/components/BodyMap`) | Manken. `MapMode = 'region'\|'part'`; `region` modunda kaslar bölgeye göre `seamless` çizilir. Ayrıca `FlipView`, `useFlip` |
| Çizgi grafik | Ortak bileşen yok. `src/app/profile.tsx` (kilo) ve `src/app/tracker/[type].tsx` elle SVG çiziyor (`react-native-svg` kurulu) |

**Mevcut ekranlar**
- `src/components/FloatingTabBar.tsx`:
  - `TABS: Record<routeName, {label, icon}>`: index → Bugün (`home`), program → Program (`calendar_month`), library → Kütüphane (`fitness_center`), stats → İstatistik (`bar_chart`).
  - Seçili sekme rengi `colors.accent`.
  - Ortada `router.push('/quick-add')` açan "+" (`styles.plus`: 60×60, `marginTop: -28`, `primary` dolgu, `background` renginde 4px kenar). Sekmeler ikiye bölünüp "+" araya giriyor.
  - `TAB_BAR_HEIGHT = 68`. Props `{state, emitter, navigateToTab, insets}`, kaynak `expo-router/js-tabs`.
- `src/app/(tabs)/_layout.tsx`: `Tabs` sırası index, program, library, stats.
- `src/app/_layout.tsx:93`: `<Stack.Screen name="quick-add" …/>`. Bu rotanın dosyası `src/app/quick-add.tsx`.
- `src/app/(tabs)/index.tsx` (Bugün):
  - Başlık: `useDb` ile `name`, `onboarded`, `streak`; baş harfli avatar `router.push('/profile')` açar; yanında alev ve seri.
  - `Appear` sırası: `DaySelector`, `WorkoutCard`, "Günlük check-in" başlığı + yan yana `WaterCard`/`StepsCard`, `CalorieCard`, `SleepCard`, `Checklist`. Kartların hepsi `{date}` alır.
- `src/components/home/WorkoutCard.tsx`: günün tek planını gösteriyor (`getDayPlan`).
- `src/components/home/CalorieCard.tsx:105`: `router.push('/profile')`.
- `src/components/home/Checklist.tsx:17`: `HABIT_ICONS` (Material Symbols ikonları, emoji değil).
- `src/app/profile.tsx` (243 satır), yukarıdan aşağı:
  - Geri oklu başlık, ad `TextInput`.
  - `SheetRow "Yaş"` (satır 91); sürekli görünen cinsiyet `SegmentedControl` (satır 93).
  - `Tile` Kilo/Boy/BMI (satır 102–104), kilo grafiği.
  - Seri kartı, "Rozetler" kartı (`getBadges`, `MILESTONES`; satır 152).
  - Tema seçici (satır ~165), "Çıkış yap" (satır 179).
- `src/app/streak.tsx`: seri ekranı.
- `src/components/StreakSync.tsx`: görünmez bileşen. Açılışta, uygulamaya dönünce ve `STREAK_INPUT_TABLES` yazımlarında `evaluateStreak()` çalıştırır; yeni rozette `toast('🔥 N günlük seri! Yeni rozet kazandın.')` gösterir; akşam hatırlatmasını kurar.
- `src/app/(tabs)/stats.tsx`: sadece "Yakında" yazıyor (25 satır).
- `src/app/(tabs)/library.tsx` (118 satır):
  - `BodyMap` ve Bölge/Parça `SegmentedControl` (satır 49).
  - Kas grubu çipleri `filterGroups` (`src/data/muscleMap.ts`: `regions`, `muscles`, `filterGroups {label, regionIds}`) ile çiziliyor; tek seçim, `group` state'i.
- `src/components/exercise.tsx:87`: hareket eklerken "Hangi güne eklensin?" sheet'i.
- Antrenman ekranı `src/app/workout/[sessionId].tsx`:
  - Dinlenme çubuğu satır ~221–241; −15/+15 `adjustRest` çağırıyor.
  - `src/stores/useWorkoutStore.ts:24-27` `adjustRest`, `restTotal`'ı da delta kadar değiştiriyor. Bu yüzden yüzde neredeyse sabit kalıyor (G10'da düzeltilecek).
- Antrenman özeti `src/app/workout/summary/[sessionId].tsx` (95 satır): `Stat` "Toplam hacim" (`volume(sets)`, `src/services/workout.ts`) ve PR'lar (`findPRs`).
- Yiyecek kataloğu `src/data/foods.ts`: `SeedFood = [name, kcal, protein, fat, carbs]`, 100 g başına; birim ve kategori yok.
- Hareket görselleri:
  - `src/data/exerciseImages.ts`: `require('../../assets/exercises/<id>/0.jpg')`.
  - `assets/exercises/` 256 klasör, **32 MB**.
  - Hareket açıklamaları `src/data/exercises.fedb.json` ve `seedExercises.ts` içinde; bir kısmı İngilizce.
- Fotoğraf seçme örneği `src/app/exercise/new.tsx:36`.
- `expo-image` ve `expo-image-picker` kurulu.

## 4. Görevler (sırayla; her biri ayrı commit)

### G1. Alt bar: "+" kalkıyor, Profil ortada ve yükselen seçili sekme
- Sil: `FloatingTabBar`'daki `plus` ve onu araya ekleyen mantık, `src/app/quick-add.tsx`, `_layout.tsx:93`.
- Taşı: `src/app/profile.tsx` → `src/app/(tabs)/profile.tsx`. Geri oklu başlığı kaldır.
- Sekmeler:
  - `TABS`'a `profile: { label: 'Profil', icon: 'person' }` ekle.
  - Sıra: index, program, **profile**, library, stats.
- Yönlendirme: `router.push('/profile')` → `router.navigate('/profile')`. İki yer var: Bugün avatarı ve CalorieCard.
- **Seçili sekme, bugünkü "+" gibi havalanır:**
  - İkon bardan yukarı çıkar: `translateY ≈ -22`.
  - 56×56 yuvarlak `colors.primary` dolgu, `colors.background` renginde 4px kenar, ikon `colors.onPrimary`.
  - Geçiş Reanimated `withSpring` ile yapılır (translateY ve scale). Seçili olmayan sekmeler düz ikon + etiket.
  - Fabric hatası nedeniyle yuvarlak her sekmede hep çizili kalır; seçili değilken `opacity: 0`.

### G2. Tema: "Bej & Bordo" kalkıyor, toplam 15 tema
- `colors.ts`'teki `BORDO` (varsayılan bej/bordo) tema listesinden kalkar.
  - Varsayılan tema `sarap` olur.
  - Kayıtlı değer `'bordo'` ise `sarap`'a düş.
  - `BORDO` sabitindeki `success`, `warning`, `ice`, `neutral` değerleri sabit token olarak kalsın; `derive()` bunları kullanıyor.
- 8 mevcut palete 7 yeni ekle, toplam 15. Yaklaşık yarısı açık, yarısı koyu olsun. Hepsi 3 renk (`bg`, `primary`, `highlight`) ve birbirinden ayırt edilebilir.
- Kontrast testi ekle: `theme.test.ts` içinde her palet için `textPrimary`/`background` kontrastı en az 4.5:1 ve `onPrimary`/`primary` kontrastı en az 3:1 olmalı.
- Profil/Ayarlar'daki tema seçici yeni listeyi göstersin.

### G3. İlk kurulumda boş program
- Test için eklenmiş hazır programlar (Sırt B, Alt A …) yeni kullanıcıya **yazılmaz**.
- Haftanın 7 günü "atanmamış" başlar.
- Şema değişikliği:
  - Migration: `day_schedule.kind` check'ine `'none'` ekle, varsayılanı `'none'` yap.
  - `bootstrap.ts`: `seedTemplates` döngüsünü kaldır, günleri `kind: 'none', template_id: null` ile yaz.
  - `seedHabits` kalsın.
- Arayüz:
  - Program ve Bugün ekranları `'none'` günü boş durum olarak gösterir: "Plan yok." + plana ekleme düğmesi.
  - `DayPlan['kind']` tipini ve kullanıldığı switch'leri güncelle.
- Mevcut kullanıcının verisine dokunma.

### G4. Bir güne birden fazla program
- Bir günde birden fazla öğe olabilir, örneğin Yürüyüş + Üst A.
- Migration:
  - Yeni tablo `day_schedule_items(user_id, weekday, position, kind 'workout'|'walk', template_id)`; PK `(user_id, weekday, position)`; RLS ve `user_id` indeksi diğer tablolardaki gibi.
  - Mevcut `day_schedule` satırlarını buraya taşı; `'rest'` ve `'none'` günler satırsız kalır. Sonra `day_schedule`'ı kaldır.
  - `STREAK_INPUT_TABLES` ve seri hesabını yeni tabloya uyarla.
- `schedule.ts`: `getDayPlan(weekday)` → `DayItem[]`; ekleme, silme ve sıralama fonksiyonları.
- Program ekranı: gün başına öğe listesi, "Ekle" ve kaldırma.
- `WorkoutCard`: tek kutu, içinde yatay sayfalı (`pagingEnabled`) kaydırma. Altta Instagram çoklu gönderisindeki gibi nokta göstergesi; nokta, öğe 2+ ise görünür.
- Kütüphanede hareket ekleme (`src/components/exercise.tsx:87`):
  - Başlık "Hangi güne eklensin?" yerine **"Plana ekle"** olur.
  - Önce şablon seçilir (ya da yeni şablon açılır), hareket o şablonun sonuna eklenir.

### G5. XP, seviye ve rank; rozetler gizleniyor
- XP tablosu yok; her seferinde veriden hesaplanır. Geçmiş sayılır, aynı iş iki kez sayılmaz.
- **Kurallar** (`XP_RULES`, tek yer):
  - `status='done'` olan oturumdaki her set: **+10**.
  - Her `habit_logs` satırı: **+5**.
  - Su hedefinin tuttuğu her gün **+10**, adım hedefinin tuttuğu her gün **+10**. Koşul `daily_trackers.value >= tracker_settings.goal`. Bugünkü hedef geçmişe de uygulanır; bu kısayolu yorumda belirt.
  - `streak_days` tarih sırasıyla gezilir. `completed` sayacı +1 artırır ve **5 × min(sayaç, 10)** XP verir. `frozen` sayacı korur ama XP vermez. `missed` sayacı sıfırlar.
- **Seviye:** 1'den başlar; n → n+1 için **100 + 50 × (n − 1)** XP gerekir.
- **Rank** seviye aralığına göre ad ve renk alır: 1–4 Çaylak, 5–9 Demir, 10–14 Bronz, 15–19 Gümüş, 20–29 Altın, 30–39 Elmas, 40+ Efsane. `RANKS` dizisinde tutulur.
- `src/services/xp.ts` (saf):
  - `XP_RULES`, `RANKS`.
  - `streakXp(statuses)`, `totalXp({sets, habitLogs, waterDays, stepDays, streak})`.
  - `levelFromXp(xp) → { level, intoLevel, needed, rank }`.
  - Testleri `src/services/__tests__/xp.test.ts`.
- `src/db/repos/xp.ts` → `getXpSources()`:
  - Setler: `supabase.from('session_sets').select('id, workout_sessions!inner(status)', { count: 'exact', head: true }).eq('workout_sessions.status', 'done')`.
  - `habit_logs` için `count: 'exact', head: true`.
  - `daily_trackers` (`type in (water, steps)`) ve `tracker_settings`.
  - `streak_days`, tarihe göre sıralı.
  - `useDb` tabloları: `session_sets`, `workout_sessions`, `habit_logs`, `daily_trackers`, `tracker_settings`, `streak_days`.
- Gösterim:
  - Profil üst kartında rank adı, `Sv 5`, ilerleme çubuğu ve `340 / 500 XP`.
  - Seri ekranında (`src/app/streak.tsx`) aynı kartın küçük hali.
  - Bugün avatarının köşesinde seviye rozeti.
- Seviye atlama: `StreakSync` döngüsünün sonunda hesaplanan seviyeyi localStorage `mvm.lastLevel` ile karşılaştır.
  - Seviye arttıysa `toast('Seviye N!')`.
  - İlk açılışta değeri sessizce kaydet.
- Rozetler:
  - Profil'deki "Rozetler" kartını ve StreakSync'teki rozet bildirimini kaldır.
  - `badges` tablosu ve `evaluateStreak` içindeki yazım kalsın; yanına tek satır yorum: ileride başarım sistemi için.

### G6. Profil yeniden; Ayarlar ayrı ekran
- **Profil** (sekme), yukarıdan aşağı:
  1. Üst kart:
     - Avatar (G7).
     - Ad (satır içi düzenleme).
     - Tek satır özet `25 yaş · Erkek · 188 cm`; olmayan parça yazılmaz.
     - Rank, seviye ve XP çubuğu.
     - Kalem ikonu: "Bilgiler" sheet'ini açar. İçinde Yaş, Boy, Hedef kilo (`SheetRow` → `NumberPrompt`) ve yalnızca burada Cinsiyet `SegmentedControl` var.
  2. Seri kutusu: güncel seri, en uzun seri, dondurma hakkı; dokununca `/streak`.
  3. Mini takvim, içinde bulunulan ay:
     - Her gün küçük bir hücre.
     - Hücrede o gün ne yapıldığını gösteren işaretler: antrenman, su hedefi, adım hedefi, alışkanlık.
     - Seri durumu renkle: completed / frozen / missed.
     - Bir güne dokununca o günün özeti sheet'te açılır.
     - Takvim mantığı saf fonksiyon ve test edilir.
  4. Kilo/Boy/BMI kutuları; G12 grafiklerine bağlantı.
  5. Satırlar: "Ana ekran düzeni" (G8) ve "Ayarlar".
- **Ayarlar** (yeni rota `src/app/settings.tsx`):
  - Tema seçici, profilden taşınır.
  - Dil (G14).
  - Bildirimler: seri hatırlatma saati, yatma hatırlatması.
  - Ağırlık birimi, dinlenme süreleri, sabah uyku sorusu.
  - Gizlilik (G15): verileri dışa aktar, hesabı sil.
  - Çıkış yap.
- Profilden kaldırılacaklar: "Yaş" satırı, sürekli görünen cinsiyet seçimi, tema seçici, çıkış.

### G7. Profil fotoğrafı
- Migration:
  - Özel `avatars` bucket'ı: `insert into storage.buckets (id, name, public) values ('avatars','avatars',false) on conflict do nothing;`
  - `storage.objects` için select, insert, update ve delete politikaları, hepsi `bucket_id='avatars' and (storage.foldername(name))[1] = (select auth.uid())::text` koşuluyla.
- `Settings.profile` yeni alanlar: `avatarPath: string|null`, `avatarUpdatedAt: number|null`. Okurken `{...DEFAULT_SETTINGS.profile, ...row}` ile birleştir.
- Yükleme:
  1. Fotoğraf seç: `allowsEditing: true, aspect: [1,1], quality: 0.7`.
  2. `fetch(uri).arrayBuffer()`.
  3. `storage.from('avatars').upload(`${uid}/avatar.jpg`, buf, { contentType: 'image/jpeg', upsert: true })`.
  4. `setSetting('profile', …)`.
- Gösterim: `createSignedUrl(path, 86400)` ve `expo-image`; önbellek anahtarı `avatarUpdatedAt`.
- Ortak bileşen `src/components/Avatar.tsx` (`{size, level?}`):
  - Fotoğraf yoksa baş harfi gösterir.
  - Bugün ekranı ve Profil kullanır.
  - Avatara dokununca sheet: "Fotoğraf seç", fotoğraf varsa "Fotoğrafı kaldır" (`confirm` ile).

### G8. Düzenlenebilir ana ekran
- `src/services/homeLayout.ts` (saf, testli):
  - `HomeCardId = 'workout'|'water'|'steps'|'calories'|'sleep'|'checklist'`.
  - `HomeItem = {id, size: 'small'|'large'}`.
  - `RESIZABLE = ['water','steps','calories','sleep']`.
  - `DEFAULT_LAYOUT`: workout L, water S, steps S, calories L, sleep L, checklist L.
  - `sanitize(raw)`: bilinmeyen ve tekrarlanan kartları ayıklar, izin verilmeyen boyutu `large` yapar, boş liste gelirse varsayılanı döner.
  - `toRows(items)`: art arda iki küçük kart bir satır olur.
- `Settings.homeLayout` (varsayılan `DEFAULT_LAYOUT`, okurken `sanitize` uygulanır).
- Kartlar:
  - `WaterCard`, `StepsCard`, `CalorieCard` ve `SleepCard` `size` prop'u alır: `small` → `layout="square"`, `large` → `layout="wide"`.
  - Su/adım büyükken `Counter` `side` alanına geçer.
  - Kalori küçükken halka + kalan kcal; uyku küçükken halka + süre.
- Bugün ekranı:
  - Başlık ve `DaySelector` sabit.
  - Kartlar `toRows` sırasıyla dizilir. Tek kalan küçük kart yarım genişlikte kalır, yanına boş `flex:1` konur.
  - "Günlük check-in" başlığı kalkar.
- Düzen ekranı `src/app/home-layout.tsx`:
  - Görünen kartlar `DraggableList` ile sıralanır. Her satırda ad, izin varsa Küçük/Büyük seçimi ve kaldır düğmesi.
  - Son kart kaldırılamaz.
  - Gizli kartlar altta listelenir, her biri "Ekle" ile geri gelir.
  - "Varsayılana dön" (`confirm` ile).
  - Kart adları: Antrenman, Su, Adım, Kalori, Uyku, Görevler.

### G9. Ayrıntılı antrenman özeti
- Özet ekranı, `src/app/workout/summary/[sessionId].tsx` ve hesaplar `src/services/workout.ts` içinde (saf, testli):
  - Süre, tamamlanan set ve toplam tekrar.
  - **Toplam hacim** = Σ ağırlık × tekrar. Etiketin yanında bilgi ikonu olsun; dokununca kısa tanım sheet'i açılır. Bu, kullanıcının "toplam hacim ne" sorusuna cevap.
  - Hareket başına satır: set sayısı, en iyi set, hacim, PR rozeti.
  - Kas grubuna göre hacim dağılımı: yatay çubuklar ya da `BodyMap` ısı haritası.
  - Önceki aynı şablon oturumuyla kıyas: hacim ve süre farkı, ↑/↓.
  - Kazanılan XP (G5).

### G10. Dinlenme zamanlayıcısı ±15 sn
- Hata: `useWorkoutStore.adjustRest`, `restTotal`'ı da delta kadar değiştiriyor. Bu yüzden çubuğun yüzdesi neredeyse hiç değişmiyor.
- Düzeltme:
  - −15 yalnızca `restEndsAt`'i azaltır, `restTotal` sabit kalır.
  - +15'te `restTotal = max(restTotal, kalan)` olur; çubuk %100'ü aşmaz.
  - Yeni bitiş anı en az `now + 1 sn`.
- Hissedilirlik:
  - Çubuk genişliği `withTiming` (200 ms) ile animasyonlu değişir.
  - Kalan süre metni kısa bir ölçek "pop"u yapar.
  - Düğmede `expo-haptics` hafif titreşim verir; paket yoksa `npx expo install expo-haptics`.
- Mantık saf fonksiyona çıkar: `adjustRestState(state, delta, now)`, testi yazılır.

### G11. İstatistik ekranı
- `src/app/(tabs)/stats.tsx` sıfırdan yazılır.
- Ortak çizgi grafik bileşeni `src/components/LineChart.tsx`:
  - `{points: {date, value}[], color, goal?, unit}`.
  - Profil'deki ve `tracker/[type].tsx`'teki elle yazılmış SVG grafikler de buna geçer.
  - Dokununca değer etiketi gösterir.
- Aralık seçimi `SegmentedControl` ile: 7 gün / 30 gün / 90 gün / 1 yıl.
- Kartlar:
  - Kilo ve boy (günlük, `body_measurements`).
  - Su, adım, kalori (`food_logs` günlük toplamı), uyku süresi. Hedef çizgisi kesik çizgiyle gösterilir.
  - Haftalık antrenman sayısı ve toplam hacim (çubuk).
  - XP birikimi.
- Her kartta son değer, ortalama ve değişim gösterilir. Veri yoksa "Kayıt yok."

### G12. Kilo ve boy günlük takip
- Profil ve İstatistik'te kilo/boy grafikleri `LineChart` ile günlük noktalar gösterir.
- "Bugün ekle" ile `saveMeasurement` çağrılır; aynı gün tekrar girilirse değer güncellenir (unique `(user_id, type, date)`).

### G13. Kalori: birim ve kategori
- `src/data/foods.ts` yeni biçim: `SeedFood = [name, kcal, protein, fat, carbs, unit: 'g'|'ml', category]`, değerler 100 g veya 100 ml başına.
  - Kategoriler: Et & Tavuk, Balık, Süt & Yumurta, Tahıl & Unlu, Baklagil, Sebze, Meyve, Kuruyemiş, İçecek, Tatlı & Atıştırmalık, Hazır Yemek.
  - Sıvılar (süt, ayran, meyve suyu, kola, …) `ml` birimine geçer.
- Migration: `user_foods` ve `food_logs` tablolarına `unit text not null default 'g'` ve `category text`; `food_logs.grams` → `amount` olarak yeniden adlandırılır.
- Kalori sheet'i:
  - Arama üstünde kategori çipleri.
  - Miktar girişinde birim görünür (g/ml).
  - Kullanıcı yiyecek eklerken birim ve kategori seçer.
- `filterFoods` (`src/services/nutrition.ts`) kategori filtresi alır; testleri güncellenir.

### G14. Kütüphane ve manken filtresi
- **Bölge/Parça ayrımı belirgin olsun:**
  - Bölge modu tüm bölgeyi tek düz renk alan olarak çizer: kas sınırı yok, şişirilmiş kenar yok. Bölgenin kasları aynı dolgu ile çizilir ve iç `stroke` kaldırılır.
  - Parça modu her kası ayrı çizer ve sınırları gösterir.
  - Değişiklik `BodyMap.tsx` içinde, `seamless` dalında yapılır.
- **Seçim senkronu:**
  - Mankende bir bölgeye veya kasa dokununca aşağıdaki kategori çipi otomatik seçilir ve o kas grubu mankende `colors.primary` ile boyanır.
  - Çipten seçince manken de boyanır.
- **Kategoriler moda göre değişir:**
  - Bölge modunda çipler `filterGroups` ile aynı (Göğüs, Sırt …).
  - Parça modunda çipler kas parçalarıdır (Üst göğüs, Alt göğüs, Arka kol …), kaynak `muscles`.
- Çok seçim:
  - Seçilen birden fazla kategori **hepsini birlikte çalıştıran** hareketleri gösterir: kesişim, birincil + ikincil kaslar dahil.
  - Sonuç yoksa: "Aradığınız kriterlere uygun hareket bulunamadı."
- Parça modunda çip sayısı fazla:
  - Çip satırının en sağına genişlet düğmesi (`tune` ya da `expand_more`) konur.
  - Düğme tüm kategorileri çoklu seçimli ızgara olarak bir `Sheet`'te açar.
- Mankenin sağ üstünde "Filtreyi sıfırla" düğmesi (ikon `filter_alt_off`); yalnızca filtre varken görünür.
- Filtre mantığı saf fonksiyon olarak `src/services/catalog.ts` içine konur ve test edilir.

### G15. Günlük görevlere emoji
- `Checklist.tsx`'teki `HABIT_ICONS` (Material Symbols) yerine emoji seçici gelir.
  - Yaklaşık 48 emoji, kategorili: spor, sağlık, beslenme, zihin, ev, iş.
  - `habits.icon` emoji metnini tutar.
- Eski ikon adları için geriye uyum: değer bir Material Symbols adıysa `Icon` ile çizilir, değilse `Text` ile.

### G16. İngilizce dil desteği
- Kurulum:
  - `npx expo install expo-localization`.
  - `src/i18n/` altında `tr.ts`, `en.ts` ve `t(key, params?)`.
  - Basit sözlük; kütüphane ekleme.
- Dil `Settings.language: 'tr'|'en'|'system'` alanında tutulur. Ayarlar'dan değişir; değişince uygulama yeniden yüklenir (temadaki gibi).
- Ekranlardaki tüm sabit metinler `t()`'ye taşınır.
- Hareket adları ve açıklamaları:
  - Katalog alanları `nameTr`/`nameEn` ve açıklama TR/EN olur.
  - Şu an İngilizce kalmış Türkçe açıklamalar Türkçeye çevrilir.
- Tarih biçimlendirme (`src/services/dates.ts`) dile göre yapılır.
- Bir test: `en` ve `tr` sözlüklerinde aynı anahtarlar olmalı.

### G17. Giriş / kayıt ekranı yenileniyor
- Dosya `src/components/SignIn.tsx`, baştan tasarlanır.
- Ayrı "Giriş yap" / "Kayıt ol" sekmeleri.
- Alanlar:
  - E-posta: klavye tipi, otomatik doldurma (`textContentType`, `autoComplete`).
  - Şifre: göster/gizle düğmesi.
  - Kayıtta şifre tekrar alanı ve şifre gücü göstergesi.
- Doğrulama:
  - Hatalar alanın altında kısa Türkçe mesajla gösterilir; Supabase hata kodları Türkçeye çevrilir.
  - Yükleniyor durumu düğmede gösterilir.
- "Şifremi unuttum": `supabase.auth.resetPasswordForEmail`.
- Klavye açılınca form görünür kalır.
- Logo ve uygulama adı üstte. Tema renklerine uyumlu.
- Açıklama cümlesi yazılmaz.

### G18. Kullanıcı verisinin gizliliği
- Supabase MCP `get_advisors` (security + performance) çalıştırılır ve bulunan sorunlar düzeltilir. Her tabloda RLS açık olmalı ve politikalar `(select auth.uid())` biçiminde yazılmalı.
- İstemci tarafı:
  - Oturum anahtarı `expo-secure-store`'a taşınır: Supabase `auth.storage` için SecureStore adaptörü. Paketi `npx expo install` ile kur.
  - `console.log`/`console.warn` çağrılarında kişisel veri (e-posta, kilo vb.) olmamalı.
- Ayarlar → Gizlilik:
  - **Verileri dışa aktar**: tüm tablolar JSON olarak, `expo-sharing` ile paylaşılır.
  - **Hesabı sil**: `confirm` ile onay alınır. Kullanıcının bütün satırlarını, avatarını ve auth kullanıcısını silen bir `security definer` RPC ya da Edge Function çağrılır. Sonra çıkış yapılır.
- Profil fotoğrafı bucket'ı özel kalır (G7).

### G19. APK boyutu (148 MB)
- Önce ölç: `C:\dev\mvm`'de APK'yı zip olarak aç ve en büyük kalemleri listele (`lib/<abi>`, `assets`, `res`).
- Uygula (SDK 58 belgelerinden doğrula, `expo-build-properties` ile):
  - Yalnızca `arm64-v8a` mimarisi (`android.buildArchs` ya da gradle `reactNativeArchitectures`). Tek başına büyük kazanç beklenir.
  - R8 küçültme ve kaynak budama: `enableMinifyInReleaseBuilds`, `enableShrinkResourcesInReleaseBuilds`.
  - `assets/exercises` (32 MB, 512 jpg) görselleri WebP'ye (kalite 75) dönüştürülür ve en fazla 600 px genişliğe indirilir. `src/data/exerciseImages.ts` güncellenir. README görselleri (`assets/*.gif`, `assets/src`) uygulama paketine girmiyorsa dokunma.
  - Kullanılmayan paketleri `npx expo-doctor` ve `package.json` incelemesiyle temizle.
- Sonuç tablosu: önce/sonra boyut ve hangi adımın ne kazandırdığı. Hedef: 60 MB'ın altı.

### G20. Doğrulama ve teslim
1. `tsc`, `lint` ve `jest` temiz.
2. Emülatörde her görevin kabulünü dene. En az bir koyu ve bir açık temada, Türkçe ve İngilizce bak.
3. Commit atıp iki dala push et.
4. APK'yı `C:\dev\mvm`'de derle, `adb install -r` ile kur ve dene. Kullanıcı onaylarsa yayınla: `gh release create v1.1.0 <apk> --target master --title "v1.1.0"`.
5. README'yi İngilizce ve Türkçe güncelle:
   - Ekle: yeni özellikler, 15 tema, dil desteği, APK boyutu.
   - Kaldır: rozet ve "hızlı ekle" ifadeleri.
   - Görseller değiştiyse `python tools/render_figures.py` çalıştır.

## 5. Varsayılan kararlar (kullanıcıya sorma; bitince bildir)
- XP geçmiş veriden hesaplanır. İstenmezse yalnızca `startDate` sonrası sayılır.
- XP miktarları, seviye eğrisi ve rank adları `XP_RULES`/`RANKS` içinde, tek yerden ayarlanır.
- Yeni varsayılan tema `sarap`.
- İlk kurulumda alışkanlık örnekleri kalır; yalnızca programlar ve gün atamaları boş başlar.
- Tek kalan küçük kart yarım genişlikte kalır.
- Çok seçimli kas filtresi kesişim (VE) mantığıyla çalışır.

## İlerleme
- [x] G1 alt bar (a6d1270)
- [x] G2 temalar: Bordo & Bej kalktı; kullanıcının verdiği 7 palet eklendi, toplam 15, kontrast testi (7fbfa36)
- [x] G3+G4 `day_schedule_items` (migration 20261117091548), boş ilk kurulum, kaydırmalı antrenman kartı, "Plana ekle" (927cb03). Eski `day_schedule` tablosu v1.0.0 APK için duruyor; v1.1.0 yayınlanınca sil.
- [x] G5 XP/seviye/rank (3dc7527)
- [x] G6+G7+G8 profil, Ayarlar (`src/app/settings.tsx`), avatar (migration 20261117092614), ana ekran düzeni (7fbfa36). Fotoğraf yükleme emülatörde denenmedi (galeri boş).
- [x] G9+G10 ayrıntılı özet, ±15 düzeltmesi
- [x] G11+G12 İstatistik ekranı (XP birikim grafiği yapılmadı)
- [x] G13 kalori birim/kategori (migration 20261117094432; `food_logs.grams` adı APK uyumu için değişmedi)
- [x] G14 kütüphane: manken↔çip senkronu, bölge/parça çipleri, çoklu seçim (VE), açılır parça listesi, filtreyi sıfırla
- [x] G15 emoji
- [x] G17 giriş/kayıt ekranı (`src/components/SignIn.tsx`, doğrulamalar `src/services/auth.ts`). Emülatörde görsel olarak denenmedi: test hesabından çıkış/giriş gerekiyor.
- [x] G18 gizlilik: Ayarlar → Verilerimi dışa aktar (JSON, denendi), Hesabı sil (`delete_my_account` RPC, migration 20261117095829; denenmedi). Oturum expo-sqlite localStorage'da kaldı (SecureStore 2 KB sınırı Supabase oturumuna yetmiyor). Supabase panelinde "Leaked password protection" kapalı: kullanıcı açmalı.
- [x] G19 APK: yalnızca arm64-v8a, R8 + kaynak budama (expo-build-properties), görseller WebP (32→11 MB), sürüm 1.1.0
- [x] README güncellendi (Şekil 5 hâlâ eski dokuz temayı gösteriyor)
- [ ] **G16 İngilizce dil desteği: yapılmadı.** Bir sonraki oturumun ilk işi. Ayrıca XP birikim grafiği (G11) ve tema/README görsellerinin yenilenmesi kaldı.
- Not: Metro OneDrive klasöründe dosya değişikliğini kaçırıyor; emülatörde denerken `npx expo start --clear` ile yeniden başlat.
- [x] v1.1.0 ve v1.2.0 GitHub'da yayınlandı. v1.2.0: Health Connect adımları (`src/services/healthConnect.ts`, `stepSync.ts`), ana ekran widget'ı (`src/widget/`, giriş `index.ts`; widget dosyalarında `'use no memo'` şart), hareket ilerleme grafiği. Widget'ın oturum açık hali ve Health Connect bağlantısı emülatörde denenmedi.
- [x] v1.3.0: bölge mankeni (`src/data/bodyRegions.ts`, `scripts/build-body-regions.py`), istatistik/profil yenilemesi, seviye yolu (`src/app/level.tsx`, 1–100, dik), her 4 seviyede bir dondurma hakkı (`settings.levelRewards`, `freezesBetween`, `computeStreak` grants), 10 şablon sınırı (uygulama + `workout_templates_limit` tetikleyicisi), sürükle-bırak ana ekran düzeni, ses efektleri (`src/services/sounds.ts`, expo-audio), anında yansıyan dokunuşlar (`useOptimistic`), yeni ilk açılış (isim, yaş, boy, kilo), görev silme modu, logo (`tools/make_logo.py`, `src/components/Logo.tsx`) ve özel yükleme ekranı, 3×1/3×2/4×2 widget. Widget'ın oturum açık hali ve seviye ödülü bildirimleri gerçek kullanımda denenmedi.
- Not: emülatörde denemek için `gradlew assembleRelease -PreactNativeArchitectures=x86_64` ile ayrı test APK'sı derle; yayın APK'sı yalnızca arm64.
- Kullanıcı öğünler, barkod, başarımlar, paylaşma kartı ve haftalık özet bildiriminden vazgeçti.
