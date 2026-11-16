# Sonraki oturum promptu

> Bu dosyanın tamamını yeni oturuma ilk mesaj olarak yapıştır. Tek kaynak budur: proje özeti, kurallar, kod haritası (dosya yolları, imzalar, şema) ve görevler burada.
>
> **Oturuma not:** Bu dosyadaki bilgiler 2026-11-16 itibarıyla günceldir (`63c1ac4`). Kod tabanını keşif için tarama, alt ajan açma, README/docs okuma. Sadece düzenleyeceğin dosyayı oku. Buradaki bir bilgi koda uymazsa o dosyayı oku ve devam et.

## 1. Proje

MVM: Türkçe arayüzlü antrenman ve günlük alışkanlık takibi uygulaması. Repo `huseyinbaranisik/MVM`. Çalışma dalı `feature/antrenman-uygulamasi`; `master` da aynı commit'te tutuluyor. Çalışma klasörü `C:\Users\win\OneDrive\Masaüstü\Ekmek\MVM`.

- **Çatı:** Expo SDK 58, React Native 0.88, React 19, TypeScript, React Compiler açık. Import kısayolu `@/` = `src/`.
- **Rotalar:** Expo Router, `src/app/`, typed routes açık. Yeni rota eklenince tipleri yenile: `CI=1 timeout 50 npx expo start --port 8099`.
- **Veri:** Supabase projesi **MVM-EU** (`ureiashbziekfccmirhj`, Frankfurt). Her tabloda RLS `user_id = auth.uid()`, `user_id` varsayılanı `auth.uid()`.
  - Migration'lar `supabase/migrations/` altında. Supabase MCP `apply_migration` ile uygula. Ardından repodaki dosya adını sunucudaki sürümle eşle: `select version from supabase_migrations.schema_migrations`.
- **Tema:** `src/theme` → `colors`, `spacing`, `radius`, `type`.
  - Önemli renk anahtarları: `primary`, `primaryLight`, `accent`, `accentMuted`, `onPrimary` (ana renk dolgusunun üstündeki yazı ve ikon), `surface`, `surfaceElevated`, `divider`, `textPrimary`, `textSecondary`, `neutral`, `overlay`.
  - Bileşenlerde sabit renk kodu kullanma.
  - 9 tema var; seçim localStorage `mvm.theme` anahtarında. Tema değişince uygulama yeniden başlar.
- **Test:** Jest. Saf mantık `src/services/` altında, testleri `src/services/__tests__/` altında. Jest'te Reanimated, Supabase ve yerel modüller yüklenmez.

## 2. Kurallar

- **Ekrana açıklama ya da yönlendirme cümlesi yazma** ("…için dokun", "sonra değiştirebilirsin" gibi). Yalnızca şunlar olur: etiket, değer, kısa boş durum ("Kayıt yok.") ve işe yarar hata mesajı.
- Her görevden sonra `npx tsc --noEmit`, `npx expo lint` ve `npx jest` çalıştır. Her görev ayrı commit olur.
  - Push: `git push origin feature/antrenman-uygulamasi` ve `git push origin feature/antrenman-uygulamasi:master`.
- **"Bitti" demeden önce emülatörde dene.**
  - AVD `Medium_Phone_API_36.1`. adb `$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`; Git Bash'te `MSYS_NO_PATHCONV=1` kullan.
  - Expo Go'nun SDK 58 sürümü gerekir; değilse `CI=1 npx expo start --android` kurar.
  - Bağlanma: `npx expo start` → `adb reverse tcp:8081 tcp:8081` → `adb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081`.
  - Ekran görüntüsü: `adb exec-out screencap -p > shot.png`. Dokunma: `adb shell input tap x y`. Arayüz ağacı: `adb shell uiautomator dump`.
  - Test hesabı git dışındaki `.env.test.local` dosyasında.
- **APK** yalnızca `C:\dev\mvm` kopyasında derlenir; yoldaki "ü" derlemeyi bozuyor.
  - Adımlar: orada `git pull`, `npx expo prebuild --platform android`, sonra `android\gradlew.bat assembleRelease`. `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk` ayarlı olsun.
  - `android/local.properties` dosyası iki satır içermeli: `sdk.dir=C:/Users/win/AppData/Local/Android/Sdk` ve `cmake.dir=C:/dev/cmake`. Prebuild bu dosyayı silerse yeniden yaz.
  - Çıktı: `android/app/build/outputs/apk/release/app-release.apk`.
  - GitHub'a yeni sürüm yayınlamadan önce kullanıcıya sor.
- Android Fabric hatası: sonradan eklenen arka plan `borderRadius`'u yok sayar ve kare çizilir. Çözüm: arka planı her zaman çiz ve opaklığını değiştir, ya da `key` vererek yeniden oluştur.

## 3. Kod haritası (okumadan kullan)

**Veri katmanı**
- `src/db/supabase.ts`: `supabase` istemcisi.
  - `must(r)`: hata varsa fırlatır, `data` döner.
  - `maybe(r)`: `null` olabilir.
- `src/db/bus.ts`: `notify(...tables)`, `subscribe(fn(tables: Set))`. `'*'` tüm tablolar demek.
- `src/db/useDb.ts`: `useDb(query, deps, tables): T | undefined`. Verilen tablolardan biri `notify` edilince yeniden çalışır.
- `src/db/repos/settings.ts`:
  - `Settings` arayüzü: `profile: { name; age: number|null; sex: 'male'|'female'|null; targetWeightKg: number|null }`, `weightUnit`, `restSec`, `notifications`, `streakRule`, `morningSleepPrompt`, `lastSleepPrompt`, `startDate`, `onboarded`.
  - `DEFAULT_SETTINGS`.
  - `getSetting(key)`: satır yoksa varsayılanı döner.
  - `setSetting(key, value)`: `settings` tablosuna `{key, value jsonb}` upsert eder, sonra `notify('settings')`.
- `src/db/repos/streak.ts`:
  - `STREAK_INPUT_TABLES`.
  - `evaluateStreak()` → `{ current, todayCompleted, fresh: number[] … }`. `badges` tablosuna rozet yazar.
  - `getStreakState()`, `getStreakDays(from, to)`, `getBadges()`.
- `src/db/repos/trackers.ts`:
  - `TrackerType = 'water'|'steps'|'sleep'|'calories'`.
  - `getTrackerValue`, `addTrackerValue`, `getTrackerSettings(type)` → `{goal, …}`, `updateTrackerSettings`, `getTrackerHistory`, `getLatestMeasurement(type)`.
- `src/db/repos/measurements.ts`: `'weight'|'height'`; `saveMeasurement(type, value, date)`, `getMeasurements(type)`. Boy buradan okunur, `Settings`'te değil.

**Şema (ilgili tablolar)**
- `workout_sessions(id, date, status 'active'|'done'|'abandoned', …)`
- `session_sets(id, session_id → workout_sessions, exercise_id, set_index, weight_kg, reps, duration_sec, completed_at)`
- `habits(id, name, icon, weekdays, position, archived_at)`
- `habit_logs(habit_id, date)`
- `daily_trackers(type, date, value)`; PK `(user_id, type, date)`
- `tracker_settings(type, goal, display_unit, unit_size)`
- `streak_days(date, status 'completed'|'frozen'|'missed')`
- `streak_state(current, longest, freezes_available)`
- `badges(milestone, earned_at)`
- `settings(key, value jsonb)`; PK `(user_id, key)`

**Arayüz parçaları**

| Bileşen | Kullanım |
|---|---|
| `Screen` (`@/components/Screen`) | `{children}`: kaydırılabilir sayfa, alt bar boşluğu dahil |
| `TrackerCard` (`@/components/TrackerCard`) | `{title, icon, color, progress, value, caption, onMenu, onPress?, footer?, side?, layout?: 'square'\|'wide', resetKey?}`. `square` = `flex:1` yarım kart; `wide` = halka solda, `side` sağda. Aynı dosyada `Counter({onMinus, onPlus, minusLabel, plusLabel})` |
| `RingGauge` | `{size, stroke?, progress, color, trackColor?, children}` |
| `PillButton` (`@/components/ui/PillButton`) | `{label, onPress, active?, variant?: 'chip'…, disabled?, style?}` |
| `SegmentedControl` | Aynı dosyada: `{options: {value, label}[], value, onChange}` |
| `PressableScale` (`@/components/ui/PressableScale`) | `Pressable` props'u ve basınca küçülme |
| `Sheet`, `SheetRow` (`@/components/ui/Sheet`) | `Sheet{visible, onClose, title?, children}`, `SheetRow{label, value?, onPress?}` |
| `NumberPrompt` (`@/components/ui/NumberPrompt`) | `{visible, title, initial?, suffix?, min?, quick?, onSubmit(n), onClose}` |
| `@/components/ui/overlays` | `confirm({title, message?, confirmLabel?, destructive?}) → Promise<boolean>`, `toast(msg)`, `pickTime(init)` |
| `@/components/ui/Skeleton` | `Skeleton`, `LoadingScreen`, `Appear{index, style?}` (sırayla belirme) |
| `DraggableList` (`@/components/DraggableList`) | `{items, keyOf, rowHeight, renderRow(item, i), onReorder(keys)}`, tutamaç dahil |
| `Icon` (`@/components/Icon`) | `{name, size, color}`, Material Symbols adları (`home`, `person`, `edit`, `add`, `close`…) |

**Mevcut ekranlar**
- `src/components/FloatingTabBar.tsx`:
  - `TABS: Record<routeName, {label, icon}>` = index/Bugün/`home`, program/Program/`calendar_month`, library/Kütüphane/`fitness_center`, stats/İstatistik/`bar_chart`.
  - Seçili renk `colors.accent`, diğerleri `textSecondary`.
  - Ortada `router.push('/quick-add')` yapan "+" (`styles.plus`), sekmeleri ikiye bölüp araya ekleniyor.
  - `TAB_BAR_HEIGHT = 68`. Props: `{state, emitter, navigateToTab, insets}` (`expo-router/js-tabs`).
- `src/app/(tabs)/_layout.tsx`: `Tabs` (`expo-router/js-tabs`), `tabBar={FloatingTabBar}`, `Tabs.Screen` sırası index, program, library, stats.
- `src/app/_layout.tsx:93`: `<Stack.Screen name="quick-add" …/>`. Silinecek dosya `src/app/quick-add.tsx`.
- `src/app/(tabs)/index.tsx` (Bugün):
  - Üstte `header` var: `useDb` → `name`, `onboarded`, `streak`. Avatar = baş harf, `router.push('/profile')`; sağında alev ve seri sayısı.
  - Sonra `Appear` sırasıyla: `DaySelector`, `WorkoutCard`, "Günlük check-in" başlığı + `styles.grid` (row) içinde `WaterCard` ve `StepsCard`, ardından `CalorieCard`, `SleepCard`, `Checklist`.
  - Kartların hepsi `{date}` alır. `CalorieCard` ve `SleepCard` sabit `layout="wide"`, `WaterCard` ve `StepsCard` sabit `square`.
- `src/components/home/CalorieCard.tsx:105`: `router.push('/profile')`.
- `src/app/profile.tsx` (243 satır):
  - Geri oklu başlık ve ad `TextInput`.
  - `SheetRow "Yaş"` (satır 91) ve hep görünen cinsiyet `SegmentedControl` (satır 93).
  - `Tile` Kilo/Boy/BMI (satır 102–104) ve kilo grafiği.
  - Seri kartı, "Rozetler" kartı (`getBadges`, `MILESTONES` from `@/services/streakService`, satır 152).
  - Açılır tema seçici (satır ~165), "Çıkış yap" (satır 179).
  - `NumberPrompt`'lar (yaş, kilo, boy) altta.
- `src/components/StreakSync.tsx`: görünmez bileşen. Açılışta, uygulamaya dönüldüğünde ve `STREAK_INPUT_TABLES` yazımlarında `evaluateStreak()` çalıştırır.
  - Her yeni rozet için `toast('🔥 N günlük seri! Yeni rozet kazandın.')` gösterir; bu satır kaldırılacak.
  - Akşam seri hatırlatmasını kurar.
- Fotoğraf seçme örneği `src/app/exercise/new.tsx:36`: `ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect, quality: 0.7 })`.
- `expo-image` ve `expo-image-picker` kurulu.

## 4. Görevler (sırayla, her biri ayrı commit)

### G1. Alt bar: "+" kalkıyor, Profil ortada
- Sil:
  - `FloatingTabBar`'daki `plus` öğesini ve stilini, ikiye bölme mantığını ve `router` importunu.
  - `src/app/quick-add.tsx` dosyasını.
  - `_layout.tsx:93` satırını.
- Taşı: `src/app/profile.tsx` → `src/app/(tabs)/profile.tsx`. Geri oklu başlığı kaldır, `Screen` iskeleti kalsın.
- Ekle:
  - `TABS`'a `profile: { label: 'Profil', icon: 'person' }`.
  - `(tabs)/_layout.tsx` sırası: index, program, **profile**, library, stats.
- `router.push('/profile')` → `router.navigate('/profile')` (iki yer: Bugün avatarı ve CalorieCard).
- Seçili sekme:
  - İkonun arkasında `colors.primary` dolgulu yuvarlak (~44×36 hap ya da 44 daire); ikon rengi `colors.onPrimary`.
  - Reanimated `withSpring` ölçek 1 → 1.12.
  - Fabric hatası yüzünden yuvarlağı her sekmede çiz, seçili değilken `opacity: 0`.
  - Etiketler kalsın.
- Kabul: emülatörde 5 sekme var, Profil ortada, seçili sekme bordo yuvarlakta büyüyor, "+" yok.

### G2. XP ve seviye; rozetler gizleniyor
- XP tablosu yok; her seferinde veriden hesaplanır. Böylece geçmiş de sayılır ve aynı iş iki kez sayılmaz.
- **Kurallar**, `XP_RULES` içinde tek yerde:
  - `status='done'` olan oturumdaki her `session_sets` satırı **+10**.
  - Her `habit_logs` satırı **+5**.
  - Su hedefine ulaşılan her gün **+10**; adım hedefine ulaşılan her gün **+10**. Değerler `daily_trackers.value >= tracker_settings.goal`. Bugünkü hedef geçmişe de uygulanır; bu kısayolu yorumda belirt.
  - `streak_days` tarih sırasıyla gezilir: `completed` olan gün seri sayacını 1 artırır ve **5 × min(sayaç, 10)** XP verir. `frozen` sayacı korur ama 0 XP verir. `missed` sayacı sıfırlar.
- **Seviye:** 1'den başlar. n → n+1 için **100 + 50 × (n − 1)** XP gerekir.
- `src/services/xp.ts` (saf):
  - `XP_RULES`.
  - `streakXp(statuses: StreakStatus[])`.
  - `totalXp({sets, habitLogs, waterDays, stepDays, streak})`.
  - `levelFromXp(xp) → { level, intoLevel, needed }`.
  - Testler `src/services/__tests__/xp.test.ts`: 0 XP; tam eşik (100 → seviye 2, 0/150); seri tavanı; frozen/missed.
- `src/db/repos/xp.ts` → `getXpSources()`:
  - Set sayısı: `supabase.from('session_sets').select('id, workout_sessions!inner(status)', { count: 'exact', head: true }).eq('workout_sessions.status', 'done')`.
  - Alışkanlık sayısı: `habit_logs` için `count: 'exact', head: true`.
  - `daily_trackers` (type in water/steps) + `tracker_settings`.
  - `streak_days` order by date.
- `useDb` tabloları: `['session_sets', 'workout_sessions', 'habit_logs', 'daily_trackers', 'tracker_settings', 'streak_days']`.
- Gösterim:
  - Profil üst kartı: `Sv 5`, ilerleme çubuğu, `340 / 500 XP`.
  - Bugün avatarı: sağ alt köşede `colors.primary` küçük daire içinde seviye sayısı.
- Seviye atlama: `StreakSync` döngüsünün sonunda seviyeyi hesapla ve `localStorage` `mvm.lastLevel` ile karşılaştır.
  - Seviye artmışsa `toast('Seviye N!')` göster ve değeri kaydet.
  - İlk açılışta (anahtar yoksa) sessizce kaydet.
- Rozetler:
  - Profil'deki "Rozetler" kartını, `getBadges` ve `MILESTONES` kullanımını kaldır.
  - `StreakSync`'teki rozet toast'ını kaldır.
  - `badges` tablosu ve `evaluateStreak` içindeki rozet yazımı kalsın. Yanına tek satır yorum: ileride başarım sistemi için.

### G3. Profil fotoğrafı
- Migration (`avatars` bucket'ı):
  ```sql
  insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false) on conflict do nothing;
  create policy "avatar_select" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
  -- aynı koşulla insert (with check), update (using + with check), delete
  ```
- `Settings.profile`'a `avatarPath: string | null` ve `avatarUpdatedAt: number | null` ekle (varsayılan `null`).
  - Okurken eksik alanları varsayılanla birleştir: `{...DEFAULT_SETTINGS.profile, ...row}`.
- Yükleme:
  1. Seçici: `allowsEditing: true`, `aspect: [1, 1]`, `quality: 0.7`.
  2. `const buf = await (await fetch(uri)).arrayBuffer()`.
  3. `supabase.storage.from('avatars').upload(`${uid}/avatar.jpg`, buf, { contentType: 'image/jpeg', upsert: true })`. `uid` için `(await supabase.auth.getUser()).data.user.id`.
  4. `setSetting('profile', {...p, avatarPath, avatarUpdatedAt: Date.now()})`.
- Gösterim:
  - `createSignedUrl(path, 86400)` ile URL al, `expo-image` `<Image>` ile göster. URL'nin `cachePolicy` anahtarı ya da `recyclingKey` için `avatarUpdatedAt` kullan.
  - Ortak bileşen `src/components/Avatar.tsx` (`{size, level?}`): foto yoksa baş harf, `level` verilmişse köşede seviye rozeti. Hem Bugün hem Profil kullansın.
- Profil avatarına dokununca `Sheet`: "Fotoğraf seç"; foto varsa "Fotoğrafı kaldır" (`confirm` → `storage.remove` → `avatarPath: null`).
- Kabul: emülatörde foto yükleniyor; uygulamayı kapatıp açınca ve tema değişince geri geliyor; kaldırınca baş harfe dönüyor.

### G4. Sade profil bilgileri
- Üst kart:
  - Avatar.
  - Ad (satır içi düzenleme kalsın).
  - Altında tek satır `25 yaş · Erkek · 188 cm`; olmayan parça yazılmaz.
  - Seviye/XP çubuğu.
  - Sağda kalem (`edit`) ikonu.
- Kaleme dokununca `Sheet` "Bilgiler":
  - `SheetRow` Yaş, Boy, Hedef kilo; her biri ilgili `NumberPrompt`'u açar.
  - Cinsiyet `SegmentedControl` (Erkek/Kadın) yalnızca bu panelde.
- Sayfadan kaldır: "Yaş" satırı, sürekli görünen cinsiyet seçimi.
- Kilo/Boy/BMI kutuları ve kilo grafiği kalsın.

### G5. Düzenlenebilir ana ekran
- `src/services/homeLayout.ts` (saf, testli):
  - `HomeCardId = 'workout'|'water'|'steps'|'calories'|'sleep'|'checklist'`.
  - `HomeItem = { id: HomeCardId; size: 'small'|'large' }`.
  - `RESIZABLE = ['water', 'steps', 'calories', 'sleep']`; diğerleri yalnızca `large`.
  - `DEFAULT_LAYOUT`: workout L, water S, steps S, calories L, sleep L, checklist L.
  - `sanitize(raw)`: bilinmeyen id'leri ve tekrarları atar, izin verilmeyen boyutu `large` yapar, boş liste gelirse `DEFAULT_LAYOUT` döner.
  - `toRows(items) → HomeItem[][]`: art arda iki küçük kart bir satır; tek kalan küçük kart kendi satırında.
- `Settings.homeLayout: HomeItem[]`, varsayılanı `DEFAULT_LAYOUT`. Okurken `sanitize` uygula.
- Kartlar:
  - `WaterCard`, `StepsCard`, `CalorieCard`, `SleepCard` `size` prop'u alır.
  - `small` → `layout="square"`, `large` → `layout="wide"`.
  - Su/Adım büyükken `Counter` `side` alanına geçer.
  - Kalori küçükken halka + kalan kcal; makrolar gizli.
  - Uyku küçükken halka + süre.
- Bugün ekranı:
  - Başlık ve `DaySelector` sabit.
  - Altında `toRows(layout)`: her satır `flexDirection: 'row'`, `gap: spacing.md`. Tek kalan küçük kart yarım genişlikte; yanına boş `flex:1` görünüm koy.
  - "Günlük check-in" başlığı kalkar.
  - `Appear` index'i satır sırasını izler.
- Profil'e "Ana ekran düzeni" `SheetRow` → yeni rota `src/app/home-layout.tsx` (Stack, geri oklu başlık):
  - Görünen kartlar `DraggableList` ile sıralanır. Satırda: kart adı, izin varsa Küçük/Büyük `SegmentedControl`, kaldır (`close`) butonu.
  - Son görünen kart kaldırılamaz.
  - Altında gizli kartlar; her biri `PillButton` "Ekle" ile listenin sonuna varsayılan boyutla eklenir.
  - "Varsayılana dön" (`confirm`).
  - Her değişiklikte `setSetting('homeLayout', …)`.
- Kart adları: Antrenman, Su, Adım, Kalori, Uyku, Görevler.

### G6. Doğrulama ve teslim
1. `tsc`, `lint` ve `jest` temiz.
2. Emülatörde kontrol et:
   - Alt bar animasyonu.
   - Profil: seviye, foto yükle/kaldır, Bilgiler paneli.
   - Düzen: sırala, boyut değiştir, kaldır, ekle, varsayılana dön; Bugün ekranı buna uyuyor.
   - Bir set ve bir alışkanlık işaretle, XP'nin arttığını gör.
   - Bir koyu ve bir açık temada bak.
3. Commit, iki dala push.
4. `C:\dev\mvm`'de APK'yı derle, emülatöre `adb install -r` ile kur ve dene. Kullanıcı onaylarsa: `gh release create v1.1.0 <apk> --target master --title "v1.1.0"`.
5. README (İngilizce ve Türkçe bölümler):
   - XP/seviye, profil fotoğrafı ve düzenlenebilir ana ekranı ekle.
   - Rozet ve "hızlı ekle" ifadelerini çıkar.
   - Görseller değişirse `python tools/render_figures.py`.

## 5. Varsayılan kararlar (sorma; bitince kullanıcıya bildir)
- XP geçmiş veriden hesaplanır, yani mevcut setler ve seri baştan sayılır. İstenmezse `startDate` sonrası sayılır.
- XP miktarları ve seviye eğrisi `XP_RULES` içinde, tek yerden ayarlanır.
- Tek kalan küçük kart yarım genişlikte kalır.
