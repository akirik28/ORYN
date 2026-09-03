# Yeniden doğrulama işi: silahlandırma kararı

Bugün beş ayrı ölçüm ve bir kod değişikliği oldu, sana beş ayrı güncelleme olarak ulaştı.
Bu belge hepsini tek yerde topluyor — `00-OKU-BENI.md`'deki özetin **derin hali**, 31'in
hazırladığı ana karar belgesi de buna atıf yapacak, tekrar etmeyecek. Karar senin; bu belge
sana "yap" ya da "yapma" demiyor, neyi bildiğimizi ve neyi bilmediğimizi eksiksiz anlatıyor.

Beş kaynak belge, hepsi bu gece: `docs/opportunity-stale-identity-measurement-2026-09-03.md`,
`docs/opportunity-hidden-live-records-measurement-2026-09-03.md`,
`docs/opportunity-rung1-delta-measurement-2026-09-03.md`,
`docs/opportunity-verdict-stability-measurement-2026-09-03.md`, ve kod tarafında
`lib/opportunities/reverification/adjudicate.ts` + `run-job.ts` (dal:
`oryn/reverification-majority-vote-2026-09-03`, birleşti, `4545ffb2`).

---

## 1. İş bugün ne yapıyor — netçe

Mekanizma üç katman:

1. **Getirme merdiveni** (`fetch-ladder.ts`) — bir fırsatın resmî sayfasını üç yöntemle
   dener: Tavily (1. basamak), tarayıcı-kimlikli doğrudan istek (2.), yönlendirme takibi
   (3.). Hangisi başarılı olursa onu kullanır.
2. **Belirlenimci karşılaştırma** (`classify.ts`) — getirilen metinde "kapandı" ya da
   "açıldı" türü ifadeler arar, veritabanındaki `cycle_status` ile karşılaştırır. Uyuşuyorsa
   biter. Uyuşmuyorsa, ya da veritabanı zaten "bilmiyoruz" diyorsa (`unverified` /
   `date_not_announced`), tek yapay zekâ adımına gider.
3. **Yapay zekâ hakemliği** (`adjudicate.ts`) — sadece anlaşmazlık durumunda çalışır, sadece
   bulunan cümleyi okur, yeni bir tarih ya da gerçek uydurmaz.

**Ve iş, tasarımı gereği, sadece tek yöne yazabiliyor.** `demotion.ts`'deki
`canAutoApplyPromotion()` fonksiyonu sabit olarak `false` döner — kodda bir yorum satırı bile
değil, işlevin kendisi hep aynı şeyi söylüyor. Yani iş bir kaydı "artık kapalı" diye
işaretleyebilir ama "artık açık" diye asla işaretleyemez, otomatik olarak. §9(2)'nin kendi
kuralı bu, bilinçli bir güvenlik sınırı.

**Sorun şu: bu gece ölçülen katalogda, işaretlenemeyen yön işaretlenebilenden üç kat daha
sık çıktı.** 208 aktif kaydın taranmasında canlı sayfayla çelişen 8 kayıt bulundu; 6'sı
ters yönde — bizde "kapalı" ya da "tarih açıklanmadı" görünen ama sayfası şu an "başvurular
açık" diyen kayıtlar. İki örnek:

- **Stanford Anesthesia Summer Institute (SASI)** — bizde `closed`, kendi sayfasında
  *"Summer 2027 · SASI Applications Now Open."*
- **Ron Brown Scholar Program** — bizde `date_not_announced`, kendi sayfasında *"2027
  Application is now open!"*

Bunun bedeli iki yönde farklı: kapandığı halde açık görünen bir kayıt öğrenciyi boşa
uğraştırır. **Açık olduğu halde kapalı görünen bir kayıt öğrenciye hiç görünmez** — pano
onu göstermez, danışman onu önermez, öğrenci başvurabileceği bir şeyi kaçırdığını bile
bilmez. İş bugün, istatistiksel olarak daha sık olan ve öğrenciye daha pahalıya patlayan
yönde, hiçbir şey yapamıyor.

---

## 2. Bugün ne değişti — kronolojik

**Sabah, Tavily anahtarı boştu.** Dosyada satır vardı ama değeri boş string'di —
`lib/providers/tavily.ts`'deki koruma, gerçek bir ağ isteği atmadan önce bunu yakalayıp
`"TAVILY_API_KEY is not set."` diye dönüyor. Sonuç: **bütün gece yapılan yeniden doğrulama
işi, birinci basamağı hiç kullanmadan**, yedek yöntemlerle çalıştı — 196 satırlık gerçek
bir taramada birinci basamağın başarı sayısı **sıfırdı.** Ve `provider_health` tablosunda
Tavily için hiç satır yoktu, yani bu hiçbir panelde görünmedi. Sen anahtarı **bir saat
içinde** kendin girdin.

**Anahtar düzelince ilk yapılan şey, aynı kayıtları ikinci kez okumaktı.** Kötü haber gibi
başladı: "sağlam" denen üç bulgunun **üçü de bozuldu**. International Psychology Olympiad
kendi 2027 tarihini kaybetti, sadece genel bir "başvur" cümlesi kaldı. Stanford SASI
sinyalini tamamen kaybetti. Ron Brown ise **farklı bir yıl** döndürdü — 2025, 2027 değil —
ve o yıl sayfanın kendisinden değil, aynı sitedeki ayrı bir bağış-toplama widget'ından
geliyordu. "3-4 sağlam" bulgusu **0-1'e** düştü, ve bu kendi bulgumun kendi düzeltmesi,
başkasının değil.

**Sonra asıl soru soruldu: bu gürültü mü, yoksa nedeni bulunabilir bir şey mi?** 15 kayıt
seçildi — üç "sağlam" bulgu, ikisi hep aynı cevabı veren, ve on tane daha — her biri **üç
kez**, aynı yöntemle okundu. Sonuç netti: **13'ü üç okumada da harfi harfine aynı cümleyi ve
aynı sonucu verdi.** Kalan 2'si de **aynı cümleyi** üç kez de getirdi — sadece o cümlenin
nasıl sınıflandırılacağı konusunda 2'ye 1 bölündü. Hiçbir kayıt üç farklı cevap vermedi.

**Yani kararsızlığın kaynağı bulundu, ve sanıldığından küçüktü.** Sayfadan cümle seçme kısmı
kanıtlanmış biçimde kararlı — aynı yöntem her seferinde aynı cümleyi getiriyor. Kararsızlık
bir kat yukarıda, yapay zekânın aynı cümleyi bazen farklı yorumlamasında, ve küçük (15'te 2)
ve çoğunlukla çözülebilir bir şeydi. Önceki bulguyla çelişmiyor, tamamlıyor: **farklı**
yöntemler (1., 2., 3. basamak) farklı cümleler getiriyor — bu Ron Brown'da görülen bozulmanın
sebebi. **Aynı** yöntem her seferinde aynı cümleyi getiriyor — bu da düzeltmenin nereye
yazılacağını gösterdi.

**Düzeltme bugün yazıldı ve birleşti.** `adjudicateDisagreementWithMajority` — yapay zekâ
hakemliğini tek sefer değil, **iki kez** çalıştırıyor, ikisi anlaşmazsa **üçüncü** bir kez
daha. Yeni bir sayfa getirmiyor: az önceki ölçüm zaten aynı yöntemin hep aynı cümleyi
getirdiğini kanıtladığı için, ikinci-üçüncü okuma aynı cümleyi tekrar tekrar yapay zekâya
soruyor — gerçek bir Tavily çağrısı harcamadan. 15 kaydın 13'ü **iki** okumada zaten
birbiriyle aynı cevaba varıyordu (üçüncü okuma da onları doğruladı, sadece gerekmiyordu),
o yüzden çoğu kayıt hâlâ iki okumada karar verecek; üçüncü okuma sadece ilk ikisi
anlaşamazsa devreye giriyor. `canAutoApplyPromotion()` **dokunulmadı**, hâlâ sabit `false`.
Bu düzeltme sinyali daha güvenilir yapıyor, hiçbir şeyi açmıyor.

---

## 3. Hâlâ ne yanlış — ve bugünkü hiçbir şey buna dokunmadı

**Summer at Stanford Program for High School**, bu görevi başlatan kayıt, bu gece **üç kez**
aynı yanlış cümleyi seçti — 2. basamak, 3. basamak, ve şimdi çalışan 1. basamak, üçü de.
Sayfa sorunsuz iniyor, ama seçilen cümle hep *"Summer Session 2024 Apply Now"* — sayfanın
kendisinde gerçekten duran *"program runs June 20–August 16, 2026"* cümlesi değil. Bu iki
cümleyi ben kendim, bambaşka bir görev sırasında, sayfayı elle okuyarak buldum.

Rung sabitleme ve çoğunluk oylaması bunu **düzeltmiyor**, çünkü sorun bu ikisinin çalıştığı
katmandan **önce** oluşuyor: yanlış cümle hakemin önüne gelmeden önce yanlış seçiliyor.
Hangi cümlenin seçileceğini belirleyen kısım (`findDateCandidates`, cümle-eşleştirme
penceresi) ayrı, çözülmemiş bir sorun. **"Kararlılık düzeltildi" cümlesi "Stanford
düzeltildi" anlamına gelmiyor** — bu gecenin kendi ölçümü bunu kanıtlıyor: aynı kayıt, aynı
yanlış cümleyi, üç kez, kararlı biçimde veriyor.

---

## 4. Bugün silahlandırsan ne olurdu — net sayı

**Kapatma yönü** (iş bugün sadece bunu yapabiliyor): en güvenilir kaynak, gerçek 113 kayıtlık
deneme çalıştırması — **3 kayıt kapalıya düşürülecekti, üçü de elle doğrulandı, üçü de
gerçek** ("2025 başvurusu kapandı" gibi net, tarihli ifadeler; sıfır yanlış pozitif). Bu
oranı 283 satırlık tüm aktif katalog'a uyarlarsan **kabaca 6-8** eder — otuz değil, üç de
değil. §9(5)'in hacim koruması (bir seferde ≥3 **ve** partinin %10'undan fazlası düşerse
hiçbirini uygulamaz) bu oranda **devreye girmez** — yani bu 3-8 kayıt gerçekten
uygulanırdı, güvenlik koruması tarafından bloklanmazdı. Bu gece ayrıca kendi taramamda
(208 kayıt, farklı bir örneklem) kapatma yönünde **2** kayıt bulundu (USC Pre-College
Summer Programs, UK Chemistry Olympiad) — farklı sayı ama aynı büyüklük mertebesi, tek
haneli. **İki bağımsız ölçüm aynı sonuca varıyor: kapatma yönünde silahlandırmanın günlük
etkisi, tek seferlik bir çalıştırmada, tek haneli sayıda gerçek kayıt.**

**Açma yönü** (iş bunu **hiç yapamıyor**, ama merak edersen sayı şu): 208 kayıtlık taramada
8 kayıt "aslında açık" sinyali verdi. Elle okunduğunda **3'ü gerçekten sağlamdı** (2027
tarihli, net ifadeler). Ama §2'de anlatıldığı gibi, bu 3'ü ikinci bir bağımsız okumada
**0-1'e** düştü — yani bugünkü en dürüst cevap "3-4" değil, **"muhtemelen 1'den az, ama
bilmiyoruz"**. Ve bu sayının kendisi bir taban, tavan değil: Stanford örneği ve Tavily
anahtarının boş kalması, ikisi de kanıtlanmış eksik-sayma sebepleri.

---

## 5. İkinci karar — açma yolu hiç yazılmadı

Bugün "silahlandıralım mı" sorusunun yanında, farkında olmayabileceğin ikinci bir soru var:
**iş sadece yarısını yapabiliyor.** `canAutoApplyPromotion()` sabit `false` — karşılığı olan
bir uygunluk kontrolü (`isPromotionEligible` gibi bir şey) hiç yazılmadı. Bugünkü
silahlandırma kararı, olsa olsa, işin **kapatma yarısını** açar; açma yarısı yok, silahlandırılacak bir
şey de yok.

**Öbür yarıyı yazmak ne gerektirir**, kabaca:

- `isDemotionEligible`'ın aynısının simetriği — kanıt sınıfı P1, açık bir "açıldı" ifadesi
  eşleşmiş, çelişen bir kapanma sinyali yok.
- **Ama kapatma yarısında olmayan, yeni bir kontrol de gerekiyor.** Bu gece defalarca
  görüldü (ODTÜ, EYP Türkiye, Ron Brown, XLAB): açma yönündeki bir eşleşme genellikle
  eski, geçmişte kalmış bir tarihin yanında duruyor — "Şimdi Başvur" düğmesi, iki yıl önceki
  bir program tarihinin hemen yanında. Kapatma tarafında bu deseni hiç görmedik. Yani açma
  tarafı, kapatma tarafının kopyası değil; kendi başına yeni bir "bu tarih güncel mi"
  kontrolü ister, hiçbir öncülü yok.
- Kendi hacim koruması — şu an sadece kapatma tarafında var.
- Kendi test paketi, `demotion.test.ts`'nin eşi.

Büyüklük olarak, kapatma tarafının kendisiyle kıyaslanabilir bir iş — artı, kapatma
tarafının hiç karşılaşmadığı yeni bir sorun (eski tarih tespiti). Küçük bir yama değil, ama
devasa bir yeniden yazım da değil.

---

## 6. Ne görürsem karar verebilirim

Bu belge yönde tavsiye vermiyor — ikisi de gerçek, farklı riskler taşıyan seçenekler ve
karar senin risk iştahın. Ama sana ne görürsem daha net konuşabileceğimi söyleyebilirim:

**Kapatma yönü için:** kanıt zaten oldukça güçlü — birden fazla bağımsız gerçek deneme
çalıştırması, hepsi elle doğrulanmış, hacim koruması devreye girmiyor. Beni daha ileri
götürecek şey daha fazla elle deneme değil — **işin kendi takviminde, gerçek bir süre**
boyunca (örneğin bir hafta, günlük çalışarak) çalışmasını görmek: tekrarlanan otomatik
erişimin bir siteyi zamanla engellemeye itip itmediği gibi, sadece geçen zamanın
gösterebileceği bir şey.

**Açma yönü için:** eksik olan çok daha büyük ve net — (1) yol hiç yazılmadı, yazılması
gerekiyor; (2) eski-tarih tespiti gibi bugün var olmayan bir kontrol gerekiyor, çünkü
bugünkü "sağlam" bulguların çoğu tam da bu yüzden sağlam çıkmadı; (3) Stanford'un kendi
sorunu (yanlış cümle seçimi) hâlâ çözülmedi ve bu üçü çözülmeden açma yönünü otomatikleştirmeyi
önermem.

---

## Kaynaklar

- `docs/opportunity-stale-identity-measurement-2026-09-03.md` — yön asimetrisinin ilk ölçümü
- `docs/opportunity-hidden-live-records-measurement-2026-09-03.md` — 126 kayıt, "3-4 sağlam", Tavily anahtarının boş olduğu bulundu
- `docs/opportunity-rung1-delta-measurement-2026-09-03.md` — anahtar düzelince yeniden ölçüm, "3-4" → "0-1"
- `docs/opportunity-verdict-stability-measurement-2026-09-03.md` — 15 kayıt × 3 okuma, kararsızlığın kaynağı bulundu
- `docs/opportunity-reverification-job-design-2026-08-23.md` — orijinal tasarım, bugünkü tüm bulgular buraya da işlendi (append-only not olarak)
- Kod: `lib/opportunities/reverification/adjudicate.ts`, `run-job.ts`, `demotion.ts` — dal `oryn/reverification-majority-vote-2026-09-03`, birleşti (`4545ffb2`)
