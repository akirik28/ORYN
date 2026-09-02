# Karar: başarısız okuma, boş sonuçtan ayırt edilebilir olmalı

**Durum: karara bağlandı (oryn-a7, 2026-09-03).** Bu çatal bir gecede iki bağımsız
soruşturmada, farklı açılardan çıktı — `docs/absence-as-known-value-inventory-2026-09-03.md`
(73 örnek, 15 dosya) ve `docs/eligibility-boolean-refactor-notes-2026-09-03.md`. Üçüncü kez
keşfedilmeden merkezden karara bağlanıyor.

## Sorun

`.data ?? []` — sorgu patladığında da boş dizi, veri gerçekten yokken de boş dizi.
Çağıran taraf ikisini ayırt edemiyor. Ürün genelinde bir kural yok.

Bu gece bunun dört canlı örneği bulundu: puanlama, kabul rozeti, uygunluk, ve maliyet.
Hepsinde sonuç aynı biçimdeydi — **yokluk, bilinen bir değermiş gibi okundu.**

## Karar

**Kural:** başarısız bir okuma, hiçbir zaman "veri yok" ile aynı çıktıyı üretmemeli.

Ama 73 çağrı yerini tek seferde yeni bir `Result` tipine geçirmiyoruz. Sonuca göre üç
katman, ve sırası bu:

### 1. Öğrenciye bir iddia üreten her okuma — zorunlu, hemen

Puan, öneri, uygunluk, sıralama, ve **yapay zekâya giden her bağlam.**

Burada başarısız okuma sessizce düşük bir puan, eksik bir öneri, ya da modele
söylenmemiş bir gerçek üretir — ve çıktı kendinden emin görünür. Bu gece bulunan dört
hatanın dördü de bu katmandaydı.

Gereken: okuma başarısızsa çağıran bunu **bilecek.** En azından hangi kategorinin
düştüğü loglanacak (oryn-31 `assembleScoringFacts` için bunu yaptı), ve iddia üreten kod
"bilmiyorum" diyebilecek.

### 2. Ekrana liste basan her okuma — zorunlu, sonra

"Yüklenemedi" ile "henüz bir şey yok" farklı cümleler. Boş durum ekranı öğrenciye
"hadi ekle" diyorsa ve aslında sorgu patladıysa, öğrenciyi kendi verisi yokmuş gibi
suçlamış oluyoruz.

Basit bir bayrak yeter; yeni bir tip gerekmiyor.

### 3. Yönetim/operasyon ekranları — aynı kural, en son

Aynı doğruluk beklentisi, ama izleyicisi tek kişi ve o kişi neye baktığını biliyor.

## Uygulama biçimi

**Yeni bir `Result<T,E>` tipi ürün geneline dayatılmıyor.** Sebebi: 73 çağrı yerini bir
gecede değiştirmek, bu gece dört kez görülen sessiz-silme sınıfı merge hatasının tam
davetiyesi olur.

Bunun yerine `.data ?? []` yerine, hatayı loglayan ve düştüğünü çağırana bildirebilen
ortak bir yardımcı. Katman 1'deki çağıranlar bunu okur; katman 2 ve 3 bayrağı görmezden
gelebilir ve bugünkü gibi çalışmaya devam eder. Geçiş kademeli, her adım tek başına
birleştirilebilir.

## Bu kararla birlikte kapanmayan şey

`eligible` alanının iki durumlu oluşu ayrı bir konu ve **founder'da kalıyor** — o alanın
anlamını değiştirmek panoyu, danışmanı ve öneri sıralamasını birden etkiliyor. Bu karar
sadece "okuma patladı mı" sorusunu kapsıyor, "veri yok mu, yoksa kimse bakmadı mı"
sorusunu değil. İkisi benziyor ama farklı: birincisi teknik, ikincisi ürün.
