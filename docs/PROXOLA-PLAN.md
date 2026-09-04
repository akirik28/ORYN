# Proxola — çalışma planı

> ## Bu oturumu açan kişiye
>
> **Bu projede CEO/entegratör rolünü `oryn-5b` yürütüyor.** Kurucu (Ada Sarp
> Kırık) işi ona veriyor, o da şeritlere dağıtıyor ve `main`'e tek o merge
> ediyor. Sen bir şeridi devraldın; işin bitince **kendi dalını push et, dur,
> rapor et ve yeni iş iste.**
>
> **Değişmeyen kurallar — istisnasız:**
>
> 1. **`main`'e merge etme.** Dalını push et, orada bırak. Merge yetkisi tek kişide.
> 2. **Canlı veritabanına yazma yok.** SQL'i hazırla, kurucu çalıştırır.
> 3. **Migration numarasını CEO verir.** Kendin alma — bir günde beş kez çakıştı.
> 4. **Paylaşılan tarayıcıda kurucunun gerçek oturumu var.** Sadece
>    `127.0.0.1` + `/design-preview/*`. Sayfa onun hesabıyla açılırsa **dur**,
>    okumak dahil. `localhost` port fark etmeksizin onun çerezini taşır.
> 5. **Yapılmış mı diye bak, sonra yaz.** Bir günde üç kez "eksik" denen şey
>    yazılmış çıktı; sorun kod yazılmaması değil, doğrulanmamasıydı.
> 6. **Kontrolün kırmızıya dönebildiğini kanıtlamadan "geçti" deme.** Bir günde
>    beş kez bozuk bir kontrol ile temiz bir sonuç ekranda aynı göründü.
> 7. **Kendi hatanı bildir.** Yakalanmış bir hatayı fazladan bildirmek bir
>    paragraf tutar; bildirmemek bir sonrakine bir saat kaybettirir.
> 8. **Bitince rapor et ve yeni iş iste.** Bekleme, sorma sırası sende.
>
> **Çalışma penceresi: yarın akşam 22.00'a kadar.**

**Bu dosya tek doğruluk kaynağı.** Bir oturum açtığında ona madde numarası ver:
*"PROXOLA-PLAN.md'deki P3'ü al."* Madde kendi içinde yeterli.

**Kurallar, her madde için geçerli:**
- Bitince rapor et, sonra yeni iş iste — bekleme.
- Canlı veritabanına yazma yok. Migration numarasını CEO verir.
- `main`'e merge etme; dalını push et, dur.
- Bir şey zaten yapılmışsa **baştan yazma** — bugün üç kez "eksik" denen şey yazılmış çıktı.
- Kontrolün kırmızıya dönebildiğini kanıtlamadan "geçti" deme.

---

## A — KURUCUDA (kimse yapamaz, sende)

**A1. Migration'lar — ✅ TAMAM (4 Eylül).** Dördü de uygulandı ve canlıda
doğrulandı: şema, politikalar, korumalar, Türkçe ek düzeltmesi (9 satır),
TU Münih ücret düzeltmesi (0 → 4000), üniversite verisi (15 gereksinim,
13 kaynak). **C1 artık çalıştırılabilir.**

**A2. Şirket kaydı.** Dört alan buna bağlı: ticaret unvanı, sicil numarası,
kayıtlı adres, `privacy@proxola.com` yönlendirmesi.
Ayrıntı: `docs/kurucu-sirket-bilgileri-eksikleri-2026-09-04.md`

**A3. Ödeme sağlayıcısı seç.** iyzico / PayTR / Stripe. Kod sağlayıcıdan
bağımsız yazılıyor; seçince tek dosya yazılacak.

**A4. Hukuki cevap — girdi hazır, karar sende.**
`docs/minor-commercial-email-legal-2026-09-04.md`. Araştırma **kilidin yanlış
kapıda olduğunu** gösterdi: veli özeti, veli daveti ve son tarih hatırlatmaları
**pazarlama değil** — alıcı ya yetişkin, ya da mesaj hesabın zaten kullandığı bir
özelliğe bağlı. Gerçek kapı dar: **öğrenciye pazarlama e-postası.** Öneri: her
yerde 14+ kendi rızası, **Türkiye hariç** — Türk hukukunda net yaş eşiği yok
(vaka bazlı "ayırt etme gücü"), o yüzden bir Türk avukat teyit edene kadar veli
rızası. Beş madde avukata bırakıldı, uydurulmadı.

**A5. E-posta sağlayıcısı seç — YENİ, ve A4'ten daha bağlayıcı.**
Aylık veli özeti yazıldı ve **hiçbir yere gönderilmiyor**: projede e-posta
altyapısı **hiç yok** (`package.json`'da sağlayıcı paketi yok, `.env.example`'da
mail değişkeni yok). Yani e-postayı hukuk değil, **altyapının yokluğu**
durduruyor. Sağlayıcı seçilince kesişim ödeme gibi sağlayıcıdan bağımsız yazılır.

**Ama kurucunun isteği e-postayı beklemiyor:** *"ayda bir AI özet versin"* için
e-posta şart değil — özet B3a'nın **gelişim** sayfasında gösterilecek. Üretim
kodu hazır (`ff95182f`), sadece çağrılıp render edilecek.

---

## B — ACİL (sırayla)

**B1. Ödeme kesişimi (0123).** Sağlayıcı arayüzü + `subscriptions` +
`payment_events`. Tasarım onaylandı: `oryn/payment-provider-seam-2026-09-04`
dalında. Kart bilgisi asla bu uygulamada tutulmaz. Aynı bildirim iki kez
gelirse iki abonelik açılmaz. İptal `plan_tier`'a dokunmaz — ayrı bir bitiş
tarihi sütunu, süresi dolunca kendiliğinden düşer.

**B2. Tam ekran yükseltme kartı (0124).** Sağ üstte çarpı, dönen özellikler,
alevli logo, fiyat kumandadan. İlk oturumda çıkar, sonra susma süresi artar.
Sahte ödeme ekranı yok — CTA gerçek akışı çağırır.

**B3. Veli hesabı — kapsam genişletme.** Kurucu: *"çok kapsamsız, ayrı sayfalar
bile yok."* Üç iş:
- **B3a.** Ayrı sayfalar: fırsatlar / üniversiteler / başvurular / gelişim ayrı rotalar
- **B3b.** Ayda bir AI gelişim özeti (şu an haftalık yazılmış, aylığa çevrilecek)
- **B3c.** Veli üniversite ve fırsat kütüphanesine erişebilsin (şu an sadece
  çocuğunun seçtiklerini görüyor)

---

**B5. Ücret rakamının hangi yıla ait olduğu ekranda görünsün.**
`university_profile_metrics.stats_as_of` ve `notes` **var ama hiçbir uygulama
kodu okumuyor** — yani ürün her ücreti tarihsiz gösteriyor. Pekin Üniversitesi'nin
2026 harcı henüz yayınlanmadığı için 2025 rakamı yazılıyor; etiketi olmadan
öğrenci güncel sanır. Sorun tek üniversite değil, **tüm ücret gösterimi.**
Sorgudan geçir, rakamın yanında göster. Sahibi yok.

**B6. Veli için güvenli üniversite/fırsat detay sayfası — ERTELENDİ, bilerek.**
Öğrencinin `[id]` detay sayfası **bakan kişinin kendi profiline göre** kabul
görünümü hesaplayıp **yazıyor**, ayrıca "kaydet" düğmesi ve admin formu render
ediyor. Veliyi oraya bağlamak veli hesabının altına çöp satır yazardı. B3c bu
turda **satır içi açılım** yapıyor; gerçek detay sayfası ayrı bir karar.

---

## C — KALİTE / DOĞRULAMA

**C1. Veli uçtan uca doğrulama — ✅ TAMAM (4 Eylül).** 26 kontrol, hepsi geçti.
Ayrıntı aşağıda; tek açık kalan, plan script'indeki savepoint'siz B7.

**C2. Danışman akışı (streaming).** Plan yazılı:
`docs/advisor-streaming-plan-2026-09-04.md`. 11 koruma tek tek listelenmiş.
Birkaç günlük iş — ödeme oturduktan sonra.

**C3. Öğrenci ana akışını gerçek hesapla yürü.** Bugüne kadar hiç yapılmadı;
paylaşılan tarayıcıda kurucunun oturumu olduğu için engellendi.

---

## D — ARAŞTIRMA (boşta kalan her oturum buraya)

**D1. Üniversite doldurma.** 1010 üniversitenin **695'i (%68,8)** hiçbir içerik
göstermiyor. İlk dokuz bitti; sıradaki parti QS top-100'ün kalan 25'i.
Kural: resmî kaynak, her veriye `source_url` + tarih, bulunamayan alan **boş
bırakılır**, uydurulmaz. SQL hazırlanır, CEO paketler.

**D2. Fırsat doldurma.** 367 fırsatın **348'i (%94,8)** en az bir "doğrulanmadı"
uyarısı taşıyor — yaş, sınıf veya ülke bilgisi eksik.

**D3. Ölçüm önce.** Doldurmadan önce say: hangi alan, yüzde kaçı boş, **ve
öğrenci onu gerçekten görüyor mu.** %100 boş ama hiçbir yerde gösterilmeyen
sütun, doldurulacak son şeydir.

---

## Bugün kapananlar (tekrar açma)

Karşılaştırma paketi ✓ · Fiyatın kumandadan gelmesi ✓ · Danışman oturum
listesi + konudan isimlendirme ✓ · Ultra kendi kendine verilebilme açığı ✓
(migration bekliyor) · Plan sayfası yeşil zemin ✓ · Admin giriş bağlantısı ✓ ·
Footer yer tutucu ✓ · Danışman bekleme göstergesi ✓ · Fırsatlar sayfası
çökmesi ✓

---

## Dağıtım — 4 Eylül, 11:50 (CEO)

**Oturum başlığı, o oturumun ne yaptığının kanıtı değildir.** İlk dağıtımda
dokuz oturumun işini kenar çubuğu başlığından çıkardım; **dördü yanlıştı** ve
dördünü de oturumların kendisi düzeltti. Tablo artık kendi beyanlarına göre.

| Oturum | Madde | Durum |
| --- | --- | --- |
| ödeme kesişimini yazan | **B1** — **0123** | yürüyor |
| veli E2E + B7 düzeltmesini yapan | **B3c** — gerekirse **0125** | ölçüyor |
| locale shim + `/parent` route group | **B3a** — veli ayrı sayfalar | yürüyor |
| D3 + C1'i bitiren | **C2** — danışman streaming | yeni aldı |
| B3b'yi bitiren | **D4** — tekilleştirme, **0128** | yeni aldı |
| D2 dolgusu | **D2** + fırsat bayrakları **0126** | yürüyor |
| D1 dolgusu | **D1** — 19 kurum + tarihler, **0127** | yürüyor |
| B2'yi doğrulayıp kapatan | **A4'ün girdisi** — hukuk | yürüyor |
| CFO | filo gözetimi | yürüyor |

**Migration numaraları:** 0123 B1 · 0124 B2 ✅ · 0125 B3c · 0126 D2 bayrakları ·
0127 `admission_rate_basis`'e `not_published` · 0128 D4 · sıradaki **0129**.

---

## Bugün merge edilenler

**B2 — tam ekran yükseltme kartı (`599f9d97`).** Çarpı sağ üstte, dönen
özellikler, alevli logo, fiyat kumandadan, sahte ödeme ekranı yok. Yazan oturum
önce *var mı* diye baktı — vardı; yeniden yazmak yerine doğruladı ve iki gerçek
boşluk kapattı (commit'lenmiş kırık `node_modules` symlink'i, sıfır test).
CEO kontrolü: typecheck temiz, 413 dosya / 6177 test, lint 0 hata.

**C1 — veli uçtan uca (`ff95182f`).** İki oturum **paralel** koştu (CEO hatası:
kimin neyle meşgul olduğunu bilmeden dağıttım). Boşa gitmedi: biri B7 savepoint
boşluğunu bulup açık bıraktı, diğeri bulup düzeltti; sonra ilki mekanizmayı daha
doğru teşhis edip ayrıca düzeltti (`execute_sql` stop-on-error, çıplak savepoint
yetmiyor). Üç kayıt da merge edildi.

**B3b — veli özeti aylığa (`ff95182f`).** Cron olmadığı için "aylık" davranış
çağrılma sıklığına değil `last_commentary_sent_at`'e dayanıyor (30 günlük kayan
pencere). Yeni fonksiyon değil, `period` parametresi — mevcut çağıranlar aynen
duruyor. Merge sonrası: 413 dosya / **6190 test**.

---

## D3 — ✅ ölçüm tamam (`9abea707`)

**En boş tekil alan `university_deadlines`: %89,7** — ve mevcut "içerik yok"
kontrolünün hiç kapsamadığı bir eksen. Son başvuru tarihi öğrencinin en çok
işine yarayan veri. **D1 bu yüzden kalan 16 kurumda tarihleri de topluyor** —
zaten resmî kabul sayfasında, ikinci tur atmaktan ucuz.

## D4 — üniversite tekilleştirme (**0128**, sahibi var)

MIT ve HKUST ikişer satır, "UCL" ile "University College London" muhtemelen aynı
kurum. D3 beş satırı isim isim yazdı. **Boş kopyayı doldurmak iki kez zarar
verir.** D1 bu satırları atlıyor.

## D7 — giriş yolu olmayan programlar işaretlensin (yeni, sahipsiz)

D1 dolgusunda çıktı: **Tokyo Üniversitesi'nde bizim 14-18 yaş kitlemiz için
İngilizce-öğretim lisans başvuru yolu yok** — PEAK son alımını Fall 2026'da
yaptı, diğer İngilizce program (GSC) yalnızca yurt dışında iki yıl okumuş
öğrenciler için transfer kabul ediyor.

**Ürün sonucu:** öğrenci böyle bir üniversiteyi hedef listesine ekleyebiliyor ve
ürün ona bir **kabul görünümü** hesaplıyor — başvurabileceği bir yol olmadığı
hâlde. Spesifikasyonun yasakladığı sahte kesinliğin tam örneği.

Dolgu oturumu bunu, GSC'nin transfer şartlarını genel şartmış gibi yazmak yerine
durumu açıkça anlatan bir satır olarak kaydetti — doğru olan. **Eksik olan,
ürünün bunu bilmesi.**

## D4 eki — yeni kopya çifti, sahipsiz

"The University of Technology Sydney (UTS)" ve "University of Technology Sydney"
iki ayrı satır. MIT/HKUST/UCL ile aynı şekil. D4'ün kuralı geçerli: **isim
benzerliği yetmez**, en az iki bağımsız kanıt (resmî alan adı, şehir, kurum
kimliği). Kimse dokunmadı.

---

## C2 — sunucu tarafı merge edildi, AMA uç noktalar ulaşılamaz (bilerek)

`73124976`: sağlayıcıya `generateTextStream`, `generateAdvisorReplyStream`, ve iki
Route Handler (`app/api/advisor/chat/route.ts`, `.../retry/route.ts`).

**Hiçbir istemci bu uç noktaları çağırmıyor ve çağırmamalı — henüz.** Route
Handler'lar `sendAdvisorMessage`/`retryAdvisorMessage`'ın **11 korumasını elle
aynalıyor**, ve bu tam olarak bir korumanın sessizce eksik kalabileceği şekil.
Şu an güvenli olmasının tek sebebi ulaşılamaz olmaları. **İstemci `submit()`
bağlanmadan önce, her korumanın kırılıp yakalandığına dair ayrı kanıt
bekleniyor** — tercihen parite testiyle (aynı bozuk koşulu hem sunucu eylemine
hem Route Handler'a ver, aynı sonucu döndürsünler), çünkü o test listeyi ezbere
değil mevcut sunucu eylemine kilitler.

**Kimse bu uç noktaları erken bağlamasın.**

---

## D5 — son başvuru tarihleri: ölçüm tanımı değiştirdi

Global boşluk %89,7 ama **öğrencilerin gerçekten hedeflediği yerde neredeyse
sorun yok**: 12 farklı üniversite hedeflenmiş, yalnızca 1'i (Caltech) tamamen
boş. Ölçmeden doldursaydık kimsenin bakmadığı ~900 üniversiteye saatler
harcanacaktı.

**Asıl bulgu daha sinsi: MIT 10 kez hedeflenmiş ve tek satırı
`scholarship:undated`** — yani satır var, ama öğrencinin aradığı *başvuru*
tarihi yok. **"Kaç satır var" diye sayan her kontrol MIT'yi dolu sayar.**
D5 artık türe göre denetliyor, satır sayısına göre değil.

**Henüz kimseye verilmedi:** B5, B6, C3 (öğrenci ana akışı — paylaşılan tarayıcı
engeli).
