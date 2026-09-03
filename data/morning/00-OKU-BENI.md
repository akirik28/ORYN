# Sabah — 3 Eylül 2026

Uyandığında sırayla bunlar. **Dokuz bölüm, tahminen 25 dakika.** Yedisi kopyala-yapıştır
(Supabase SQL Editor'e), biri terminalde altı komut, sonuncusu sadece bakmak.

**Sonunda ne değişmiş olacak:**

| | |
|---|---|
| Panelin yazma tarafı | çalışır hale gelir (15 migration) |
| Kurum adı boş fırsat | 190 tanesi dolar |
| İncelemedeki kayıt | 84'ü öğrencinin göreceği katalog'a geçer |
| Üniversite gereksinimi | 14 kurumda 141 satırdan 351'e |
| Yeni fırsat | 15 tane eklenir |
| Tekrar eden öneri | 98 kopya silinir, gerçek olan kalır |
| Kumanda merkezi | açılır ve kullanılabilir olur |

Yarısında durursan kalan yarısı bozulmaz. İki sıra kuralı var:

- **1 ve 2, 8'den önce.** Kumanda merkezinin bütün yazma tarafı — fiyat, kur, Ultra hediye,
  katman değiştirme, iş kontrolleri, model fiyatlandırma, işlem defteri — henüz canlıda
  **var olmayan** on tabloya yazıyor; hepsini 2. adımdaki migration'lar oluşturuyor. Önce
  paneli açarsan ekranlar görünür ama her düğme ölüdür.
- **5, 7'den önce** (sebebi 5. adımda yazıyor).

Gerisi gerçekten istediğin sırada: 3, 4, 5, 6, 7 ve 7b'nin dokunduğu tabloların hepsi şu an
canlıda mevcut — tek tek kontrol ettim, varsaymadım.

## 1. Kendini admin yap

Supabase SQL Editor:

```sql
RESET ROLE;
SET ROLE service_role;
UPDATE public.profiles SET is_admin = true
WHERE id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d';
RESET ROLE;
SELECT id, is_admin FROM public.profiles
WHERE id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d';
```

`is_admin` **true** dönmeli.

`SET ROLE service_role` satırı şart — onsuz `UPDATE 1` der ve hiçbir şey değiştirmez
(`profiles_00_guard_protected_columns` trigger'ı sessizce geri alır, canlıda doğrulandı).

Not: hesabın **2 Eylül 22:18'den beri zaten admin** — gece panelleri denerken açılmış. Yani
bu adım büyük ihtimalle hiçbir şeyi değiştirmeyecek, ki zararsız. Yine de çalıştır: panelin
açılması buna bağlı ve emin olmanın tek yolu sorgunun kendisi.

## 2. Migration'ları uygula

`01-migrations-2026-09-03.sql` — tamamını yapıştır, çalıştır. **On beş migration ama on
dördü yeni** — 0090 canlıda zaten uygulanmış, dosyada duruyor çünkü tekrar çalışması
zararsız. Hepsi tek
işlem içinde. Bir tanesi patlarsa hiçbiri uygulanmaz ve tekrar çalıştırmak güvenli.

Sıra kesintisiz. Bir ara 0101 eksikti — sahibi oturum push edemiyordu — ama engel kalktı
ve iş birleşti. **Yani sabaha bekleyen bir engel kalmadı.**

Sonuncu ikisi gece bitiminde geldi: yeni kayıtları kapatma, bakım modu ve deneme süresi
ayarları. **Üçü de güvenli varsayılanla geliyor** — kayıt açık, bakım kapalı, deneme 7 gün.
Uyguladığın an hiçbir şey kapanmıyor.

**Bu adım olmadan panelin yazma tarafının çoğu çalışmaz.** Hediye etme, iş durdurma, bütçe
ayarlama, kur ve fiyat kaydetme — hepsi bu migration'lara bağlı.

Ama ölü düğme görmeyeceksin. Tarayıcıda tek tek kontrol ettim: her biri hangi migration'ı
beklediğini adıyla söylüyor, örneğin *"Henüz kurulmadı — hediye verebilmek için 0106
(profiles.ultra_gift_expires_at) migration'ının uygulanması gerekiyor."* On bir hediye
düğmesinin on biri de gerçekten pasif, sadece soluk görünmüyor.

**Bir şey ise şu an, hiçbir şey uygulamadan çalışıyor:** katman değiştirme (Ultra yap /
Standart yap). O sütun veritabanında zaten var. Yani panele girer girmez kendi hesabını
Ultra'ya alıp öğrencinin ne gördüğünü görebilirsin.

## 3. Bekleyen veriyi doldur

`02-veri-doldurma-2026-09-03.sql` — **377 düzeltme ifadesi, 213 tekil kayıt.** En görünür
etkisi: kurum adı boş olan **190 kayıt dolacak**, ve 78 kayıt tek tek doğrulanmış haliyle
`under_review`'dan `active`'e geçecek — yani öğrencinin göreceği katalog büyüyecek.

**İkisini son anda çıkardım, sebebiyle birlikte.** Aktife çekilecek kayıtların arasında
çıplak kurum adı taşıyan dokuz tane vardı (Cornell, Harvard, Brown, Chicago, Columbia,
Miami, Penn, Toronto, Tulane). Dokuzunu da zaten aktif olan kardeşleriyle yan yana
okuttum. **Yedisi gerçekten farklı program** — Cornell'inki Cornell'in *online* seçeneğini
kapsıyor, Columbia'nınki *yatılı* olanı (aktif olan gündüzlü), Penn'inki mühendislik
akademisi. İkisi ise değil:

- **Harvard**: yaş koşulu zaten aktif olan "Harvard Secondary School Program" ile neredeyse
  birebir aynı ("en az 16, 31 Temmuz'dan önce 19 olmayacak"). Bu kadar özgül bir koşul iki
  ayrı programda tesadüf etmez — aynı programın ikinci kaydı.
- **Chicago**: kendi açıklaması dört programı sayıyor, ve o dördü zaten aktif olan kardeş
  kaydın **başlığında** aynen geçiyor.

İkisi de dosyada duruyor ama yorum satırına alındı, gerekçesi yanına yazılı. Açmak
istersen `--` işaretlerini silmen yeterli. Sayı bu yüzden 84 değil 78.

Şu anki durum (2026-09-03 02:40, canlı ölçüm — **kapsam yazılı, çünkü kapsamsız sayı
karşılaştırılamıyor**):

| Kapsam | Kayıt | Kurum adı yok | Son tarih yok | Görsel yok |
|---|---|---|---|---|
| Hepsi | 421 | 197 | 339 | 356 |
| Sadece `active` | 282 | 66 | 205 | 218 |
| `active` + `under_review` | 394 | 172 | 314 | 330 |

Bir sayıyı ayrıca söylemem gerek, çünkü tablodaki "son tarih yok" sütunundan daha kötü:
**282 aktif fırsatın sadece 37'sinin son tarihi gelecekte.** Kalan 245'in ya hiç tarihi yok
ya da tarihi geçmiş. Yani panonun "yaklaşan son tarihler" bölümü, haftalık plandaki aciliyet
sıralaması ve eşleştirmedeki aciliyet katsayısı — üçü de katalogun **%13'ünden** besleniyor.
Ölçüldü, ve cevap "araştırıp doldururuz" değil: 61 sayfa elle okundu. Küçük bir grupta
tarih gerçekten sayfada duruyor, doldurulmayı bekliyor. Küçük bir grup açıkça ve doğru
olarak tarihsiz ("yıl boyu başvuru alınır", ya da programın kendi deyimiyle "tarih henüz
belli değil"). **En büyük grup ise tek bir sayfa okumasıyla anlaşılamıyor** — okunabilir
sayfaların %38'inde ne bir tarih ne de "son başvuru" gibi bir kelime geçiyor.

Yani bu boşluğun büyük kısmı araştırma eksikliği değil; kaynağın kendisi söylemiyor.
Ayrıntı: `docs/opportunity-deadline-coverage-measurement-2026-09-03.md`.

Paket **190** kaydın kurum adını dolduruyor (hepsi hâlâ boş, tek tek doğrulandı). Toplamda
197 boş var. O 7 farkın ne olduğuna baktım ve beklediğim şey çıkmadı: **7'sinin de kurum
adı eksik değil, 7'si de geçerli fırsat kaydı değil.** İkisi dizin sayfası, biri üniversite
ders kataloğu kaydı, birinin başlığı harfiyen `"Time: 4:30pm – 5:30pm (Hong Kong time)"`.
İkisinin adresi bambaşka bir yere gidiyor (Google CSSI kaydı Northeastern Illinois'in lisans
sayfasına, Exeter kaydı bir akademisyenin profiline — doğru adres kaydın kendi açıklamasında
yazılı). Biri de kapanmış bir marka: Duke TIP artık Duke Pre-College, canlıda doğrulandı.

Ayrıntı: `docs/yedi-kapsanmayan-kayit-2026-09-03.md`. **SQL hazırlamadım** — kurum adı
doldurmak dördü için de yanlış düzeltme olurdu. Duke'un kimliğini değiştirmek senin kararın.

**Bu adımın bir yan etkisini bilmen gerekiyor, çünkü aşağıdaki kararlardan birini
etkiliyor.** İncelemedeki 112 kaydın hiçbirinde kimin başvurabileceği kayıtlı değil — ne yaş
ne sınıf. Aktife çekilen 78 kayıt oradan geliyor. Yani bu adımdan sonra, öğrencinin gördüğü
katalogda "kimin başvurabileceğini bilmiyoruz" durumundaki kayıt sayısı **128'den ~206'ya**
çıkıyor.

Kayıtların kendisi sorunlu değil — tek tek doğrulandılar. Sorun, `eligible` alanının
"bilmiyoruz" diyememesi (aşağıdaki kararlardan biri): sınır kaydedilmemiş bir kayda motor
"uygun" diyor. Yani bu adım o kararı **daha acil** hale getiriyor, daha az değil. Adımı
durdurmanı önermiyorum; sadece sırayı bilerek kurman için söylüyorum.

*(Bu sayıyı sana daha önce 189 diye yazmıştım, yanlıştı — sadece yaş alanına bakıyordum.
Ürünün `eligible_grades` diye ikinci bir alanı var ve 282 aktif kaydın 95'inde o dolu.
İkisinden biri doluysa kimin başvurabileceği aslında biliniyor: 154 kayıtta biliniyor,
128'inde bilinmiyor. Bunu 31 kendi ölçümünde yakaladı — benim verdiğim görev yanlış alanı
sayıyordu.)*

## 4. Tek tek kayıt düzeltmeleri

`03-firsat-kayit-duzeltmeleri-2026-09-03.sql` — iki gerçek düzeltme. Google CSSI'nin adresi
(canlı doğrulandı: `g.co/cssi`, yalnızca Google'ın oluşturabileceği bir kısa link, oraya
yönleniyor) ve Maastricht kaydının kapatılması.

**Benim yazdığım bir varsayım burada çürüdü ve bunu bilmen daha iyi:** Exeter kaydı için
"doğru adres zaten kaydın kendi açıklamasında yazılı" demiştim. d0 o adresi çalıştırıp
kontrol etti — **404.** Bulunabilen diğer Exeter sayfaları da kaydın anlattığı şeye uymuyor
(biri üniversite öğrencileri için, diğeri ayrı markalı ve yalnızca fen alanında). Dosyanın
sonunda yorum satırı olarak duruyor, gerekçesiyle birlikte. Çalıştırıp çalıştırmamak sana
kalıyor. Duke TIP'e hâlâ dokunulmadı.

**Maastricht hakkında iki lane farklı sonuca vardı, ikisi de doğru olabilir.** d0 kaydı
kapattı: başlık bir kurum-ülke ifadesi, açıklama bir ders izlencesi parçası, adres üçüncü
taraf bir dizin — yani kayıt bozuk. Ama 6e saatler sonra, bambaşka bir iş sırasında,
**gerçek Maastricht Summer School adresini buldu**: `maastrichtsummerschool.nl/courses/`.
Yani program gerçek; bozuk olan bu kayıt. İkisi çelişmiyor ama sonuçları farklı: kapatmak
mı, yoksa kaydı düzeltip programı katalogda tutmak mı? Bu senin kararın, ve kapatma
geri alınabilir.

## 5. Üniversite giriş gereksinimleri

`04-universite-gereksinimleri-2026-09-03.sql` — **14 kurum, 210 satır** (Caltech'in 19 satırı, uzlaştırılmış 37 satırla değiştirildi). Oxford, Cambridge,
Imperial, Warwick, MIT, Caltech, Harvard, Princeton, Bocconi, TU Delft, ODTÜ, Boğaziçi,
Koç, Sabancı. Bu kurumlar 141 satırdan 351'e çıkıyor.

Canlıda deneme çalıştırıldı, sıfır hata.

**Tek sıra kuralı: bu, 7. adımdan önce çalışmalı.** 7. adım "bugün var olanı görülmüş say"
diye çalışıyor; bu dosya sonra çalışırsa 210 yeni satır ikinci bir toplu ekleme olur ve 7.
adımın tam olarak engellemek için var olduğu yanlış bildirimi bu sefer kendi elimizle
üretiriz. Sırayı kaçırdıysan çare basit: 7. adımı tekrar çalıştır, aynı dosya, zararsız.
Deploy etmeyeceksen ikisinin de acelesi yok. Ürünün en ince yeri burasıydı — 17.046 programın 32'si kapsanıyordu.

Dürüst kısmı: bu satırların hepsi **üniversite geneli**, programa bağlı değil. Yani "kaç
program kapsanıyor" sayısı yine 32'de kalıyor. Derinlik geldi, kapsam genişliği değil.

## 6. Yeni fırsatları katalog'a al

Altı parti hazır bekliyor, **17 yeni fırsat.** Terminalden, sırayla:

```bash
npm run ingest:opportunities -- data/research/opportunities/batch-category-balance-2026-09-03.jsonl --apply
```
```bash
npm run ingest:opportunities -- data/research/opportunities/batch-catalog-fill-2026-09-03.jsonl --apply
```
```bash
npm run ingest:opportunities -- data/research/opportunities/batch-catalog-scale-2026-09-03.jsonl --apply
```
```bash
npm run ingest:opportunities -- data/research/opportunities/batch-catalog-format-seam-2026-09-03.jsonl --apply
```
```bash
npm run ingest:opportunities -- data/research/opportunities/batch-scholarship-corridor-2026-09-03.jsonl --apply
```
```bash
npm run ingest:opportunities -- data/research/opportunities/batch-thin-categories-2026-09-03.jsonl --apply
```

`--apply` olmadan çalıştırırsan sadece ne olacağını gösterir, hiçbir şey yazmaz. Üçünü de
öyle çalıştırdım: **17 kabul, 5 red.**

Reddedilen üçü hakkında: bd o kayıtları zaten "kaynağın kendi sitesinden doğrulanamadı,
ikinci el kaynağa dayanıyor" diye işaretlemişti. **Kapı da bağımsız olarak aynı kararı
verdi** — biri "arama sonucu keşif kanıtıdır, doğrulama değil" diyor. Yani sistem, insanın
dürüst uyarısını kendi başına teyit etti. Bu üçü katalog'a girmiyor, doğrusu da bu.

Girecek onbeş — ilk dokuz: Forage (ücretsiz iş simülasyonları), NYAS Junior Academy,
sci-MI (ücretsiz dünya çapında araştırma mentorluğu), Pivotal Essay Contest, Medicine
Encompassed, CS50x, Zooniverse, iNaturalist, Emory Winship (sanal).

Sabaha karşı eklenen altı: Hack Club, Global Appathon, Discover MUN — ve **burs
kategorisinden üç tane**, ki bu kategori bugün katalogda sadece 9 kayıt.

Burs tarafında asıl anlatılması gereken şey **kabul edilenler değil, reddedilenler.** 13
aday araştırıldı, 10'u elendi ve her biri ayrı bir sebeple: Elks yalnız ABD vatandaşlarına;
DAAD, KYK, Anadolu Vakfı, Sabancı — hepsi üniversite seviyesinde, yaş bandı tutmuyor.
Sevenoaks'ın bursu kendi sayfasına göre onursal, gerçek para desteği ise okulun Kent'teki
çevresinde oturan gündüzlü öğrencilere ayrılmış — yani Türkiye'den erişilemiyor. Robert
Kolej'in kendi sayfası bu dönemin hazırlık sınıfı fonunun **tükendiğini** yazıyor; eklesek
bugün yanlış olan bir şey yazmış olurduk. Darüşşafaka ve UWC ikisi de doğru adaydı ama her
iki sitede de otomatik erişim 403 döndü — arama özetine dayanıp yazmak yerine dışarıda
bırakıldı.

Yani burs kategorisi 9'dan 12'ye çıkıyor, 30'a değil. Tavan gerçek: bu yaş grubuna
Türkiye'den gerçekten açık olan burs sayısı az.

Son partideki iki red ayrı bir cinsten ve bilerek öyle bırakıldı: kayıtlar gerçek ve
alıntılı, ama kaynağın kendi sitesine her erişim denemesi başarısız oldu, o yüzden "arama
sonucundan" diye işaretlendiler — ve kapı da tam olarak bunu reddetti. Araştırma çöpe
atılmadı, kanıt seviyesi yeterli olmadığı için katalog'a girmedi.

**Ve bir tanesi zaten katalogda ama yanlış yerde.** Breakthrough Junior Challenge — 13-18
yaş, dünya çapında, 250 bin dolarlık burs, son tarih **15 Eylül, 12 gün** — `competition`
olarak kayıtlı, yani bugün "burs" diye arayan öğrenci bulamıyor.

Bunu tam denetlettim, çünkü "acaba daha kaç tane var" sorusunun cevabı önemliydi. **Cevap:
bir tane, o da bu.** 282 aktif kaydın tamamı tarandı, en karışabilecek üç kategori tek tek
elle okundu. Breakthrough'nun ayrıcalığı şu: ödülün adını *organizasyonun kendisi*
"250.000 dolarlık yüksek öğrenim bursu" koymuş — bizim yorumumuz değil.

Bulunan diğer sekiz kayıt "yanlış" değil, **iki kategoriye birden ait** — JAX Summer
Student (hem tam burslu araştırma bursu hem gerçek bir yaz programı), Nuffield, Simons,
Scholastic. Onlara dokunulmadı: tek tek taşımak aynı tek-sütun sıkışmasını başka yere
kaydırmaktan başka bir şey yapmaz.

Yani bu da yukarıdaki üç alanla (`eligible`, `cost`, `deadline`) aynı aileden dördüncü bir
şey: **bir kaydın aynı anda iki şey olabilmesi için yer yok.** Hazır bekleyen tek satırlık
düzeltme (`data/research/opportunity-category-relabel-2026-09-03.sql`) Breakthrough'yu
burs'a taşıyor — ama o da onu yarışma listesinden çıkarıyor, ki hâlâ bir yarışma. Senin
kararın; son tarih 12 gün sonra.

## 7. Yayına almadan önce — sadece deploy edeceksen

`05-universite-bildirim-arka-doldurma-2026-09-03.sql`

**Bunu çalıştırmadan deploy edersen üç öğrenciye yanlış bildirim gider.** Sebep: bildirim
işi "üniversite bilgisi güncellendi" diye haber veriyor, ama şu an tetikleyecek olan şey
gerçek bir değişiklik değil — **bizim kendi katalog araştırmamız.** 21 Ağustos'ta üç dakika
içinde 87 satır eklenmiş, saniyenin altında aralıklarla, bir düzine program sayfasından.
Hiçbir üniversite üç dakikada bir düzine gereksinim değiştirmez.

Dosya, bugün var olan 10 eşleşmeyi kayıt defterine işliyor — yani iş ilk çalıştığında
"bugünden itibaren" saymaya başlıyor, iki haftalık araştırmayı geriye dönük haber
yapmıyor.

Deploy etmeyeceksen acelesi yok. Edeceksen **önce bu.**

## 7b. Kendi hesabındaki tekrar eden önerileri temizle

`06-oneri-tekrar-temizligi-2026-09-03.sql`

30 Ağustos'ta, 38 dakikalık bir pencerede "Yeniden oluştur" düğmesine art arda basılmış ve
**aynı öneri hesabına 99 kez yazılmış** — "Oxbridge Academic Programs", hepsi birebir aynı
metin. Yazma tarafındaki kusur zaten düzeltildi ve bir daha bu şekli üretmiyor; duran şey
geçmişte oluşmuş 98 fazla satır.

Neden önemli: danışman, haftalık plan üretirken "bunu tekrar önerme" listesini senin en son
15 önerinden dolduruyor. Şu an o 15'in neredeyse tamamı bu tek kopyadan geliyor. Yani bunu
çalıştırmadan bir plan üretirsen, danışman senin gerçek geçmişini değil aynı başlığın
gürültüsünü okuyor olacak.

Deneme çalıştırıldı: 98 satır siliniyor, en erken gösterilen gerçek öneri kalıyor.
Silme koşulu sadece başlığa değil, **her alana** bakıyor — gerçek bir cevap ya da not
taşıyan bir satır hangi durumda olursa olsun kapsam dışında.

Bir şeyin bilerek dışarıda bırakıldığını da söylemek gerek: başka bir hesapta aynı başlığı
paylaşan 2 satır bulundu, ama metinleri farklı — yani tesadüfen aynı başlığı taşıyan iki
gerçek öneri. Dokunulmadı. Sayı benziyordu, içerik benzemiyordu.

## 8. İki paneli karşılaştır

**`/admin`** — bugünkü hali. Ondört bölüm, tek sayfa.

**`/kumanda`** — onayladığın tasarımın gerçek hali. Ayrı uygulama kabuğu, açık yeşil zemin,
kendi sol rayı, **on iki ekranın on ikisi de yazıldı ve gerçek veriyle çalışıyor** — Genel
Bakış, Kâr & Zarar, Trafik, Öğrenciler, Harcama, Katalog, Araştırma, Topluluk, Moderasyon,
Sistem, Defter, Ayarlar.

Bunu tarayıcıda tek tek açıp gördüm, koda bakıp varsaymadım. Gece boyunca bu belge
"şu an sadece iskelet" diyordu; o cümle yazıldığında doğruydu, sabaha kadar doğru kalmadı.

**İçeri girince ilk yapılacak şey: Ayarlar'dan USD/TRY kurunu gir.** Kâr & Zarar ekranı
kuru bilmeden hesap yapamaz ve şu an dürüstçe `—` "kur ayarlanmamış" gösteriyor. Kuru
girdiğin an gelir, maliyet, kâr ve başabaş noktası canlanıyor. Fiyatı da orada
değiştirebilirsin; hesap anında güncelleniyor.

Migration'ları uyguladıktan sonra bazı ekranlar "tablo var ama içi boş" durumuna geçecek —
bu beklenen hal, hata değil. Kontrol ettim: hepsi bunu sessizce "ayarlanmamış" diye
gösteriyor, boş bir sayfa ya da hata değil.

`/admin` yerinde duruyor ve çalışmaya devam ediyor. İkisini yan yana görüp karar ver:
`/kumanda` doğru yolsa `/admin`'i oraya yönlendiririz.

**Yapmadığım bir şeyi söylemem gerekiyor: görseller.** "Şu yeşil yuvarlaklı görselleri
ChatGPT'ye tasarlattır" demiştin. ChatGPT'yi buradan çağıramıyorum — başka bir servise
gidip görsel ürettiremem. Ray ve kartlar şu an ikon kullanıyor, üretilmiş görsel değil.

İki yol var, ikisi de sende: ya sen ChatGPT'de üretip dosyaları verirsin, yerleri hazır;
ya da biz kendi çizimlerimizi yaparız (kontrol merkezinin grafikleri zaten öyle, dışarıdan
kütüphane değil, bizim SVG'lerimiz). İkincisini isteyip istemediğini bilmediğim için
kendiliğimden yapmadım — istediğin ChatGPT'nin çizimiydi, benimki değil.

Not: ikisi de admin olmayana **404** veriyor, yönlendirme değil — panelin var olduğunu
bile belli etmiyor. Canlıda doğrulandı.

---

## Senin kararını bekleyen yedi şey

Hiçbiri gece boyunca tek başıma karar vermediğim şeyler — hepsi ya fiyatı, ya öğrencinin
gördüğünü, ya da bir şemayı değiştiriyor. En üsttekiler en pahalı olanlar.

**Max planı.** `docs/uc-katman-karari-2026-09-03.md`. **Maliyet gece boyunca üç yerden
değişti ve yeniden ölçüldü — sonuç değişmedi:** gerçekçi durumda ~%2 oynama, 5 kat marja
dokunmuyor. Kişi başı $0,99 tavanı da duruyor, üstelik yapısal sebeple: sistem token değil
**dolar** sayıyor, o yüzden danışmana veri eklemek tavanı kaydıramaz — aynı $0,99 artık 73
yerine 71 mesaj alıyor. Ayrıntı: `docs/maliyet-guncelleme-2026-09-03.md`.

Opus, Sonnet'in 1,67 katı; 400/800 TL
ikisi de maliyeti rahat karşılıyor. Karar ürün tarafında, sende.

**`eligible` alanı iki durumlu.** "Doğrulandı, uygun" ile "kimse bakmadı" ayrımını yapamıyor.
Katalogun %67'sinde yaş sınırı kayıtlı değil ve motor hepsine "uygun" diyor. Uyarı notu
eklendi, ama alanın kendisini düzeltmek panonu, danışmanı ve öneri sıralamasını birden
etkiler. Gece yarısı tek başıma karar vermedim.

**Maliyet alanı beş kademeli fiyatı tutamıyor.** Boston University Tanglewood'un gerçek
fiyatı araştırılmış ve biliniyor — 2 hafta $4.055'ten 8 hafta $10.205'e kadar. Ama `cost`
alanı tek bir sayı; beş kademe sığmıyor. Araştırmacı bilgiyi `current_cycle_label`'a
yazmış, yani hiçbir fiyat kontrolünün bakmadığı yere. Ayrıca aynı kavram için **iki ayrı
sütun** var: elle araştırma `financial_aid_available`'ı, otomatik çıkarım
`funding_available`'ı yazıyor — ikisi asla birlikte dolmuyor. İkisi de migration gerektiren
şema kararları, o yüzden sana bırakıldı.

**Ve bu ikisi aslında tek bir sorunun iki yüzü — üçüncüsü de bu sabah çıktı.** `deadline`
alanı da aynı şekilde tek değerli: "sürekli açık, son tarih yok" ile "dönem henüz
açıklanmadı" ile "biz bakmadık" arasında ayrım yapamıyor. Ölçüldü: 282 aktif fırsatın
205'inde tarih yok, ama bu boşluğun büyük kısmı **araştırmayla kapanmıyor.** 61 sayfa elle
okundu — küçük bir grup gerçekten sayfada duran, doldurulmayı bekleyen tarih; küçük bir
grup açıkça ve doğru olarak tarihsiz ("yıl boyu başvuru alınır"); **en büyük grup ise tek
bir sayfa okumasından anlaşılamıyor** — okunabilir sayfaların %38'inde ne bir tarih ne de
"son başvuru" gibi bir kelime geçiyor.

Yani aynı desen üç alanda birden: `eligible`, `cost`, `deadline`. Üçünde de **"bilmiyoruz"
diyecek yer yok**, ve üçünde de sistem bunu "sorun yok" diye okuyor. Ayrı ayrı üç migration
mı, yoksa tek bir "bu alan için ne biliyoruz" deseni mi — bu, mimari bir karar ve seninki.

**Yeniden doğrulama işi: silahlandıralım mı?** Gece boyunca kuruldu, ölçüldü, düzeltildi
ve son olarak **113 gerçek kayıtla** çalıştırıldı — hiçbir yazma yapmadan.

Karar vermen için gereken sayı: **113 kaydın 3'ü kapalıya düşürülecekti.** Üçü de elle
kontrol edildi, üçü de gerçek ("2025 başvurusu kapandı", "şu an başvuruya açık değil"),
hiçbiri yanlış pozitif değil. Tüm katalogda tahminen 6-8 kayıt. Yani otuz değil, üç de değil.

**Ve daha önce sana yazdığım bir sayı yanlıştı, düzeltiyorum:** "sayfaların çoğu okunamıyor"
demiştim. Gerçekte **113 kaydın sadece 2'si (%1,8) gerçekten erişilemez.** Kalanı gayet
okunuyor, sadece açık/kapalı olduğunu söylemiyor. Bu bambaşka bir sorun — erişim değil,
kanıt sorunu. Erişilemedi sanılan 10 kaydın hepsi Internet Archive kopyasıyla kurtarıldı.

Bugün ne yapardı: 27 kayıt (%24) doğrulanmış işaretlenirdi, 3'ü düşürülürdü, 63'ü "sayfa
bir şey söylemiyor" diye bırakılırdı.

**Ve sabaha karşı, kararı doğrudan etkileyen bir şey bulundu.** İş yalnızca **kapatma**
yönünde çalışıyor — bir kaydı "artık açık değil" diye işaretleyebiliyor, ama tersini
yapamıyor. Kodda `canAutoApplyPromotion()` sabit olarak `false` dönüyor ve karşılığı olan
bir uygunluk kontrolü hiç yazılmamış.

Sorun şu: 208 aktif kayıt tarandığında, canlı sayfayla çelişen 8 kayıt çıktı ve **8'in
6'sı ters yönde** — yani bizde "kapalı" ya da "geçmiş" görünen ama sayfası şu an
"başvurular açık" diyen kayıtlar. Stanford SASI bizde `closed`, sayfasında "Summer 2027 ·
SASI Applications Now Open". Ron Brown bizde "tarih açıklanmadı", sayfasında "2027
başvurusu açıldı".

Bu, kapanma yönünden **üç kat** daha yaygın ve daha pahalı: kapandığı halde açık görünen
bir kayıt öğrenciyi boşa uğraştırır, ama **açık olduğu halde kapalı görünen bir kayıt
öğrenciye hiç görünmez.** Başvurabileceği bir şeyi kaçırır ve kaçırdığını bilmez.

Yani "işi silahlandıralım mı" sorusunun yanında ikinci bir soru var: **iş sadece yarısını
yapabiliyor, öbür yarısı hiç yazılmamış.** İkisi ayrı karar; ikincisi bir geliştirme işi.

Bir dürüstlük notu daha: tarama mekanizmasının kendisi, bu görevi başlatan Stanford
kaydını **kaçırdı** — sayfayı sorunsuz indirdi ama yanlış cümleyi seçti. Yani 8 bir taban,
tavan değil.

**İş şu an kapalı ve öyle duruyor.** Açmak senin kararın.

**Oryn hangi kurumları bilmeli?** İki ölçüm aynı soruya çıkıyor.

*Ülke tarafı:* veritabanında **481 üniversite şartnamedeki koridorun dışında** (1.019
kurumun; koridor = ABD, İngiltere, Türkiye, Kanada ve 34 Avrupa ülkesi — sayıyı yeniden
üretebilmen için tanımı yazıyorum, önceki 458 rakamı hiçbir tanımla tutmuyordu) — Çin 64,
Hindistan 37, Güney Kore 31, Malezya 25, Japonya 22. Koridor içinde kalan ise ince:
Finlandiya 9, sonra Litvanya 4, Estonya 3, Kıbrıs 3. Yani "en çok kurum" ile "bu ürün için
en önemli" ters yönü gösteriyor.

*Kurum tarafı — bu daha çarpıcı:* katalog **bütün bir tabakayı görmüyor.** Almanya'da 192
uygulamalı bilimler üniversitesinin **sıfırı** kayıtlı, ve DAAD'ın kendi rakamıyla Alman
öğrencilerin **%37'si** o sektörde okuyor.

(Bu sayı da düzeltildi: daha önce sana 243 yazmıştım. Kaynağı arandığında DAAD'a
çıkmıyor — üçüncü taraf bir siteye çıkıyor ve o site DAAD'a atıf yapıyor ama DAAD'ın kendi
sayfasında böyle bir rakam yok; DAAD "200'den fazla" diyor. 192, HRK'nın —Alman
üniversitelerinin kendi ulusal birliğinin— resmî kurum arama sisteminden, bugün canlı
sorgulanarak. Ayrıca 9 tane de Verwaltungshochschule var, ayrı bir kategori; onlar bu
sayının dışında.) Hollanda'da **36** hogeschool'un sıfırı — ve HBO
orada **daha büyük** sektör (462.130 öğrenci, WO'da 340.179). Avusturya 0/21, İsviçre 1,
İrlanda 1/5.

(36 sayısı artık tahmin değil: DUO'nun — Hollanda Milli Eğitim'in yürütme kurumunun — kendi
resmî kayıt listesinden, 54 satırın `hbo` olanları sayılarak. Önceki "40+" göz kararıydı.)

Sebebi bulundu: **adında "University" geçen kurumlar girmiş, geçmeyenler girmemiş.**
İngiltere kontrol vakası — oradaki eski politeknikler eksiksiz var, çünkü 1992'de yasayla
o adı almışlar. Yani ayrım prestij ya da müfredat değil, isim.

Ve bunun Türk öğrenciye somut bedeli var: Finlandiya'da sınavsız kapı açan sektör tam
olarak o, ve katalog o kurumların hiçbirini içermiyor.

Karşı argüman da gerçek: Hollanda'nın kendi verisi uluslararası öğrencilerin zaten diğer
tarafa yığıldığını gösteriyor, ve 243 kurumu arkalarında veri olmadan eklemek bu gece
düzelttiğimiz "veri yok ama kendinden emin etiket" hatasını yirmi katına çıkarır.

Üç seçenek: koridoru genişlet, kapsam dışını çıkar, ya da kalsınlar ama etiketsiz. **Şu an
üçüncüsünün yarısındayız.**

**Beş ülke için de dosyalar hazır bekliyor** — ve bu artık **bir örnekleme değil, koridorun
tamamı.** Beşi de denendi ve geri alındı, beşi de bilerek sabah paketine adım olarak
konmadı: aşağıdaki şema kararı verilmeden uygulanırlarsa **275 kurum eksik etiketle** girer.

- **Hollanda: 36 hogeschool**, DUO'nun resmî listesinden —
  `netherlands-hbo-2026-09-03.sql`. Mevcut 13 Hollanda kaydıyla sıfır çakışma. Web adresi
  36'nın 35'inde var, çünkü DUO onu kendi dosyasında zaten veriyor.
- **Almanya: 192 Fachhochschule/HAW**, HRK'nın kendi arama sisteminden —
  `germany-haw-2026-09-03.sql`. 16 eyaletin hepsi temsil ediliyor, mevcut 49 Alman kaydıyla
  sıfır çakışma.

- **Finlandiya: 22 ammattikorkeakoulu**, Vipunen (Milli Eğitim Bakanlığı'nın kendi
  istatistik portalı) ve sektörün kendi ortak başvuru portalı UASinfo — ikisi bağımsız
  olarak aynı 22 ismi verdi —  `finland-amk-2026-09-03.sql`. **Yirmi ikisinin de web
  adresi tek tek tarayıcıda açılıp doğrulandı**, satır satır. Bu üç partinin en sağlamı.

  Ve senin için muhtemelen en önemlisi bu: 3f'in araştırmasına göre Finlandiya'da
  **sınav çilesi olmadan kapı açan sektör tam olarak bu.** Katalog bugün o sektörden
  hiçbir kurum içermiyor.

- **Avusturya: 21 Fachhochschule** — `austria-fh-2026-09-03.sql`. Üç bağımsız resmî kaynak
  (bakanlık, sektörün kendi birliği, birliğin portalı) aynı 21'i verdi. Portal 22 gösteriyor
  ama fazladan olan, kendi sayfasında "FH Vorarlberg'in sürekli eğitim şubesi" yazıyor —
  ayrı kurum değil, çıkarıldı. **Yirmi birinin de web adresi tek tek doğrulandı.**
- **İrlanda: 4 Teknoloji Üniversitesi** — `ireland-tu-2026-09-03.sql`. Beşincisi (TU Dublin)
  zaten katalogda, dosya yazılmadan önce kontrol edildi. Kaynak HEA, İrlanda'nın yasal
  yükseköğretim otoritesi.

  İrlanda ayrıca 3f'in teşhisinin **kontrol vakası**: oradaki teknoloji enstitüleri yasayla
  "üniversite" adını yeni aldı — tıpkı İngiltere'de 1992'de olduğu gibi. 6e her birleşmenin
  hangi enstitülerden oluştuğunu tek tek canlı doğruladı, kendi bildiğine güvenmedi. Ve
  HEA'nın listesinde hâlâ ayrı duran Dundalk Institute of Technology'yi eski isim sanıp
  birleştirmedi — gerçekten ayrı bir kurum.

Almanya'da bir tavizi bilmen gerekiyor: **web adresi 192'nin sadece 10'unda var.** Sebebi
şu — HRK'nın sitesi toplu erişimi bot koruması ile engelliyor. Bunu aşmaya çalışmadık:
ne başlık taklidi, ne doğrulama çözme, ne de yavaşlatıp gizlice geçme. Site kendini
kasten koruyorsa etrafından dolaşmak doğru iş değil. 181 boş alan, 181 uydurulmuş
adresten iyidir. Kalan adresler tek tek, elle doldurulacak bir iş.

İkisi de sana kalırsa, uygulaması iki komut.

**Bir kurumun "hangi tür" olduğunu tutacak yer yok.** Bu, yukarıdaki soruyu uygulamaya
çevirince çıkan gerçek engel.

`institution_type` sütunu var, ama dolu: içinde ABD'nin sahiplik sınıflandırması duruyor
(743 "university", 217 "Public", 35 "Private not for Profit", 7 "Private nonprofit"). Bu
bambaşka bir eksen — "kim işletiyor", "hangi akademik tür" değil. Oraya
"University of Applied Sciences" yazmak ikisini kalıcı olarak birbirine karıştırırdı.

Bu yüzden 36 kaydın hepsinde o sütun **boş bırakıldı**, HBO bilgisi `description`'a yazıldı.
Bu çalışır ama doğru çözüm değil — geçici bir yer.

Doğru çözümü tek başıma seçmedim çünkü sadece Hollanda'yı ilgilendirmiyor: Almanya
(Fachhochschule), İrlanda (Technological University), Finlandiya (ammattikorkeakoulu),
İsviçre (Fachhochschule) — hepsinde aynı ayrım var. Yeni bir sütun eklenirse **hepsinde
aynı anda** tutarlı olmalı, yoksa yarısı etiketli yarısı etiketsiz bir katalog kalır ki
etiketsiz olandan daha kötüdür. Migration kararı, senin.

**Fırsat görselleri ve lisans.** 282 kaydın 218'inde görsel yok, ve **128'inin kaynak
sayfasında zaten görsel yok** — daha çok taramak bunu çözmüyor. Üçüncü taraf görseli
sunmanın hukuki temeli açık değil; `LEGAL_REVIEW.md`'ye eklendi. Bu arada lisans gerektirmeyen,
kategoriye göre üretilmiş görseller yapılıyor.

---

## Deploy edersen: ilk on dakikada bak

`docs/environment-variables.md` — her değişken, olmazsa ne bozulur, **ve nasıl anlarsın.**

En sinsi ikisi: **`SUPABASE_SECRET_KEY` ve `CRON_SECRET`.** Bunlar eksikse iş rotası daha
kayıt açmadan patlıyor — yani panelde o iş için **hiç satır görünmüyor.** "Hiç çalışmadı"
ile "çalıştı ve patladı" ayırt edilemiyor. Tek görünür yer Vercel'in kendi logları.

**Tavily ve College Scorecard anahtarlarını 3 Eylül sabahı sen girdin, ikisi de çalışıyor
— altı entegrasyonun altısı da yeşil, gerçek çağrılarla doğrulandı.**

Bunun bir geçmişi var ve bilmen gerekiyor: **Tavily anahtarı bütün gece boyunca boştu.**
Eksik değil — dosyada duruyordu ama değeri boş string'di. Sonucu şuydu: gece boyunca
yapılan bütün yeniden-doğrulama işi Tavily'nin **birinci basamağını hiç kullanmadan**,
yedek yöntemlerle çalıştı. Ve `provider_health` tablosunda Tavily için hiç satır yoktu —
yani bu hiçbir ekranda, hiçbir raporda görünmedi. b9 ancak üç kaydı tek tek elle kontrol
ederken fark etti.

Kredi bütçen: **ayda 1.000.** İşler haftalık çalışırsa toplam ~340 kredi, rahat. Yeniden
doğrulamayı günlük çalıştırırsan tek başına ~750 eder ve keşifle birlikte sınıra dayanırsın.
**Haftalık kal.**

`npm run check:integrations` gerçek API çağrıları yapıyor, "OK" derse güvenilir. Ama **her
satırı oku** — eksik anahtarı "hata" saymıyor, sona atlarsan kaçırırsın. Ve iş gövdesini hiç
çalıştırmadığı için yukarıdaki sessiz durumu yakalayamaz.

Asıl kontrol şu: dört işi panelden birer kez tetikle ve Sistem bölümüne bak. Satır çıkıyorsa
kayıt yolu sağlam demektir.

## Ürünün kendi döngüsü — iyi haber ve eksik halka

**Senin kendi iki planın gerçek.** İlki "profilin boş" diyor, altı gün sonrakisi gerçek
puanları anıyor — Akademik 43/100, Entelektüel Merak 12/100 — ve üç iş tam da o iki
adlandırılmış boşluğa denk geliyor. Şablon değil, senin verinden çıkmış.

**Eksik halka şu:** bir işi bitirip "ne oldu" dediğinde, bir sonraki planın bunun yüzünden
değişip değişmediği **hiç gerçek veriyle kanıtlanmadı.** Yazma tarafı kanıtlı, okuma tarafı
kanıtlı — ama arada henüz kimse geçmemiş. İki yakası da test edilmiş bir köprü.

İki plandan fazlası olan dört hesabın hepsinde ikinci plan, birinci plandaki hiçbir iş
başlamamışken üretilmiş. Bu bir hata değil, sadece **henüz olmamış bir şey.**

**Ve senin hesabında temizlenecek bir şey vardı** — 100 mükerrer "bunu önerme" kaydı,
sadece 2 farklı başlıktan. Gece içinde çözüldü ve pakete girdi: **7b. adım.** Orada
duruyor, çalıştırman yeterli.

## Gece ne oldu

8 lane. Dün 18:00'den bu sabah 09:00'a kadar ana dala **134 birleştirme**, **5.604 test
yeşil** (360 dosya; 2 tanesi bilerek başarısız sayılan test). Bu sayıları 09:00'da kendim
çalıştırdım — eski bir sayıyı taşımıyorum. Okurken hâlâ artıyor olacak; o yüzden saati
yazıyorum, sayı tek başına bir şey ifade etmiyor.

Kumanda merkezi tasarımı iki kez elden geçti, sonra gerçekten kuruldu: on iki bölüm, kendi
kabuğu, açık yeşil zemin — ve on iki ekranın on ikisi de yazıldı, hepsini tarayıcıda açıp
gördüm.

Sabah paketinin ikisi de **baştan sona deneme çalıştırıldı** (6e): 224 korumalı ifadenin
224'ü çalışıyor, sıfır sessiz atlama. O çalıştırma benim kendi dosyalarımda üç hata buldu
— en kötüsü, doğrulama sorgumun her şey yolunda gitse bile iki satırda kırmızı dönmesiydi.

En ciddi bulgu: eşleştirme motoru, yaş sınırı kayıtlı olmayan 189 fırsata hiçbir uyarı
olmadan "uygun" diyordu — 14 yaşındaki biri için "21 yaş üstü" bir program ile gerçekten
doğrulanmış bir program aynı görünüyordu.

İkincisi: 611+ üniversite, arkasında hiç veri olmadan kendinden emin bir seçicilik etiketi
gösteriyordu. Açıklama notu eklendi.

Üçüncüsü, aynı şeklin en kötü hali: fırsatların %65'inde `cost` alanı boş — ama bu sayı
**gerçek araştırma eksiğini olduğundan büyük gösteriyor**, çünkü alan tek bir sayı tutuyor
ve kademeli fiyat oraya hiç yazılamıyor. Yani bazı fiyatlar biliniyor, sadece koyacak yer
yok. Asıl sorun şuydu: fiyatı
bilinmeyen bir program danışmana **ücretsiz olanla tamamen aynı** şekilde anlatılıyordu —
"bilinmiyor" diye bir durum yoktu. Yani yapay zekâ, parası olmayan bir öğrenciye on bin
dolarlık bir programı, bedava olduğunu ima ederek önerebilirdi. Düzeltiliyor.

Dördüncüsü: bir tablo var mı diye bakan kontrol, tablo yokken de "var" diyordu
(PostgREST'in HEAD isteğinde 204 dönmesi). Yani "kurulu değil" uyarısı hiç çıkmıyordu ve
gerçek veriye yazan bir buton açık kalıyordu.

Beşincisi: aynı "bilinmeyen ücretsiz gibi görünüyor" deseni üniversite tarafında da var,
ama farklı biçimde — orası zaten daha iyi kurulmuş (yerel/uluslararası ücret ayrımı doğru,
para birimi doğru, "Bilinmiyor" etiketi detay sayfasında zaten vardı). Sorun kapsam ve
erişimdi: `cost_of_attendance` sadece ABD'de var (127/131), 888 ABD-dışı üniversitenin
**hiçbirinde** yok. Ama `university_profile_metrics`'te 173 ABD-dışı üniversitenin gerçek
yerel/uluslararası ücreti zaten kayıtlıydı — Almanya, İngiltere, Fransa, Hollanda dahil —
ve bu veri bugüne kadar sadece detay sayfasına ulaşıyordu; keşfet kartına ve karşılaştırma
sayfasına hiç ulaşmıyordu, ikisi de bu gece düzeltildi. Danışman ve haftalık plan tarafına
hâlâ hiç ücret bilgisi gitmiyor — bu ayrı ve kasıtlı olarak bu gece yapılmadı, çünkü
öğrenci bazında yapay zekânın ne düşündüğünü değiştiren bir karar, bir yan etki olarak
değil bilinçli olarak alınmalı.

**Ve senin kendi örneğin, tam sıfır:** Türkiye'deki 12 üniversitenin sıfırında —
`cost_of_attendance`'ta da, `university_profile_metrics`'teki ücret kayıtlarında da — hiç
ücret bilgisi yok. Küçük bir sayı ama düşük bir oran değil, tam bir sıfır. Düzeltmedim; 12
Türk üniversitesinin gerçek ücretini bulmak ayrı bir araştırma paketi, bu gecenin işi
değildi, ama bilmen gerekiyordu.
