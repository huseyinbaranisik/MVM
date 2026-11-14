# Sonraki oturum promptu

> Bu metni yeni oturuma ilk mesaj olarak yapıştır. Uygulamayı baştan incelemene gerek kalmasın diye yığın ve yapı özeti aşağıda.

## Proje özeti

Tamamen offline, Türkçe arayüzlü antrenman + günlük alışkanlık takip uygulaması (MVM). Repo: özel GitHub deposu `huseyinbaranisik/MVM`, çalışma dalı `feature/antrenman-uygulamasi` (ana dal `master`). Önce `AGENTS.md` kurallarını uygula.

## Teknoloji yığını

| Katman | Kullanılan |
|---|---|
| Çatı | Expo SDK 58 (`expo ~58.0.22`), React Native 0.88.1, React 19.3, TypeScript 6 |
| Yönlendirme | Expo Router 58 (rotalar `src/app/`, typed routes; yeni rota ekleyince `CI=1 timeout 50 npx expo start --port 8099` ile tipleri yenile) |
| Derleyici | React Compiler açık → nullable state'e closure içinde `!` ile erişme, değerleri render başında oku; lint `react-hooks/immutability`, `purity` |
| Veri | `expo-sqlite` (`SQLiteProvider onInit=migrate`, `enableChangeListener`), migration'lar `src/db/migrations/00X_*.ts` + `PRAGMA user_version` (`SCHEMA_VERSION = migrations.length`), repo fonksiyonları `src/db/repos/*`, okuma hook'u `src/db/useDb.ts` (DB değişince yeniden çalışır, yüklenirken `undefined`) |
| Durum | Zustand 5 (`src/stores/`, `src/components/ui/overlays.tsx`) |
| Animasyon | Reanimated 4.7 + worklets 0.13 (paylaşılan değerlerde `.set()/.get()`), layout animasyonları (FadeInDown, ZoomIn…) |
| Jest | jest-expo; Reanimated Jest'te yüklenmez → saf mantık `src/services/` içinde, test orada. Repo testleri `src/db/testDb.ts` (node:sqlite adaptörü) |
| Grafik / çizim | `react-native-gifted-charts`, `react-native-svg` (vücut haritası `src/components/BodyMap.tsx`, veriler `src/data/bodyPaths`, kırpma `src/data/bodyFocus.ts`) |
| Diğer | expo-notifications (sadece yerel), expo-sensors (adım), expo-haptics, expo-keep-awake, expo-symbols (Material ikon, `src/components/Icon.tsx`), gesture için PanResponder (RNGH3 eski API'leri kullanma) |
| Tema | Sadece `src/theme` token'ları: `colors` (bordo `#7A1F2B/#A33545`, bej `#E8DCC4`, siyah `#0E0C0B`…), `spacing`, `radius`, `type` |

## Hazır UI parçaları (yeniden yazma, kullan)

- `Screen`, `TrackerCard` (halka + `Counter` +/- butonları), `RingGauge`, `PillButton` / `SegmentedControl`, `PressableScale`
- `Sheet` / `SheetRow` (yaylı alt panel, sürükle-kapat), `NumberPrompt` (klavyeden sayı girişi), `Wheel` (kaydırmalı seçici)
- `overlays.tsx`: `confirm()`, `toast()`, `pickTime()` + `OverlayHost`
- `Skeleton`, `LoadingScreen`, `Appear` (kademeli giriş)
- Ana ekran kartları: `src/components/home/{WaterCard,StepsCard,SleepCard,WorkoutCard,Checklist}.tsx`; geçmiş ekranı `src/app/tracker/[type].tsx`
- Takipçi verisi: tablolar `daily_trackers(type,date,value)` ve `tracker_settings(type,goal,display_unit,unit_size)`; `TrackerType = 'water' | 'steps' | 'sleep'` (`src/db/repos/trackers.ts`)
- İlk açılış: `src/app/onboarding.tsx` (su `GLASSES=[6,8,10,12]`, adım `STEPS=[6000,8000,10000,12000]`)

## Bu oturumdaki görevler

1. **Kalori sayacı (yeni takipçi).** Su ve adım kartları gibi ana ekranda bir "Kalori" kartı:
   - Sistemde kayıtlı yiyecek veritabanı (seed, offline): her yiyecek için 100 g başına kalori, protein, yağ, karbonhidrat. Türk mutfağından yaygın yiyecekler dahil (tavuk göğsü, pirinç, bulgur, yumurta, yoğurt, ekmek, mercimek, zeytinyağı, muz, elma, yulaf vb.). Kaynak/lisans uygunluğunu kontrol et (USDA gibi kamuya açık değerler).
   - Yiyecek arama + gram girerek öğün kaydı; günlük toplam kalori ve makrolar; hedef kalori (ayarlanabilir); kullanıcı kendi yiyeceğini ekleyebilsin.
   - Yeni migration (`004_...`) ile tablolar (`foods`, `food_logs` gibi), repo + test, kart + geçmiş ekranı (mevcut `tracker/[type]` desenine uy).
2. **Seçenekler 3 + Özel.** Su ve adım hedef seçeneklerinde (onboarding'deki 4'lü seçimler ve benzerleri) 3 hazır seçenek kalsın; 4. seçenek "Özel" olsun: tıklayınca klavyeden değer girilip kaydedilsin (`NumberPrompt` kullan).
3. Her adımdan sonra `npx tsc --noEmit`, `npx expo lint`, `npx jest`; bitince commit + push (`feature/antrenman-uygulamasi`).

## Bekleyen notlar

- Son oturumdaki değişiklikler (SetPicker, kendi diyalog/toast/saat seçici, ErrorBoundary, skeleton, kadrajlı mini haritalar, onboarding, hızlı ekle) emülatörde tam doğrulanmadı; kullanıcı kendisi kontrol edecek. Son emülatör denemesinde Program sekmesine geçince boş ekran görüldü — kullanıcı hata bildirirse önce oraya bak (`src/app/(tabs)/program.tsx`, `TemplateMiniMap` kırpma).
- Expo Go'da kesin zamanlı alarm (`SCHEDULE_EXACT_ALARM`) çalışmaz; dinlenme bildirimi gecikebilir, development build gerekir.
