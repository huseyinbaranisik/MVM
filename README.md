<p align="center">
  <img src="assets/hero.png" alt="MVM, workouts and daily habits: a Turkish-language mobile app. Right: the real home screen with the weekly day selector, today's workout with its muscle map, and the water and step rings." width="100%">
</p>

<p align="center">
  <a href="#demo">Demo</a> · <a href="#what-it-does">What it does</a> · <a href="#themes">Themes</a> · <a href="#how-it-works">How it works</a> · <a href="#run-it">Run it</a> · <a href="#türkçe">Türkçe</a>
</p>

MVM is a personal mobile app that keeps a strength-training program and the small daily habits around it in one place. You plan the week, log sets while you train, and track water, steps, sleep and calories on the same home screen; a daily streak ties it together. The interface is in Turkish.

**Built with:** Expo SDK 58 (React Native 0.88, TypeScript) · data in Supabase · runs in Expo Go or a development build.

## Demo

<p align="center"><img src="assets/demo.gif" alt="Fig. 2: a real recording. Home screen, scrolling through the cards, the Program tab, the exercise library with a tap on the abdominals, the profile, opening the theme picker and switching to the Erik & Bal theme." width="380"></p>

<p align="center"><sub><b>Fig. 2</b> · A real recording from the Android emulator (<code>adb screenrecord</code>, sped up 1.5×). Home → Program → Library → a muscle → Profile → theme picker → Erik & Bal. The few seconds of the development reload after the theme change are cut.</sub></p>

<p align="center"><img src="assets/terminal.png" alt="Fig. 3: real output of npx tsc --noEmit, npx expo lint and npx jest." width="100%"></p>

<p align="center"><sub><b>Fig. 3</b> · Real output on 16 November 2026: type check, lint and the Jest suite (48 tests). The raw logs are in <a href="assets/src/"><code>assets/src/checks-*.txt</code></a>.</sub></p>

<table>
  <tr>
    <td align="center" width="25%"><img src="assets/clip-home.gif" width="100%" alt="Scrolling the home screen"><br><sub>Home: today's plan and trackers</sub></td>
    <td align="center" width="25%"><img src="assets/clip-program.gif" width="100%" alt="Weekly program and templates"><br><sub>Weekly program</sub></td>
    <td align="center" width="25%"><img src="assets/clip-library.gif" width="100%" alt="Body map, tapping a muscle"><br><sub>Library: tap a muscle</sub></td>
    <td align="center" width="25%"><img src="assets/clip-theme.gif" width="100%" alt="Picking a theme"><br><sub>Switching theme</sub></td>
  </tr>
</table>
<p align="center"><sub><b>Fig. 4</b> · Short clips from the same recording.</sub></p>

## What it does

<table>
  <tr><td><b>Weekly program</b></td><td>Each weekday gets a workout template, a walking day or a rest day. Templates hold sets, rep ranges, timed holds, rest, per-side work and supersets; exercises are reordered by dragging.</td></tr>
  <tr><td><b>Live workout</b></td><td>Previous values next to every set, a scroll wheel for kg and reps, a rest timer with a notification, a stopwatch for timed exercises, a progressive-overload hint, and a summary with volume and personal records. Past days are locked: yesterday's workout cannot be filled in today.</td></tr>
  <tr><td><b>Exercise library</b></td><td>About 260 exercises, browsed through a tappable body map by region or single muscle, with search, equipment filters, favourites and your own exercises with a photo.</td></tr>
  <tr><td><b>Daily trackers</b></td><td>Water and steps as rings, sleep with bed time, wake time and quality, a bedtime reminder, and a 2-week / 1-month history chart for each.</td></tr>
  <tr><td><b>Calories</b></td><td>A built-in food list with values per 100 g (USDA FoodData Central), logging by grams, macros, your own foods, recently eaten foods first, and a calorie and protein goal suggested from your profile (Mifflin-St Jeor).</td></tr>
  <tr><td><b>Streak</b></td><td>A workout day counts when the workout is finished; a rest day counts with the step goal or the habit checklist. Freezes, a monthly calendar, badges and an evening reminder if the day is not done yet.</td></tr>
  <tr><td><b>Profile</b></td><td>Weight and height log, BMI, a weight chart with a target line, and the theme picker.</td></tr>
</table>

## Themes

Nine themes, chosen under Profile → Tema. Each one is three colours; every other colour in the app (surfaces, dividers, text, muscle-map tones) is derived from those three.

<p align="center"><img src="assets/themes.png" alt="Fig. 5: the home screen in all nine themes" width="720"></p>

<p align="center"><sub><b>Fig. 5</b> · Bordo & Bej (default), Gece & Kiremit, Şarap, Erik & Bal, Karpuz, Domates, Mandalina, Deniz, Mocha. Erik & Bal and Mocha came as two-colour palettes; the third colour (rose <code>#A8456B</code>, caramel <code>#D08C60</code>) was added to match.</sub></p>

The app does not use the phone's own alert box or time picker. Confirmations, the time wheel, number input and toasts are its own components, so they follow the theme.

<p align="center"><img src="assets/dialogs.png" alt="Fig. 6: confirm dialog, time picker, number input and the theme picker closed and open" width="100%"></p>

<p align="center"><sub><b>Fig. 6</b> · The app's own dialogs (the first three in the Domates theme).</sub></p>

## How it works

The screens live in `src/app/` (Expo Router, one file per screen). Everything you create is stored in Supabase: workouts and sets, templates and the weekly plan, trackers, sleep, food logs, measurements, streak and settings. Every table has a row-level security rule `user_id = auth.uid()`, so a signed-in user only ever reads and writes their own rows; the schema is in [`supabase/migrations/`](supabase/migrations/).

The exercise catalogue, the muscle map and the built-in food list ship inside the app (`src/data/`), like the exercise images. Only your own exercises, foods and favourites go to the database. The library therefore opens without waiting for the network.

Screens read data with a small `useDb` hook. Each data function announces the tables it wrote to, and only the screens that read those tables reload. The streak is recomputed from the raw logs whenever a relevant table changes, and only the days whose status changed are written back.

Calculations that are easy to get wrong (streak rules, calorie goal, theme colours, personal records, the exercise catalogue) are plain functions in `src/services/` and `src/theme/`, covered by the Jest tests in Fig. 3.

### Why this way?

| Decision | Why |
|---|---|
| Catalogue in the app, your data in Supabase | Browsing 260 exercises should not depend on the connection; what you log should survive a lost phone. |
| Food logs copy the food's values | Editing or deleting a food later does not change past days. |
| Region in Frankfurt (`eu-central-1`) | The first project was in Tokyo; from Turkey that is roughly 5× the round-trip time on every tap. |
| Themes from three colours | Adding a palette is one line; the derived surfaces and text keep contrast in both light and dark themes. |
| Theme change reloads the app | Styles are created once at start-up; reloading is simpler and safer than threading the theme through every component. |

## Run it

```bash
npm install
```

Put your own Supabase project in `.env` (the publishable key is meant for the client; access is limited by the row-level security rules):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Apply `supabase/migrations/` to the project (Supabase CLI `supabase db push`, or the SQL editor), then:

```bash
npx expo start
```

On the first sign-in the default weekly program, habits and goals are written to the account. Checks, as in Fig. 3:

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

```bash
npx jest
```

The README figures are rendered by `tools/render_figures.py` from the screenshots and recording in `assets/src/` (`uv run --with pillow --with imageio-ffmpeg python tools/render_figures.py`).

> [!NOTE]
> The app needs a connection: every screen reads from Supabase, and without one it shows a "server unreachable" screen. Steps are counted only while the app is open; background counting would need Health Connect and a development build. The Statistics tab is still a placeholder. The theme choice is stored on the device, not in the account.

## Credits

- Exercise data and images: [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). Body-map drawings: [MuscleMap](https://github.com/melihcolpan/MuscleMap) by Melih Colpan (MIT). Food values: USDA FoodData Central (public domain). Details and licence texts in [`CREDITS.md`](CREDITS.md).
- Design ideas (weekly calendar card, mini body map on workout cards, keeping the screen on during a workout) from [openGym](https://github.com/DuarteSantos8/openGym); no code was copied.
- Fonts in the figures: [Archivo Black](https://fonts.google.com/specimen/Archivo+Black), [Manrope](https://fonts.google.com/specimen/Manrope) and [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono), all SIL Open Font License ([`tools/fonts/`](tools/fonts/)).
- The name and numbers in the screenshots belong to a test account.

---

## Türkçe

MVM, bir kuvvet antrenmanı programını ve çevresindeki küçük günlük alışkanlıkları tek yerde toplayan kişisel bir mobil uygulama. Haftayı planlıyor, antrenman sırasında setleri kaydediyor; su, adım, uyku ve kaloriyi aynı ana ekranda takip ediyorsun. Günlük seri hepsini birbirine bağlıyor. Arayüz Türkçe.

**Teknoloji:** Expo SDK 58 (React Native 0.88, TypeScript) · veriler Supabase'de · Expo Go'da ya da development build ile çalışır.

### Demo

Şekil 2, Android emülatöründen gerçek bir kayıt (`adb screenrecord`, 1,5 kat hızlandırılmış): Bugün → Program → Kütüphane → bir kas → Profil → tema seçici → Erik & Bal. Tema değişince gelen birkaç saniyelik geliştirme modu yenilemesi kesildi. Şekil 3, 16 Kasım 2026'da çalıştırılan tip denetimi, lint ve Jest testlerinin (48 test) gerçek çıktısı; ham kayıtlar [`assets/src/checks-*.txt`](assets/src/) içinde. Şekil 4 aynı kayıttan kısa klipler.

### Ne yapıyor?

<table>
  <tr><td><b>Haftalık program</b></td><td>Her güne bir antrenman şablonu, yürüyüş ya da dinlenme atanır. Şablonlarda set, tekrar aralığı, süreli hareket, dinlenme, tek taraf ve süperset ayarları var; hareketler sürükleyerek sıralanır.</td></tr>
  <tr><td><b>Canlı antrenman</b></td><td>Her setin yanında önceki değerler, kg ve tekrar için kaydırmalı seçici, bildirimli dinlenme sayacı, süreli hareketler için kronometre, progressive overload önerisi, hacim ve kişisel rekor özeti. Geçmiş günler kilitli: dünün antrenmanı bugün doldurulamaz.</td></tr>
  <tr><td><b>Hareket kütüphanesi</b></td><td>Yaklaşık 260 hareket; dokunulabilir vücut haritasından bölgeye ya da tek kasa göre, arama, ekipman filtresi, favoriler ve fotoğraflı kendi hareketin.</td></tr>
  <tr><td><b>Günlük takip</b></td><td>Su ve adım halkaları; yatış, kalkış ve kaliteyle uyku; yatma hatırlatıcısı; her biri için 2 haftalık / 1 aylık geçmiş grafiği.</td></tr>
  <tr><td><b>Kalori</b></td><td>100 g başına değerleriyle hazır yiyecek listesi (USDA FoodData Central), gramla kayıt, makrolar, kendi yiyeceğin, son yenenler en üstte, profilden kalori ve protein hedefi önerisi (Mifflin-St Jeor).</td></tr>
  <tr><td><b>Seri</b></td><td>Antrenman günü antrenman bitince, dinlenme günü adım hedefi ya da alışkanlık listesiyle tamamlanır. Dondurma hakkı, aylık takvim, rozetler ve gün bitmediyse akşam hatırlatması.</td></tr>
  <tr><td><b>Profil</b></td><td>Kilo ve boy kaydı, BMI, hedef çizgili kilo grafiği ve tema seçici.</td></tr>
</table>

### Temalar

Profil → Tema altından seçilen dokuz tema (Şekil 5): Bordo & Bej (varsayılan), Gece & Kiremit, Şarap, Erik & Bal, Karpuz, Domates, Mandalina, Deniz, Mocha. Her tema üç renk; uygulamadaki diğer bütün renkler (yüzeyler, çizgiler, metin, kas haritası tonları) bu üçünden türetilir. Erik & Bal ve Mocha iki renkli paletlerdi; uyumlu üçüncü renk (gül kurusu `#A8456B`, karamel `#D08C60`) eklendi.

Uygulama telefonun hazır uyarı kutusunu ve saat seçicisini kullanmıyor. Onay penceresi, saat tekerleği, sayı girişi ve kısa bildirimler uygulamanın kendi bileşenleri; bu yüzden temaya uyuyorlar (Şekil 6).

### Nasıl çalışıyor?

Ekranlar `src/app/` altında (Expo Router, her ekran bir dosya). Senin oluşturduğun her şey Supabase'de tutulur: antrenman ve setler, şablonlar ve haftalık plan, takipçiler, uyku, kalori kayıtları, ölçümler, seri ve ayarlar. Her tabloda `user_id = auth.uid()` satır güvenliği kuralı var; giriş yapan kullanıcı yalnızca kendi satırlarını okuyup yazabilir. Şema [`supabase/migrations/`](supabase/migrations/) içinde.

Hareket kataloğu, kas haritası ve hazır yiyecek listesi, hareket görselleri gibi uygulamanın içinde gelir (`src/data/`). Veritabanına yalnızca kendi hareketlerin, yiyeceklerin ve favorilerin gider; bu yüzden kütüphane ağı beklemeden açılır.

Ekranlar veriyi küçük bir `useDb` kancasıyla okur. Her veri fonksiyonu yazdığı tabloları duyurur ve yalnızca o tabloları okuyan ekranlar yenilenir. Seri, ilgili bir tablo değiştiğinde ham kayıtlardan yeniden hesaplanır ve yalnızca durumu değişen günler geri yazılır.

Yanlış yapması kolay hesaplar (seri kuralları, kalori hedefi, tema renkleri, kişisel rekorlar, hareket kataloğu) `src/services/` ve `src/theme/` altında saf fonksiyonlar; Şekil 3'teki Jest testleri bunları kapsar.

#### Neden böyle?

| Karar | Neden |
|---|---|
| Katalog uygulamada, verin Supabase'de | 260 harekete göz atmak bağlantıya bağlı olmamalı; kaydettiklerin telefon kaybolsa da kalmalı. |
| Kalori kaydı yiyeceğin değerlerini kopyalar | Yiyeceği sonradan değiştirmek ya da silmek geçmiş günleri bozmaz. |
| Sunucu Frankfurt'ta (`eu-central-1`) | İlk proje Tokyo'daydı; Türkiye'den her dokunuşta yaklaşık 5 kat gidiş-dönüş süresi demek. |
| Temalar üç renkten | Yeni palet eklemek tek satır; türetilen yüzey ve metin renkleri açık ve koyu temada okunur kalır. |
| Tema değişince uygulama yeniden yüklenir | Stiller açılışta bir kez oluşur; yeniden yüklemek, temayı her bileşene taşımaktan basit ve güvenli. |

### Kurulum

```bash
npm install
```

`.env` dosyasına kendi Supabase projeni yaz (publishable anahtar istemci için tasarlanmıştır; erişimi satır güvenliği kuralları sınırlar):

```
EXPO_PUBLIC_SUPABASE_URL=https://<proje>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`supabase/migrations/` dosyalarını projene uygula (Supabase CLI ile `supabase db push` ya da SQL Editor), sonra:

```bash
npx expo start
```

İlk girişte varsayılan haftalık program, alışkanlıklar ve hedefler hesaba yazılır. Denetimler Şekil 3'teki gibi: `npx tsc --noEmit`, `npx expo lint`, `npx jest`. README görselleri `assets/src/` içindeki ekran görüntüleri ve kayıttan `tools/render_figures.py` ile üretilir.

> [!NOTE]
> Uygulama bağlantı ister: her ekran Supabase'den okur, bağlantı yoksa "sunucuya ulaşılamadı" ekranı çıkar. Adımlar yalnızca uygulama açıkken sayılır; arka planda saymak Health Connect ve development build gerektirir. İstatistik sekmesi henüz yer tutucu. Tema seçimi hesapta değil, cihazda saklanır.

### Emeği geçenler

- Hareket verisi ve görselleri: [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense). Vücut haritası çizimleri: Melih Colpan'ın [MuscleMap](https://github.com/melihcolpan/MuscleMap) projesi (MIT). Yiyecek değerleri: USDA FoodData Central (kamu malı). Ayrıntılar ve lisans metinleri [`CREDITS.md`](CREDITS.md) içinde.
- Tasarım fikirleri (haftalık takvim kartı, antrenman kartında mini vücut haritası, antrenmanda ekranın açık kalması) [openGym](https://github.com/DuarteSantos8/openGym) projesinden; kod kopyalanmadı.
- Görsellerdeki yazı tipleri: Archivo Black, Manrope ve IBM Plex Mono, hepsi SIL Open Font License ([`tools/fonts/`](tools/fonts/)).
- Ekran görüntülerindeki ad ve sayılar bir test hesabına ait.
