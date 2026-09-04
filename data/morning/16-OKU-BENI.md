# Paket 16 — 3 mükerrer fırsat çifti çözüldü, WYSE için bulgu (düzeltme değil)

**Dosya: `docs/opportunity-duplicate-consolidation-2026-09-04.sql`. Tek işlem, Supabase SQL
Editor'e yapıştır, çalıştır.**

**Yapıştırmadan önce editörü boşalt** — önceki paketlerle aynı uyarı, aynı sebep.

## Neden bu paket var

Başka bir şerit `docs/opportunity-duplicate-scan-2026-09-04.md`'yi taradı, CEO kararları verdi,
uygulama bende. Üç gerçek, canlı, çözülmemiş mükerrer çift bulundu — hepsi aynı şekilde: aynı
`official_url`, iki taraf da aktif.

## Ne yapıldı, sırayla

**1. University of Edinburgh** — `dc762fce` (görünmeyen ikiz) gerçek yaş sınırı, son başvuru
tarihi, program tarihleri ve daha yeni/doğru bir açıklama taşıyordu; `30436a92`'ye (görünen
satır) zaten uygulanmış bir eşitleme düzeltmesi vardı (sadece ülke uygunluğu). Bu paket kalanı
tamamlıyor: yaş, tarihler, açıklama `30436a92`'ye taşındı, `dc762fce` emekliye ayrıldı
(`status='disabled'`, silinmedi).

**2. Garcia (Stony Brook)** — `a37fa810` ("Garcia Summer Research Program", görünmeyen ikiz)
gerçek yaş sınırı, gerçek vatandaşlık kısıtlaması metni, gerçek maliyet/konum/alan verisi ve
daha yüksek güvenilirlikli, birincil-resmi kaynak taşıyordu — ve bu tam olarak
`lib/opportunities/matching.ts`'nin kendi kod yorumunun "canlı doğrulanmış örnek" diye
gösterdiği satırdı. `d83d7048` ("Garcia Summer Scholars", CEO'nun seçtiği hayatta kalan satır)
hiçbirini taşımıyordu. Tüm gerçek veri `d83d7048`'e taşındı, `a37fa810` emekliye ayrıldı.

**Ve kod yorumu da düzeltildi** — CEO'nun ayrıca istediği gibi: `matching.ts`'deki iki yer
artık "Garcia Summer Scholars" diyor, "Garcia Summer Research Program" değil, kısa bir tarihçe
notuyla. Hata sadece veride değildi, hatanın kendi belgesindeydi de.

**3. Lehigh University** — iki taraf da tamamen boş (yaş/sınıf/ülke hiçbiri yok), simetrik.
Veri taşınacak bir şey yok. `d12506f1` ("Lehigh University") tarama dokümanının kendi
"görünen satır" sütununda, o kalıyor; `a7a89e1e` ("Lehigh University: Bethlehem, PA") emekliye
ayrıldı.

## Dürüst bulgu — "hangisi görünür" sorusu, ölçünce beklenenden farklı çıktı

CEO'nun kararı hangisinin hayatta kalacağını belirledi ve düzeltmenin kendisi ("gerçek veriyi
tek satıra topla, mükerreri emekliye ayır") her iki yönde de aynı sonucu veriyor — hangi id'nin
kaldığı sonucu değiştirmiyor. Ama şunu bulduğum için not düşüyorum:

`lib/opportunities/home-strip.ts`'nin gerçek `selectHomeStripCandidates` fonksiyonunu
doğrudan içe aktarıp gerçek 8 öğrencinin verisine karşı çalıştırdım (yaklaşık bir SQL sorgusu
değil, gerçek kod). **Edinburgh'ün "hangisi görünür" kararı sağlam** — `dc762fce`'nin
`verification_state = 'unverified'` olması, bağlı-sıralamaya değil satırın kendisine ait,
kesin bir dışlama nedeni. **Garcia'nınki ölçünce daha belirsiz çıktı**: iki taraf da
`verified_current`, ikisi de her 8 öğrenci için eligible, ve titiz bir yeniden kontrolde
**hiçbiri** kimsenin gerçek top-5'inde çıkmadı — match_score karşılaştırmaları öğrenciye göre
yakın ve tutarsız yönde. Tarama dokümanının "tam olarak biri görünür" iddiası Garcia için
doğrulanmadı. Bunu CEO'nun kararını tersine çevirmek için kullanmadım — sonuç (bir satırda tam
veri, diğeri emekli) her iki id seçiminde de aynı olurdu — ama founder'a ve CEO'ya, ölçtüğüm
şeyin tam olarak ne olduğunu söylemek doğrusuydu.

## WYSE — düzeltme değil, bulgu

CEO'nun talimatı tarama dokümanının şu iddiasına dayanıyordu: WYSE'nin `eligible_countries`'i
boş, kısıtlamayı hiç yansıtmıyor. **Canlı veriyi doğrudan sorguladığımda bu doğru çıkmadı:**
`eligible_countries = ["United States"]` zaten dolu, VE `residency_restrictions` zaten gerçek,
doğru bir açıklama taşıyor ("Young Scholars Summer STEMM Research Program yedi eyaletle
sınırlı; EYO kampı daha geniş Midwest bölgesinden, herkese açık"). Bu veri
`last_verified_at = 2026-08-20`'den beri orada — bugünkü tarama BAŞLADIĞINDA bile zaten
doğruydu, sonradan değişmedi.

Yani "kayda geçir" talimatının hedeflediği boşluk zaten yok. Bulduğum, ayrı ve daha küçük bir
şey: `eligible_grades = ['9','10','11','12']` satırın TAMAMI için EYO'nun daha geniş
aralığını kullanıyor, ama Research Program yarısı gerçekte sadece "rising 10th-12th" — 9.
sınıf bir öğrenci sistem tarafından "uygun" gösterilir ama aslında sadece EYO'ya, Research
Program'a değil. Waterloo/CEMC'nin aynı sınıf-bandı sorunu, farklı satırda. **Hiçbir şey
yapmadım** — CEO'nun kendi kararı (görünürlük sıfırken bölme, önceki üç kararla tutarlı)
muhtemelen bu ikinci bulgu için de geçerli, ama bu onun kararı, benim değil. Rapor edildi,
uygulanmadı.

## Ölçüldü, varsayılmadı — CEO'nun sorusu: kendiliğinden iyileşiyor mu?

`saved_opportunities` altı satırın **hepsinde sıfır** — hiçbir taşıma gerekmiyor, üç çift için
de. `opportunity_matches`'te satır başına 8 satır var (normal — her öğrenci için her eligible
fırsat için hesaplanıyor, sadece görünenler için değil) — bunlar mevcut
`isOpportunityActionable` mekanizmasıyla `status='disabled'` olduğu anda otomatik olarak her
öneri yüzeyinden dışlanıyor, ek bir işlem gerekmiyor. Waterloo/CEMC ile birebir aynı
kendiliğinden-iyileşme deseni, ölçülerek doğrulandı.

## Kırmızıya dönebilir mi — burada dürüst olmak gerek

Migration UPDATE'leri (Edinburgh, Garcia) sabit literal değerler yazıyor — **denendi**:
`minimum_age is null` korumasını geçici çıkarıp gerçek iki-koşu testini çalıştırdım, **hâlâ
temiz geçti**. Sebep: aynı literal değeri iki kez SET etmek zararsız (Paket 15'in Waterloo
INSERT'lerinden farklı — orada `gen_random_uuid()` gerçek bir çoğalma riski taşıyordu, burada
yok). Korumanın gerçek işi farklı: bu dosyanın, birinin elle düzelttiği daha yeni bir değerin
üzerine eski literal'i tekrar yazmasını önlemek — gerçek bir özellik, ama "ikinci koşuda
patlar" anlamında bir re-run güvenliği değil. Emeklilik UPDATE'leri (`status = 'active'`
koruması) daha standart anlamda re-run güvenli, ama onlarda da kısıt ihlali riski yok
(silinen tarih damgası dışında). Abartmadım — kanıtlanmayan bir şeyi kanıtlanmış gibi
yazmadım.

## Sağlama kontrolü — CEO'nun talebi, Paket 15'in yaşadığı bayatlama hatasından sonra

Paket 15, merge edildikten SONRA kaynak dosyalarından biri değişti (yeni bir satır eklendi)
ve kimse fark etmedi, iki kez. CEO'nun açık isteği: **"bunu Paket 16'ya da ekle, o da aynı
riski taşıyor."** Bu paketin kendi SQL'i başka dosyalardan derlenmiyor (Paket 15 gibi) —
doğrudan canlı veritabanı ölçümüne dayanıyor, o yüzden bir hard-fail değil, **uyarı**: bu
dosyanın üstündeki YORUMLAR (özellikle WYSE bölümü) `docs/opportunity-duplicate-scan-
2026-09-04.md`'nin belirli bir sürümüne atıf yapıyor. `scripts/check-package-16-sequence.sh`
artık en başta bu dokümanın SHA-256'sını yeniden hesaplayıp paketin kendi başlığındaki
üretim-anı değeriyle karşılaştırıyor — farklıysa, SQL'in kendisi hâlâ doğru olduğu için
durmuyor ama açıkça uyarıyor: doküman güncellendiyse (örn. WYSE düzeltmeleri), bu paketin
kendi prose'una taze bakılmalı. Kanıtlandı: dokümana deneme satırı ekleyip çalıştırdım,
uyarı çıktı ve doğru dosyayı adlandırdı; geri alıp tekrar çalıştırdım, temiz.

## Doğrulama yöntemi

`scripts/check-package-16-sequence.sh` — aynı harness deseni, dördüncü kez yeniden
kurulmadan. Yerel Postgres, diskteki her migration (bu paket saf veri, hariç tutulan yok),
6 gerçek fırsatın gerçek başlangıç durumuyla (hepsi `minimum_age null`, `status active`)
tohumlanmış. İki koşu, yedi durum kontrolü — hepsi ilk temiz koşuda beklenen.

## Canlıya hiçbir şey yazılmadı

Doğrulama tamamen yerel. Gerçek fırsat alan değerleri sadece okundu.
