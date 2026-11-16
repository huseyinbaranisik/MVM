# Sonraki oturum promptu

> Bu dosyanın tamamını yeni oturuma ilk mesaj olarak yapıştır. Kod tabanını baştan taramaya gerek kalmasın diye mevcut durum, kurallar ve görev planı aşağıda.

## Proje özeti

MVM: Türkçe arayüzlü antrenman + günlük alışkanlık takip uygulaması. Repo: özel GitHub deposu `huseyinbaranisik/MVM`; varsayılan ve çalışma dalı `feature/antrenman-uygulamasi`, `master` onunla aynı noktada tutuluyor. Önce `AGENTS.md` kurallarını uygula.

| Katman | Kullanılan |
|---|---|
| Çatı | Expo SDK 58, React Native 0.88, React 19, TypeScript; React Compiler açık |
| Yönlendirme | Expo Router, rotalar `src/app/` (typed routes; yeni rota eklenince `CI=1 timeout 50 npx expo start --port 8099` ile tipleri yenile) |
| Veri | Supabase projesi **MVM-EU** (`ureiashbziekfccmirhj`, Frankfurt). İstemci `src/db/supabase.ts` (`must` / `maybe`), repo fonksiyonları `src/db/repos/*`, şema `supabase/migrations/` (her tabloda `user_id = auth.uid()` RLS). Migration'ı Supabase MCP `apply_migration` ile uygula, sonra repodaki dosya adını sunucuda kayıtlı sürümle eşle (`supabase_migrations.schema_migrations`). |
| Okuma | `useDb(query, deps, tables)`: yazma fonksiyonları `notify('tablo')` çağırır, sadece o tabloları okuyan ekranlar yenilenir (`src/db/bus.ts`). Yeni tablo okuyorsan `tables` listesine ekle. |
| Katalog | Hareketler, kaslar ve hazır yiyecekler uygulamada (`src/data/`, `src/services/catalog.ts`); veritabanında sadece kullanıcının ürettikleri var. |
| Tema | `src/theme/colors.ts`: 9 palet, `derive()` ile türetiliyor; `colors.onPrimary` = ana renk dolgusunun üstündeki yazı/ikon. Bileşende sabit renk kodu kullanma. |
| UI parçaları | `Screen`, `TrackerCard` (`layout="square"\|"wide"`, `side`, `footer`), `RingGauge`, `PillButton`, `SegmentedControl`, `PressableScale`, `Sheet`/`SheetRow`, `NumberPrompt`, `Wheel`, `DraggableList`, `overlays.tsx` (`confirm`, `toast`, `pickTime`), `Skeleton`/`LoadingScreen`/`Appear` |
| Test | Jest: saf mantık `src/services/` ve `src/theme/` altında, testleri `src/services/__tests__/`. Reanimated ve Supabase Jest'te yüklenmez. |

## Uyulacak kurallar (kullanıcı geri bildirimleri)

- **Ekranlara açıklama ya da yönlendirme cümlesi yazma** ("…için dokun", "sonra değiştirebilirsin" gibi). Sadece etiket, değer, kısa boş durum ("Kayıt yok.") ve işe yarar hata mesajı.
- **Bitti demeden önce emülatörde dene.** AVD `Medium_Phone_API_36.1`, adb `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. Expo Go SDK 58 sürümü gerekir; eskiyse `CI=1 npx expo start --android` doğru sürümü kurar. Uygulamayı `adb reverse tcp:8081 tcp:8081` ve `exp://127.0.0.1:8081` ile aç. Test hesabı git dışındaki `.env.test.local` dosyasında.
- Her adımdan sonra `npx tsc --noEmit`, `npx expo lint`, `npx jest`. Bitince commit, `feature/antrenman-uygulamasi` dalına push ve `master`'ı aynı noktaya ilerlet (`git push origin feature/antrenman-uygulamasi:master`).
- Android sürümü (APK) **sadece `C:\dev\mvm`** kopyasında derlenir (`Masaüstü` yolundaki "ü" derlemeyi bozuyor). Orada `git pull`, gerekirse `npx expo prebuild --platform android`, sonra `android\gradlew.bat assembleRelease` (`ANDROID_HOME` ayarlı olsun). `android/local.properties` içinde `cmake.dir=C:/dev/cmake` (Ninja 1.12.1'li CMake kopyası) kalmalı. GitHub'a yeni sürüm yayınlamadan önce kullanıcıya sor.

## Görevler

Kullanıcı v1.0.0 APK'sını telefonunda denedi ve aşağıdakileri istedi. Sırayla yap; her biri ayrı commit.

### 1. Alt bar: + butonu kalkıyor, Profil ortada 5. sekme

- `FloatingTabBar` içindeki ortadaki "+" butonunu, `src/app/quick-add.tsx` rotasını ve `_layout.tsx`'teki `quick-add` `Stack.Screen` satırını sil.
- Sekme sırası: **Bugün · Program · Profil · Kütüphane · İstatistik** (Profil tam ortada).
- `src/app/profile.tsx` → `src/app/(tabs)/profile.tsx` olarak taşı; geri ok başlığını kaldır, `Screen` iskeletini kullan (alt bar boşluğu otomatik gelir). `(tabs)/_layout.tsx`'e `<Tabs.Screen name="profile" />` ekle, `FloatingTabBar` içindeki `TABS` haritasına `profile: { label: 'Profil', icon: 'person' }` ekle.
- Seçili sekme: ikonun arkasında `colors.primary` dolgulu yuvarlak, ikon rengi `colors.onPrimary`, Reanimated ile `withSpring` ölçek 1 → ~1.12. Seçili olmayanlar şeffaf; etiketler kalsın. Android'de sonradan eklenen arka plana `borderRadius` uygulanmama hatası var (Fabric): yuvarlağı ya her zaman çiz ve opaklığını/ölçeğini animasyonla değiştir ya da `key` ile yeniden oluştur (bkz. `DaySelector.tsx`).
- `router.push('/profile')` çağrıları (`(tabs)/index.tsx` avatar, `CalorieCard`) sekmeye geçişe dönüşür; `router.navigate('/profile')` kullan.
- Kabul: emülatörde 5 sekme, ortada Profil, seçili sekme bordo yuvarlakta hafif büyüyor, "+" ve hızlı ekle ekranı yok.

### 2. XP ve seviye sistemi; rozetler şimdilik kalkıyor

**Kazanım kuralları** (kalıcı XP tablosu yok; her seferinde veriden hesaplanır, böylece geriye dönük tutarlı ve tekrar sayılmaz):
- Tamamlanan her set: **+10 XP**. Sadece `status = 'done'` olan oturumlardaki `session_sets` sayılır (iptal edilen antrenman XP vermez).
- Günlük görevler: işaretlenen her alışkanlık (`habit_logs` satırı) **+5 XP**; su hedefine ulaşılan her gün **+10 XP**; adım hedefine ulaşılan her gün **+10 XP**.
- Seri: `streak_days` tarih sırasıyla gezilir; tamamlanan her gün **+5 × min(o günkü seri uzunluğu, 10)** XP. 1. gün 5, 5. gün 25, 10. günden sonra günde 50 XP. Dondurulan gün seriyi korur ama XP vermez; kaçırılan gün seriyi sıfırlar.
- Seviye eğrisi: seviye n'den n+1'e geçmek için **100 + 50 × (n − 1)** XP (1→2: 100, 2→3: 150, …). Seviye 1'den başlar.

**Kod:**
- `src/services/xp.ts` (saf): `XP_RULES` sabitleri, `streakXp(days)`, `totalXp(sources)`, `levelFromXp(xp) → { level, intoLevel, needed }`. Testleri `src/services/__tests__/xp.test.ts` (sınır değerleri: 0 XP, tam seviye eşiği, uzun seri tavanı, dondurulan/kaçırılan gün).
- `src/db/repos/xp.ts`: `getXpSources()` → set sayısı, alışkanlık işaret sayısı, su ve adım hedefine ulaşılan gün sayısı, `streak_days` listesi. Sayımlar için `select('*', { count: 'exact', head: true })`. Hedef günleri `daily_trackers` + `tracker_settings` ile istemcide sayılabilir (bugünkü hedef geçmişe uygulanır; aynı kısayol seride de var).
- Gösterim: Profil üst kartında seviye, ilerleme çubuğu ve "340 / 500 XP"; Bugün ekranında avatarın köşesinde küçük seviye rozeti (sadece sayı). `useDb` tabloları: `session_sets`, `workout_sessions`, `habit_logs`, `daily_trackers`, `tracker_settings`, `streak_days`.
- Seviye atlayınca `toast('Seviye 5!')`: son görülen seviyeyi `localStorage`'da tut (`mvm.lastLevel`), `StreakSync` çalıştıktan sonra karşılaştır. İlk açılışta mevcut seviyeyi sessizce kaydet.
- **Rozetleri kaldır:** Profil'deki "Rozetler" kartı ve `MILESTONES`/`getBadges` kullanımı, `StreakSync` içindeki "Yeni rozet kazandın" toast'ı. `badges` tablosuna ve `evaluateStreak` içindeki rozet yazımına şimdilik dokunma (ileride ayrıntılı başarım sistemi için kalsın); kodda bunu belirten tek satır yorum bırak.

### 3. Profil fotoğrafı

- `expo-image-picker` (kurulu) ile galeriden seç: `allowsEditing: true`, `aspect: [1, 1]`, `quality: 0.7`. Örnek kullanım `src/app/exercise/new.tsx`.
- Supabase Storage: özel (private) `avatars` bucket'ı; yol `<user_id>/avatar.jpg`, `upsert: true`. Yeni migration: bucket'ı oluştur ve `storage.objects` için sadece kendi klasörüne okuma/yazma/silme politikaları (`(storage.foldername(name))[1] = auth.uid()::text`). Yükleme: `fetch(uri)` → `arrayBuffer()` → `supabase.storage.from('avatars').upload(...)`.
- `Settings.profile`'a `avatarPath: string | null` ve `avatarUpdatedAt` ekle (önbellek kırmak için). Gösterirken `createSignedUrl(path, 86400)`; `expo-image` ile göster, URL'ye `?v=avatarUpdatedAt` ekle.
- Avatar: Profil üst kartında büyük, Bugün başlığında küçük; foto yoksa mevcut baş harf görünümü. Avatara dokununca alttan panel: "Fotoğraf seç", foto varsa "Fotoğrafı kaldır" (`confirm` ile).
- Kabul: emülatörde foto seçilip yükleniyor, uygulama kapatılıp açılınca ve tema değişince geri geliyor, kaldırınca baş harfe dönüyor.

### 4. Profil bilgileri sadeleşiyor

Şu anki sorunlar: cinsiyet seçimi sürekli ekranda, yaş satırı gereksiz büyük.
- Üst kart tek bloğa iner: avatar + ad (satır içi düzenleme kalsın) + altında tek satır özet `25 yaş · Erkek · 188 cm` (olmayan bilgi yazılmaz) + sağda kalem ikonu.
- Kaleme dokununca `Sheet` "Bilgiler": Yaş (`NumberPrompt`), Cinsiyet (`SegmentedControl`, sadece bu panelde), Boy, Hedef kilo.
- Kilo/Boy/BMI kutuları ve kilo grafiği kalsın; boy düzenleme bu panele taşındığı için "Boy" kutusu sadece gösterim olabilir.
- Seviye ve XP çubuğu bu üst kartın içinde (Görev 2).

### 5. Düzenlenebilir ana ekran ("Düzen")

- Ayar: `Settings.homeLayout: { id: HomeCardId; size: 'small' | 'large' }[]`; sadece görünen kartlar, ekrandaki sırayla. `HomeCardId = 'workout' | 'water' | 'steps' | 'calories' | 'sleep' | 'checklist'`.
- Varsayılan, bugünkü düzen: workout büyük, water küçük, steps küçük, calories büyük, sleep büyük, checklist büyük. `DEFAULT_SETTINGS`'e ekle; okurken bilinmeyen id'leri ve tekrarları ayıkla.
- Boyutlar: `workout` ve `checklist` sadece büyük. `water`, `steps`, `calories`, `sleep` küçük ya da büyük olabilir.
  - Küçük = `TrackerCard layout="square"` (yarım genişlik). Büyük = `layout="wide"` (tam genişlik).
  - Su/Adım büyük: halka solda, `Counter` sağdaki `side` alanında.
  - Kalori küçük: halka + kalan kcal; makrolar gizli. Uyku küçük: halka + süre, dokununca kayıt paneli.
- Bugün ekranı: üst başlık ve gün seçici sabit; altında kartlar `homeLayout` sırasıyla. Art arda gelen iki küçük kart yan yana; tek kalan küçük kart yarım genişlikte, yanı boş. "Günlük check-in" başlığı kalkar. `Appear` sırası kart sırasını izler.
- Düzen ekranı: Profil'de "Ana ekran düzeni" satırı → yeni rota `src/app/home-layout.tsx`.
  - Görünen kartlar `DraggableList` ile sürükleyerek sıralanır. Her satır: tutamaç, kart adı, izin varsa Küçük/Büyük `SegmentedControl`, kaldır butonu.
  - Altında gizli kartlar, her biri "Ekle" ile listenin sonuna eklenir (varsayılan boyutla).
  - "Varsayılana dön" (`confirm` ile).
  - Her değişiklik anında `setSetting('homeLayout', …)`; en az bir kart görünür kalmalı.
- Testler: düzeni ayıklayan/doğrulayan ve küçük kartları satırlara eşleyen fonksiyonlar saf olsun (`src/services/homeLayout.ts`) ve test edilsin.

### 6. Doğrulama ve teslim

1. `npx tsc --noEmit`, `npx expo lint`, `npx jest` temiz.
2. Emülatörde: 5 sekmeli alt bar ve animasyon; Profil'de seviye/XP, foto yükleme ve kaldırma, Bilgiler paneli; Düzen ekranında sıralama, boyut, kaldırma, ekleme, varsayılana dönme; Bugün ekranı düzene uyuyor; bir set ve bir alışkanlık işaretleyip XP'nin arttığını gör; iki temada (biri açık) kontrol.
3. Commit, `feature/antrenman-uygulamasi` push, `master`'ı ilerlet.
4. `C:\dev\mvm`'de `git pull` + `npx expo prebuild --platform android` + `gradlew.bat assembleRelease`; yeni APK'yı emülatörde kur ve dene. Kullanıcı onaylarsa `v1.1.0` GitHub sürümü olarak yayınla (`gh release create v1.1.0 <apk> --target master`).
5. README'deki özellik listesini (XP/seviye, düzenlenebilir ana ekran, profil fotoğrafı; rozet ve "+ hızlı ekle" ifadeleri varsa kaldır) İngilizce ve Türkçe bölümlerde güncelle. Görseller değişirse `tools/render_figures.py` ile yeniden üret.

## Açık sorular (başlarken kullanıcıya sorma; varsayılanları uygula, sonunda belirt)

- XP miktarları ve seviye eğrisi yukarıdaki gibi; kullanıcı değiştirmek isterse `XP_RULES` tek yerden ayarlanır.
- Geçmişe dönük XP: mevcut veriden hesaplandığı için kullanıcı ilk açılışta birikmiş XP ile başlar. İstenmezse `startDate` sonrasını say.
- Tek kalan küçük kart yarım genişlikte kalır; istenirse tam genişliğe yayılabilir.
