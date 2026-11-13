# Sonraki oturum promptu

Aşağıdaki metni yeni oturumda olduğu gibi yapıştır.

---

Bu proje Expo SDK 58 + TypeScript + Expo Router ile yazılmış, tamamen offline bir antrenman ve alışkanlık uygulaması (bordo-bej-siyah tema, `src/theme/colors.ts`). Dal: `feature/antrenman-uygulamasi`. Plan `PLAN.md`'de. Önce `AGENTS.md`, `PLAN.md` ve `CREDITS.md`'yi oku, `npm test` ve `npx tsc --noEmit` ile temiz başladığını doğrula. Her değişiklikten sonra tip kontrolü, lint ve testleri çalıştır. Bittiğinde uygulamayı Android emülatöründe (Medium_Phone_API_36.1, Expo Go) gerçekten açıp ekran görüntüleriyle doğrula.

## 1. Önceki testten kalan sorunlar

1. Adım ekleme penceresinde (NumberPrompt, `autoFocus`) klavye açıkken "Kaydet"e ilk basış sadece klavyeyi kapatıyor; tek basışta kaydetsin.
2. Kütüphane sekmesinin ilk açılışı 3 sn'den uzun sürüyor (259 hareket + büyük SVG harita). Listeyi ve haritayı hızlandır (ör. görselleri tembel yükle, haritayı memo'la, ilk açılışta iskelet göster).
3. Dinlenme bitti bildirimi Android'de ~45 sn gecikiyor (kesin alarm izni yok). Dev build için `app.json`'a `SCHEDULE_EXACT_ALARM` iznini ekle; Expo Go'da bunun çalışmayacağını not et.
4. Su değerinin test sırasında bir kez açıklanamayan şekilde 3 L'den 10,5 L'ye çıkması: `WaterCard`/`Counter` dokunma mantığını incele, çift tetiklenme veya hayalet dokunuş ihtimalini ele.
5. Test edilemeyenleri doğrula: sabah uyku sorusu (04:00–12:00), favori yıldızı, kendi hareketini ekleme formu, yeni `onValueChange`/`onDismiss` API'li saat seçici.

## 2. Kilo ve tekrar seçici (aktif antrenman)

Aktif antrenman ekranında kg ve tekrar kutularına elle yazmak zahmetli. Kutuya dokununca uygulamanın kendi alttan açılan seçicisi açılsın:
- **Tekrar:** 5–20 arası.
- **Kilo:** 2,5–50 kg arası, 2,5 kg adımlarla (2,5 · 5 · 7,5 · … · 50).
- Kaydırmalı tekerlek (wheel) veya büyük dokunulabilir ızgara; önceki/önerilen değer seçili gelsin.
- Elle yazma seçeneği gerekirse küçük bir "elle gir" bağlantısıyla kalsın.

## 3. Android'e bağımlı olmayan kendi arayüz parçaları

Uygulama şu an Android'in kendi pencerelerini kullanıyor (`Alert.alert` onay pencereleri — ör. büyük harf "BITIR" hatası —, mavi saat seçici, kırmızı hata ekranı). Hepsini temaya uygun, uygulamanın kendi bileşenleriyle değiştir:
- Kendi onay/uyarı penceresi (`ConfirmDialog`): başlık, açıklama, birincil/ikincil buton, tehlikeli işlem için bordo vurgu.
- Kendi saat seçici (tekerlek, 24 saat), `@react-native-community/datetimepicker` yerine.
- Kendi hata ekranı: Expo Router'ın `ErrorBoundary` export'u ile, Türkçe mesaj ve "Tekrar dene" butonu.
- Kendi kısa bildirim (toast) bileşeni: "Pazartesi antrenmanına eklendi" gibi geri bildirimler için.

## 4. Akıcılık ve animasyonlar

Profesyonel uygulamalardaki gibi akıcı olsun:
- Ekran geçişleri: yumuşak kayma/solma (Stack animasyonları), tab geçişinde içerik hafif solarak gelsin.
- Alttan açılan pencereler (`Sheet`): şu anki RN `Modal` slide'ı yerine Reanimated ile yaylanan açılış, arka planın ayrıca solması, aşağı sürükleyerek kapatma.
- Liste ve kart girişleri: yukarıdan aşağıya sıralı, hafif gecikmeli (stagger) belirme; her şeyin aynı anda rastgele gelmesi olmasın.
- Basma geri bildirimi: butonlarda hafif küçülme (scale 0.97) ve opaklık.
- **İskelet (skeleton) yükleme:** Veri gelene kadar her ekranda kartların gri iskeletini göster, hafifçe parlasın (shimmer); veri hazır olunca içerik yumuşakça yerine otursun. Ortak bir `Skeleton` bileşeni yaz ve `useDb` yüklenirken (`undefined`) kullan.

## 5. Ana sayfadaki minik vücut haritaları

"Bugünün antrenmanı" kartındaki tam boy minik mankenler çok küçük ve okunmuyor. Yeniden tasarla:
- Tüm vücut yerine sadece çalışılan kasları ve çevresini göster (bacak günü → sadece bacaklar; üst vücut → gövde ve kollar). `BodyMap`'e kırpılmış viewBox (odak bölgesi) desteği ekle; odak kutusu, vurgulanan kasların sınır kutularından (`body.front/back.boxes`) hesaplansın.
- Daha büyük ve belirgin olsun; kontrastı artır.
- Aynı yaklaşımı Program sekmesindeki satırlara da uygula ya da orada kaldır.

## 6. Görsel düzeltmeler

- Metinlerin kutulara sığmadığı her yeri bul ve düzelt (`numberOfLines` + `adjustsFontSizeToFit` ya da yerleşimi değiştir). Uzun İngilizce hareket adlarını ve dar ekranları (360 dp) kontrol et.
- Köşesi keskin kalan kutu, input, liste satırı, pencere ve resimleri yuvarlat (tema `radius` token'ları); keskin dikdörtgen kalmasın.
- Program satırlarındaki gün rozetleri, tablo hücreleri, aktif antrenman kg/tekrar kutuları dahil tüm ekranları tek tek gözden geçir.

## 7. Sadelik

Ekranları işlevlerini kaybetmeden sadeleştir; uygulamayı ilk kez açan biri rahat kullanabilsin:
- Her ekranda tek bir ana eylem öne çıksın, ikincil eylemler menüye/geri plana gitsin.
- Gereksiz metinleri ve tekrar eden bilgileri kaldır; boş durumlarda (veri yokken) ne yapılacağını söyleyen kısa yönlendirme göster.
- İlk açılışta 2–3 adımlık kısa bir tanıtım (isim, hedefler) düşün; atlanabilir olsun.

## Kurallar

- Renkler sadece `src/theme/colors.ts`'den; yeni renk gerekirse oraya token ekle.
- Yeni bağımlılık gerekiyorsa `npx expo install` kullan ve Expo Go ile uyumlu olduğundan emin ol (SDK 58; Gesture Handler 3 — eski `GestureDetector`/`PanGestureHandler` API'lerine dayanan kütüphanelerden kaçın).
- React Compiler açık: render sırasında null olabilen state'e closure içinden `!` ile erişme (Program çökmesinin sebebi buydu); değerleri render başında güvenle oku.
- Her büyük adımdan sonra kısa bir özet ver ve emülatörde ekran görüntüsüyle doğrula.
