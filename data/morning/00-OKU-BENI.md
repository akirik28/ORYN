# Sabah — 3 Eylül 2026

**Güncelleme, öğleye doğru:** bu artık çoğunlukla bir kayıt, bir talimat listesi değil.
1, 2, 3, 5 ve 7b uygulandı — sayıları aşağıdaki tabloda tek tek doğrulandı, tekrar
okumana gerek yok. **Hâlâ senden bir şey isteyen tek adım 6.** 4 kısmen kapandı (ayrıntı
kendi bölümünde), 7 sadece deploy edeceksen geçerli, 8 bakılacak bir şey değil zaten
yapıldı. Aşağıdaki adım-adım anlatı olduğu gibi bırakıldı — ne yapıldığını ve neden
öyle yapıldığını gösteriyor, ama artık "şunu çalıştır" değil "şu çalıştırıldı" olarak
oku.

---

### Nerede kaldın — 3 Eylül 10:30 itibarıyla canlı veritabanından okundu

| Adım | Durum |
|---|---|
| 1. Admin | ✅ zaten öyleydi |
| 2. Migration'lar | ✅ **uygulandı** — on tablonun onu da yerinde, 0104→0106 yeniden adlandırma dahil |
| 3. Veri doldurma | ✅ **uygulandı** — kurum adı boş 197'den **6**'ya, incelemedeki 112'den **27**'ye |
| 4. Kayıt düzeltmeleri | ✅ uygulandı |
| 5. Üniversite gereksinimleri | ✅ **uygulandı** — 1.325'ten **1.535**'e, tam beklenen sayı |
| 6. Yeni fırsatlar | ⬜ **HENÜZ ÇALIŞMADI** — bugün katalog'a sıfır yeni kayıt girmiş |
| 7. Bildirim arka doldurma | ⬜ sadece deploy edeceksen |
| 7b. Tekrar eden öneriler | ✅ **uygulandı** — 98 kopya silindi, canlıda 1 kaldı (7b'nin kendi bölümündeki "2" düzeltmesine bak) |
| 8. Panele bak | ✅ açtın, yedi ekran gezildi |

**Tek eksik 6. adım**, ve muhtemelen sebebi şu: o adım SQL değil, terminalde altı komut. 17
fırsat orada bekliyor.

Şu an uygulanmayı bekleyen diğer şeyler — hiçbiri pakete adım olarak konmadı, hepsi senin
bir kararına bağlı: **beş ülkenin 275 uygulamalı bilimler kurumu** (`docs/kararlar-2026-09-03.md`'deki şema kararı),
**22 kayda sınıf bilgisi** (`opportunity-eligible-grades-from-prose-2026-09-03.sql`), ve
**Breakthrough'nun kategori düzeltmesi** (`opportunity-category-relabel-2026-09-03.sql`).

**Bir tanesi ise bugün uygulanabilir, hiçbir karara bağlı değil:** Hollanda'nın eksik iki
araştırma üniversitesi (`netherlands-wo-gaps-2026-09-03.sql`). Bunlar zaten katalogda olan
13 Hollanda üniversitesiyle **aynı sektörden**, o yüzden yukarıdaki şema kapısına takılmıyor.

DUO'nun listesinde 18 var, bizde 13 vardı. Aradaki 5'in **üçü bilerek dışarıda bırakıldı**:
üçü de tek bir Protestan mezhebine papaz yetiştiren, sadece ilahiyat okutan kurumlar. Bu
gruplama 6e'nin kendi yorumu değil — Hollanda sektörünün kendisi onları ayrı bir kategori
sayıyor, bir dördüncü kurumun kendi sitesinde bu grup adıyla anılıyorlar.

Bir tanesi (Open Universiteit) ise açık kayıtlı uzaktan eğitim modeli. 6e onu **dahil etti
ama işaretledi**: "seçici üniversite" konumlandırmasına uymuyor olabilir, ama bu senin
kararın, benimki değil dedi. İkisi de tek satırla çıkarılabilir.

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

## 1. Kendini admin yap — ✅ tamamlandı, kayıt

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

## 2. Migration'ları uygula — ✅ tamamlandı, kayıt

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

## 3. Bekleyen veriyi doldur — ✅ tamamlandı, kayıt

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

*(Bu tablo 3. adımdan önceki bir an fotoğrafı — sayılar artık tarihsel. 3. adım
uygulandıktan sonra aktif havuz 366'ya çıktı, son tarihi olmayan aktif kayıt 272 —
`docs/kararlar-2026-09-03.md`'de canlı doğrulanmış hâliyle duruyor.)*

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

**Bu adımın bir yan etkisini bilmen gerekiyor, çünkü `docs/kararlar-2026-09-03.md`'deki
kararlardan birini etkiliyor.** İncelemedeki 112 kaydın hiçbirinde kimin başvurabileceği kayıtlı değil — ne yaş
ne sınıf. Aktife çekilen 78 kayıt oradan geliyor. Yani bu adımdan sonra, öğrencinin gördüğü
katalogda "kimin başvurabileceğini bilmiyoruz" durumundaki kayıt sayısı **128'den ~206'ya**
çıkıyor. *(Adım uygulandıktan sonra gerçek sayı ölçüldü: **212** — tahmine yakın, `docs/kararlar-2026-09-03.md`'de canlı doğrulanmış hâliyle duruyor.)*

Kayıtların kendisi sorunlu değil — tek tek doğrulandılar. Sorun, `eligible` alanının
"bilmiyoruz" diyememesi (`docs/kararlar-2026-09-03.md`'deki kararlardan biri): sınır kaydedilmemiş bir kayda motor
"uygun" diyor. Yani bu adım o kararı **daha acil** hale getiriyor, daha az değil. Adımı
durdurmanı önermiyorum; sadece sırayı bilerek kurman için söylüyorum.

*(Bu sayıyı sana daha önce 189 diye yazmıştım, yanlıştı — sadece yaş alanına bakıyordum.
Ürünün `eligible_grades` diye ikinci bir alanı var ve 282 aktif kaydın 95'inde o dolu.
İkisinden biri doluysa kimin başvurabileceği aslında biliniyor: 154 kayıtta biliniyor,
128'inde bilinmiyor. Bunu 31 kendi ölçümünde yakaladı — benim verdiğim görev yanlış alanı
sayıyordu.)*

## 4. Tek tek kayıt düzeltmeleri — kısmen tamamlandı, Maastricht'te yeni bir bulgu var

`03-firsat-kayit-duzeltmeleri-2026-09-03.sql` — iki gerçek düzeltme. Google CSSI'nin adresi
**✅ uygulandı** (canlı doğrulandı: `g.co/cssi`, yalnızca Google'ın oluşturabileceği bir kısa
link, oraya yönleniyor) ve Maastricht kaydının kapatılması **✅ uygulandı** ("University of
Maastricht, Netherlands" kaydı canlıda `disabled`).

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

**Yeni bulgu (bu denetimde, çözülmedi): katalogda üçüncü bir Maastricht kaydı var.**
"Maastricht Summer Program" adında, `active`, adresi
`maastricht.dreamapply.com/courses/search/id/48160-h41vq9` — ne d0'ın kapattığı kayıtla
ne 6e'nin bulduğu `maastrichtsummerschool.nl` adresiyle aynı. Kim yazdı, ne zaman,
yukarıdaki tartışmayla ilgisi var mı — araştırılmadı. Kapatma/düzeltme kararını verirken
bunu da hesaba kat; taze bir bakış istiyor.

## 5. Üniversite giriş gereksinimleri — ✅ tamamlandı, kayıt

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

## 6. Yeni fırsatları katalog'a al — ⬜ tek canlı talimat, hâlâ çalışmadı

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

## 7b. Kendi hesabındaki tekrar eden önerileri temizle — ✅ tamamlandı, kayıt

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

*(Düzeltme, öğleye doğru yeniden denetlendi: burada "başka bir hesapta aynı başlığı
paylaşan 2 satır bulundu, dokunulmadı" yazıyordu. Canlı sorgu artık bunu doğrulamıyor —
`ai_recommendations` tablosunda "Oxbridge" geçen tek bir satır var, o da founder'ın kendi
hesabındaki, silme sonrası kalan satır. O 2 satırlık iddia ya yazıldığı an yanlıştı ya da
sonradan başka bir işlemle değişti; hangisi olduğu araştırılmadı. Adımın kendisi —
98 kopyanın silinmesi — hâlâ doğru ve uygulandı, sadece bu tek cümle güncel değildi.)*

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

## Kararların — artık ayrı, tek bir belgede

Bu bölüm burada dokuz karar olarak uzun uzun anlatılıyordu. Artık `docs/kararlar-2026-09-03.md`
içinde — canlı veriye karşı yeniden doğrulanmış, maliyet sırasına göre dizilmiş, on karara
çıkmış durumda (oryn-a4'ün Türkiye'deki okul-konumu bulgusu eklendi). Burada özetlenmiyor,
çünkü bir özet üçüncü bir liste olurdu ve zamanla ilk ikisinden ayrışırdı. Karar vereceğin
zaman oraya bak.

**Karar listesine girmeyen tek not — fırsat görselleri ve lisans.** 282 kaydın 218'inde
görsel yok, ve 128'inin kaynak sayfasında zaten görsel yok — daha çok taramak bunu
çözmüyor. Üçüncü taraf görseli sunmanın hukuki temeli açık değil; `LEGAL_REVIEW.md`'ye
eklendi. Bu arada lisans gerektirmeyen, kategoriye göre üretilmiş görseller yapılıyor —
senden bir karar beklemiyor, sadece bilmen gerekiyordu.

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
