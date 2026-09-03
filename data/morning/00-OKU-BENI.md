# Sabah — 3 Eylül 2026

Uyandığında sırayla bunlar. Yedi adım, tahminen 15 dakika — beşi kopyala-yapıştır.

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

Hesabın **2 Eylül 22:18'den beri zaten admin** — gece panelleri denerken açılmış.
Yani bu adım muhtemelen boşa çalışacak, ki zararsız; yine de çalıştır, çünkü tek
doğrulanmış yol bu. `is_admin` **true** dönmeli. `SET ROLE service_role` satırı şart — onsuz `UPDATE 1` der
ve hiçbir şey değiştirmez (`profiles_00_guard_protected_columns` trigger'ı geri alır,
canlıda doğrulandı).

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

**Bu adım olmadan panelin yazma tarafı çalışmaz.** Ultra yapma, hediye etme, iş durdurma,
bütçe ayarlama — hepsi bu migration'lara bağlı. Panel bunları dürüstçe "kurulu değil"
diye gösterecek, ama iş görmeyecek.

## 3. Bekleyen veriyi doldur

`02-veri-doldurma-2026-09-03.sql` — **377 düzeltme ifadesi, 213 tekil kayıt.** En görünür
etkisi: kurum adı boş olan **190 kayıt dolacak**, ve 84 kayıt tek tek doğrulanmış haliyle
`under_review`'dan `active`'e geçecek — yani öğrencinin göreceği katalog büyüyecek.

Şu anki durum (2026-09-03 02:40, canlı ölçüm — **kapsam yazılı, çünkü kapsamsız sayı
karşılaştırılamıyor**):

| Kapsam | Kayıt | Kurum adı yok | Son tarih yok | Görsel yok |
|---|---|---|---|---|
| Hepsi | 421 | 197 | 339 | 356 |
| Sadece `active` | 282 | 66 | 205 | 218 |
| `active` + `under_review` | 394 | 172 | 314 | 330 |

Paket **190** kaydın kurum adını dolduruyor (hepsi hâlâ boş, tek tek doğrulandı). Toplamda
197 boş var. O 7 farkın ne olduğuna baktım ve beklediğim şey çıkmadı: **7'sinin de kurum
adı eksik değil, 7'si de geçerli fırsat kaydı değil.** İkisi dizin sayfası, biri üniversite
ders kataloğu kaydı, birinin başlığı harfiyen `"Time: 4:30pm – 5:30pm (Hong Kong time)"`.
İkisinin adresi bambaşka bir yere gidiyor (Google CSSI kaydı Northeastern Illinois'in lisans
sayfasına, Exeter kaydı bir akademisyenin profiline — doğru adres kaydın kendi açıklamasında
yazılı). Biri de kapanmış bir marka: Duke TIP artık Duke Pre-College, canlıda doğrulandı.

Ayrıntı: `docs/yedi-kapsanmayan-kayit-2026-09-03.md`. **SQL hazırlamadım** — kurum adı
doldurmak dördü için de yanlış düzeltme olurdu. Duke'un kimliğini değiştirmek senin kararın.

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

Beş parti hazır bekliyor, **15 yeni fırsat.** Terminalden, sırayla:

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

`--apply` olmadan çalıştırırsan sadece ne olacağını gösterir, hiçbir şey yazmaz. Üçünü de
öyle çalıştırdım: **15 kabul, 3 red.**

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

**Ayrıca bir tanesi zaten katalogda ama yanlış yerde:** Breakthrough Junior Challenge
(13-18 yaş, dünya çapında, 250 bin dolarlık burs, son tarih 15 Eylül — 12 gün) `competition`
olarak kayıtlı. Bugün "burs" diye arayan bir öğrenci onu bulamıyor. Yeni kayıt değil,
mevcut bir kaydın kategorisi — bu yüzden yukarıdaki komutlarla düzelmiyor, ayrı bir karar.

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

## Senin kararını bekleyen altı şey

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

**İş şu an kapalı ve öyle duruyor.** Açmak senin kararın.

**Oryn hangi kurumları bilmeli?** İki ölçüm aynı soruya çıkıyor.

*Ülke tarafı:* veritabanında **481 üniversite şartnamedeki koridorun dışında** (1.019
kurumun; koridor = ABD, İngiltere, Türkiye, Kanada ve 34 Avrupa ülkesi — sayıyı yeniden
üretebilmen için tanımı yazıyorum, önceki 458 rakamı hiçbir tanımla tutmuyordu) — Çin 64,
Hindistan 37, Güney Kore 31, Malezya 25, Japonya 22. Koridor içinde kalan ise ince:
Finlandiya 9, sonra Litvanya 4, Estonya 3, Kıbrıs 3. Yani "en çok kurum" ile "bu ürün için
en önemli" ters yönü gösteriyor.

*Kurum tarafı — bu daha çarpıcı:* katalog **bütün bir tabakayı görmüyor.** Almanya'da 243
uygulamalı bilimler üniversitesinin **sıfırı** kayıtlı, ve DAAD'ın kendi rakamıyla Alman
öğrencilerin **%37'si** o sektörde okuyor. Hollanda'da 40+ hogeschool'un sıfırı — ve HBO
orada **daha büyük** sektör (462.130 öğrenci, WO'da 340.179). Avusturya 0/21, İsviçre 1,
İrlanda 1/5.

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

Tavily/College Scorecard anahtarları eksikse durum daha iyi: iş çalışıyor ve panel sarı bir
uyarı gösteriyor. Bu gece düzeltildi.

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

**Ve senin hesabında temizlenecek bir şey var:** 100 mükerrer "bunu önerme" kaydı duruyor,
sadece 2 farklı başlıktan. Yazma tarafındaki hata düzeltildi ama eski satırlara dokunmuyor.
Bugün sana bir plan üretilse, "bunu tekrar önerme" sinyali gerçek geçmişin değil, bu
gürültünün etkisinde kalırdı.

## Gece ne oldu

8 lane. Dün 18:00'den bu sabah 08:00'e kadar ana dala **121 birleştirme**, **5.566 test
yeşil** (359 dosya; 2 tanesi bilerek başarısız sayılan test). Bu sayıları 08:00'de
kendim çalıştırdım — gece boyunca yazılmış eski bir sayıyı taşımıyorum.

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
