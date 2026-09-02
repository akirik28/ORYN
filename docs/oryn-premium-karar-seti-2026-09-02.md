# ORYN Premium Karar Seti (2026-09-02)

**Bu bir seçenek sunumu değil, karar belgesi.** Her başlık altında tek bir karar var,
gerekçesi ve geri dönüş maliyeti ile. Founder'ın kendi talimatı: *"premium konusunda da
her şeye sen karar ver ama uygulamaya geçmeden önce kararları tek tek konuşacağız."*
Buna göre yazıldı — hiçbir şey uygulanmadı, hiçbir dosya değiştirilmedi. Her başlık ayrı
ayrı onaylanıp/reddedilebilir.

**Bu belge boşlukta yazılmadı.** `lib/ai/limits/budget.ts` (main'de, `18560fe1`) zaten
canlı: `selectModelForUser()` fonksiyonu $0,50 hedefte Haiku'ya düşürüyor, ve kendi
yorumunda açıkça şunu söylüyor: *"CEILING is deliberately not a second, harder-enforced
threshold in this module... If a hard stop is ever wanted, that is a product decision for
the founder to make explicitly."* Karar 4 doğrudan bu soruyu cevaplıyor — kodun kendisinin
sorduğu bir soru, benim icat ettiğim bir soru değil. Tüm rakamlar `lib/ai/pricing.ts`'in
gerçek fiyatlarından (`claude-sonnet-5`: $3/$15 milyon token; `claude-haiku-4-5`: $1/$5) ve
`lib/ai/limits/monthly-quota.ts`'in gerçek kotasından (`advisor_chat: 300`) hesaplandı —
tahmin değil, koddan okundu.

---

## Karar 1 — Sonsuza kadar, herkese, sınırsız ücretsiz olan ne?

**KARAR:** Sohbet (danışman chat) DIŞINDAKİ bütün ürün — profil, portföy, kariyer profili
skoru ve geçmişi, fırsat akışı ve eşleştirmeleri, üniversite kâşifi ve outlook, başvuru
takibi, son tarihler, bildirimler — sonsuza kadar ücretsiz ve sınırsız. Bunun içine
**haftalık plan üretimi de dahil**, çünkü otomatik ve periyodik (öğrenci ne kadar tıklarsa
tıklasın haftada bir kere çalışıyor), öğrencinin spam'leyebileceği bir şey değil.

**GEREKÇE:**
1. AGENTS.md'nin kendi MVP tanımı (Phase 53), "Oryn'a kişiselleştirilmiş sorular sorabilme"yi
   ve "3 öncelikli aksiyon alma"yı ücretli katman arkasına koymuyor — bunlar MVP'nin
   kendisi. Bu yüzden Khanmigo'nun modelini (bkz. §8'deki kendi araştırmam — ödeme
   olmadan hesap bile açılmıyor) kasıtlı olarak reddediyorum: ORYN'in "hedefsiz bir
   öğrenciye bile faydalı olmalı" (Non-Negotiable #1) ilkesiyle doğrudan çelişir.
2. Maliyet yapısı bunu zaten destekliyor: metrelenen tek gerçek risk, öğrencinin sınırsız
   tıklayabileceği açık uçlu yüzey (sohbet, "yeniden oluştur" düğmesi) — geri kalan her şey
   ya tamamen deterministik (skorlama, eşleştirme mantığı) ya da periyodik/otomatik
   (haftalık plan), yani maliyeti öğrencinin davranışından değil takvimden geliyor.
3. İncelediğim hiçbir üründe (araştırma belgesi, `docs/research/yz-kota-tasarimi-2026-09-02.md`)
   "temel ürün" metrelenmiyor — hepsi sadece açık uçlu sohbet/üretim yüzeyini ölçüyor.

**GERİ DÖNÜŞ MALİYETİ:** Düşük ama asimetrik. Bir şeyi sonradan ücretsizden ücretliye
taşımak (kısıtlamak) kullanıcı güvenini zedeler — ORYN'in "arkadan bıçaklamama" ilkesiyle
(Karar 4'teki aynı mantık) çelişir. Bunu ücretliden ücretsize taşımak ise sorunsuz. Yani
şüpheye düşülen bir özellik varsa, cömert tarafta hata yapmak daha ucuz.

---

## Karar 2 — Danışman sohbeti nasıl ölçülüyor, hangi sayı?

**KARAR:** Mevcut mekanizma (hedefte Haiku'ya düş) doğru, dokunmuyorum. Ama
`MONTHLY_AI_QUOTAS.advisor_chat` sabiti **300'den ~56'ya** düzeltilmeli — bu, "asla sert
duvar yok" ilkesini bozmuyor (aşağıda açıklıyorum, bkz. Karar 4), sadece var olan sayının
$1,00 tavanla hiç ilişkisi olmadığını düzeltiyor.

**Hesap (gerçek `pricing.ts` rakamlarından, 1.600 girdi + 2.000 çıktı token/mesaj varsayımıyla):**

```
Sonnet mesaj maliyeti:  (1.600×$3 + 2.000×$15) / 1.000.000 = $0,0348 ≈ $0,035
Haiku  mesaj maliyeti:  (1.600×$1 + 2.000×$5) / 1.000.000  = $0,0116

$0,50 HEDEF'e kadar:     ⌈0,50 / 0,035⌉ = 15 Sonnet mesajı  (harcanan: $0,522)
$1,00 TAVAN'a kalan:      $1,00 − $0,522 = $0,478
                          $0,478 / $0,0116 ≈ 41 Haiku mesajı

TOPLAM (yalnız sohbet):  15 + 41 = 56 mesaj/ay
```

Bu **300 değil, ~56** — mevcut 300 sayısı hiçbir dolar rakamından türetilmemiş, round bir
sayı. `docs/research/yz-kota-tasarimi-2026-09-02.md` §9.2'nin bulduğu şey tam bu: hiçbir
incelenen ürün "düşür ama asla durma" yapmıyor, hepsi bir yerde dolar cinsinden gerçekten
duruyor — ORYN'in $1 tavanı da öyle olmalı.

**Not — bu 56 iyimser bir üst sınır.** Haftalık plan üretimi ve gerekçe metinleri gibi
öğrencinin tetiklemediği otomatik AI çağrıları da aynı `ai_usage` tablosuna, aynı aylık
toplam üzerinden yazılıyor (CEO'nun bu oturumda paylaştığı rakam: bunlar tek başına ayın
bütçesinin **~%25'ini** otomatik tüketiyor — bu rakamı ben doğrudan doğrulamadım, kaynağı
CEO'nun ölçümü). Eğer doğruysa, sohbete gerçekte kalan pay ~56 değil, **~35-40** civarı.
Kesin kesişim noktasını iddia etmiyorum çünkü elimde tam dökümü yok; ama yuvarlak, temiz
bir sayı seçilecekse **40-50 aralığı**, hem $1 tavanı hem otomatik yükü hesaba katan,
gerçekçi bir aralık.

**GEREKÇE:** Düz mesaj sayısı yanlış birim (§9.2, kendi maliyetimiz özellik başına 4-5x
değişiyor) — ama öğrenciye bir sayı göstermek gerekiyor (16 yaşında biri "$0,50" göremez,
"56 mesaj" görür). Bu yüzden iç mantık dolar, dış yüz mesaj sayısı — ikisi çelişmiyor,
biri diğerinden türetiliyor.

**GERİ DÖNÜŞ MALİYETİ:** Tek bir sabit değişikliği (`MONTHLY_AI_QUOTAS.advisor_chat`),
sıfır mimari risk. Ama **iletişim maliyeti var**: eğer "300 mesaj" herhangi bir yerde
(pazarlama, onboarding metni) zaten söylenmişse, düşürmek geri adım gibi görünür. Ürün
henüz yayınlanmadığı için (`docs/what-the-cap-actually-permits-2026-09-02.md`'nin de
teyit ettiği gibi) bu risk şu an sıfır — bunu şimdi düzeltmenin maliyeti en düşük olduğu
an, tam da bu yüzden.

---

## Karar 3 — Ücretli katmanda GERÇEKTE ne değişiyor?

**KARAR:** Aşağıdaki ayrım dürüstçe iki sütuna bölünüyor — biri gerçek kapasite farkı,
diğeri sadece daha büyük tahsisat. İkisini birbirine karıştırıp "daha fazla AI" diye tek
bir pazarlama cümlesinde satmıyoruz.

| Alan | Free | Premium | Tür |
|---|---|---|---|
| Danışman sohbeti | ~40-50 mesaj/ay (Karar 2) | ~110-115 mesaj/ay (aynı formül, 2x hedef/tavan) | **Sadece tahsisat** — aynı model, aynı kalite, daha fazla hakkı var |
| CV/profil içe aktarma | Hesap başına 1 kez (en pahalı tekil çağrı, $0,062) | Sınırsız yeniden içe aktarma | **Gerçek kapasite** — farklı bir yetenek, sadece sayı değil |
| Araştırma proje üretici (Phase 13) | Ayda 1 üretim (3 fikir) | İstek üzerine yeniden üretim | **Gerçek kapasite** |
| "AI ile geliştir" (Phase 5, achievement refine) | Ayda sınırlı sayıda | Cömert/pratikte sınırsız | **Sadece tahsisat** |
| Kabul görünümü aralığı tahmini (Phase 16.1, deneysel) | Yok — sadece nitel etiket (Reach/Competitive/...) | Var — aralık + güven seviyesiyle | **Gerçek kapasite** — spec'in kendisi bunu "opsiyonel" olarak tanımlıyor, doğal bir kesim noktası |
| Kanıt (evidence) depolama | Sınırlı MB/dosya | Daha yüksek kap | **Sadece tahsisat** |
| Haftalık plan, skor, fırsat/üniversite verisi | Sınırsız (Karar 1) | Sınırsız (Karar 1) | Fark yok — hiç metrelenmiyor |

**GEREKÇE:** CEO'nun talimatı dürüst olmamı istedi — "daha fazla mesaj hakkı" diye
satılan bir tahsisat artışını "yeni özellik" gibi göstermek, incelediğim ürünlerden
hiçbirinin yapmadığı bir şey değil aslında (çoğu tam olarak bunu yapıyor — bkz. GitHub
Copilot Pro/Pro+/Max, sadece kredi büyüklüğü değişiyor) ama ORYN'in kendi ses tonu
ilkesiyle (Phase 57 — "spesifik, dürüst, abartısız") bunu gizlemek tutarsız olurdu. Bu
yüzden tabloyu iki türe ayırdım: gerçek kapasite farkları öğrenciye "bunun için ödüyorsun"
diye anlatılabilir; tahsisat farkları "daha fazla konuşma hakkı" diye, olduğu gibi.

**GERİ DÖNÜŞ MALİYETİ:** Orta. Bir özelliği premium'dan free'ye taşımak kolay; free'den
premium'a taşımak (yeni bir kısıtlama eklemek) yayından SONRA yapılırsa güven maliyeti
var. Kabul görünümü aralığı tahmini özellikle hassas — Phase 16'nın kendi kuralı (yanıltıcı
kesinlik asla) her iki tarafta da geçerli kalmalı, sadece erişim farklı.

---

## Karar 4 — Dolar tavanı: kodun kendi sorduğu soru

`lib/ai/limits/budget.ts` şu an CEILING'i ($1,00) hiçbir yerde zorlamıyor — kendi
yorumunda bunu açıkça bir "yapılmadı, founder karar versin" maddesi olarak işaretlemiş.

**KARAR: Yeni bir mekanizma eklemeyin. Var olan aylık mesaj kotasını (`isMonthlyQuotaExhausted`,
zaten kodda var ve muhtemelen zaten bir yerde uygulanıyor) $1,00'dan türetilmiş sayıya
(Karar 2'deki ~56, ya da otomatik yük dahil ~40-50) düşürün.** Bu, iki var olan mekanizmayı
birbirine bağlıyor, üçüncü bir duvar eklemiyor:

```
Mekanizma A (zaten var, dokunulmuyor): $0,50 hedefte Haiku'ya düş — kalite hiçbir zaman
                                        "hayır" demiyor, sadece ucuzluyor.
Mekanizma B (zaten var, sadece sayısı  Aylık mesaj kotası dolunca sohbet o ay için durur.
düzeltiliyor):                         Bu ZATEN "sert duvar" — ama şu an 300'de, yani
                                        gerçekte hiç tetiklenmiyor (bir öğrenci 300 mesaja
                                        ulaşmadan çok önce zaten Haiku'da).
```

**Bu, "asla sert duvar yok" ilkesini bozmuyor — çünkü o ilke zaten "asla KALİTE
düşürülmeden durmayacaksın" anlamına geliyordu, "asla bir üst sınır olmayacak" değil.**
İkisi farklı vaatler. Founder'ın bu oturumda söylediği cümle bunu doğruluyor: *"ben çok
sessizce yapmak istemiyorum çünkü sonra bize suç atacak"* — endişe sessizlik, sınırsızlık
değil. $1'da duran ve bunu görünür şekilde gösteren (görünür bar, dispatch edilmiş) bir
ürün, hem "asla duvara çarpma" hissini korur (56 mesaj, çoğu öğrenci için zaten
görünmeyen bir sayı) hem de gerçek bir mali tavan koyar.

**GEREKÇE:** `docs/research/yz-kota-tasarimi-2026-09-02.md` §9.2 — incelenen 8 üründen
hiçbiri sınırsız düşüş yapmıyor, hepsi bir yerde dolar cinsinden duruyor. ORYN'in şu anki
hali (300 mesaj, tavan yok) bu araştırmadaki tek aykırı örnek.

**GERİ DÖNÜŞ MALİYETİ:** Tek satırlık sabit değişikliği. Geri almak da tek satır. En düşük
riskli karar bu belgede.

---

## Karar 5 — Fiyat noktaları (USD + TRY)

**KARAR — USD: $6.99/ay, $59.99/yıl** (yıllıkta ~2 ay ücretsiz, araştırdığım ürünlerin
çoğunun kullandığı örüntü — Cursor, Replit, Duolingo hepsi benzer bir indirim oranı
kullanıyor).

**GEREKÇE:** Khanmigo (en yakın yaş-grubu emsali) $4/ay, tamamen sabit; Perplexity
Education Pro $10/ay (standart $20'nin yarısı, doğrulanmış öğrenciye). ORYN bu ikisinin
arasında konumlanıyor çünkü değer önerisi Khanmigo'dan (ödev yardımı) daha yüksek riskli/
yüksek değerli (üniversite/kariyer) ama ChatGPT Plus gibi genel amaçlı, günlük kullanılan
bir üretkenlik aracı değil — haftalık check-in şekilli bir ürün. $6,99'da, premium tavan
maliyeti ($3/ay, Karar 3'teki 2x hesabıyla) toplam fiyatın ~%43'ü — biraz yüksek ama erken
aşamada cömertlik güven inşa etmenin bir parçası; sıkılaştırmak (Karar 1'in mantığıyla
aynı asimetri) her zaman gevşetmekten daha ucuz.

**KARAR — TRY: ~₺299/ay**, USD'den sabit kur çevirisi DEĞİL, doğrudan TL fiyatlandırma,
**üç ayda bir gözden geçirme şartıyla.**

**GEREKÇE:** OpenAI'ın kendi Türkiye tarihi bunu doğruca gösteriyor —
[CNN Türk, 23.12.2025](https://www.cnnturk.com/teknoloji/chatgpt-go-turkiyede-kullanima-sunuldu-chatgpt-go-ne-kadar-chatgpt-plus-ve-pro-kac-tl-aylik-ve-yillik-fiyat-listesi-2376057):
OpenAI, tam da bu sorunu çözmek için standart $20'lık Plus'ın YARISI fiyatına
("ChatGPT GO", 249,99 TL/ay) ayrı bir ucuz katman açtı — düz kur çevirisi değil, bilinçli
bir alt-pazar fiyatı. O tarihte TRY/USD kuru (bugünkü 48,3'ten [tradingeconomics.com,
2026-09-02], 12 ayda %17,47 değer kaybını geriye sararak) ~41 civarındaydı, yani 249,99 TL
o an ~$6 ediyordu — **ORYN'in $6,99 USD fiyatıyla neredeyse örtüşen, bağımsız bir ikinci
kaynak.** Ama sonra ([Technopat/ShiftDelete.net, Haziran 2026] — bu makaleleri açıp
doğrulamadım, sadece arama özetinden) OpenAI Plus'taki TL indirimini tamamen kaldırıp düz
$20 fiyata geçti — yani bu tür indirimli fiyatlar kalıcı değil, kur ve şirket politikasına
göre değişiyor. **₺299 rakamını sabit bir gerçek olarak değil, bugünün kuruyla makul bir
başlangıç noktası olarak sunuyorum** — TL'nin son 12 ayda kaybettiği %17,47'lik değer göz
önüne alınca, sabit TL fiyatı zamanla USD karşılığını erozyona uğratacak; bu yüzden üç
aylık gözden geçirme şart, yıllık değil.

**GERİ DÖNÜŞ MALİYETİ — her iki fiyat için:** Yüksek. Fiyat değiştirmek, özellikle
mevcut abonelere, güven maliyeti taşır (çoğu üründe "mevcut fiyatınız korunacak" taahhüdüyle
yumuşatılıyor). Bu yüzden bu kararı ilk üçten (1-3) daha temkinli onaylayın — ilk üçü
yanlış çıkarsa ucuza düzeltilir, bu ikisi yanlış çıkarsa müşteri iletişimi gerektirir.

---

## Karar 6 (KİLİTLİ — karar verilmedi) — Ödeyen kim: veli mi öğrenci mi?

**Bu karara kasıtlı olarak girmiyorum.** CEO'nun talimatı açık: ödeme, veli-onayı sorusunu
çözecek hukuki incelemeye bağlı, ve bu benim territory'm değil (brief #3, ayrı
araştırılıyor). **Ama iki karar bu soruya göre değişiyor, onları burada işaretliyorum ki
hangi yönde çözülürse çözülsün belge geçerli kalsın:**

- **Eğer veli ödemesi zorunluysa:** Ödeme akışı Khanmigo'nun kanıtlanmış deseniyle
  aynı olmalı (§8'deki kendi araştırmam — "1 hesap → 10 çocuğa kadar ekle" modeli).
  Ödeme UI'ı öğrenciye değil veliye gösterilir; öğrenci sadece "ailenizi davet edin"
  akışını görür.
- **Eğer öğrenci doğrudan ödeyebiliyorsa** (ör. 18 yaş sınırı, ya da farklı bir kontrol
  mekanizmasıyla): daha basit, doğrudan self-serve checkout mümkün.
- **Değişmeyen:** Karar 1-5'teki hiçbir şey (ne var olan ne fiyat) bu cevaba bağlı değil
  — sadece ÖDEME EKRANINI kimin gördüğü değişiyor. Bu, hukuki cevap ne olursa olsun bu
  belgenin geçerliliğini koruyor.

---

## Karar 7 (KİLİTLİ — karar verilmedi) — Dönem içinde ödeyerek geri dönme

**Bu karara da girmiyorum, aynı gerekçeyle** (`docs/research/yz-kota-tasarimi-2026-09-02.md`
§12'de de aynı şekilde reddettim). Bir öğrencinin ayın ortasında $1 tavana ulaşıp anında
ödeyerek Sonnet'e geri dönmesi, reşit olmayana doğrudan ödeme alma sorusuna giriyor —
Karar 6'yla aynı hukuki inceleme kapsamında. **Varsayılan: sadece aylık sıfırlanmayı
bekleyerek geri dönüş** — yeni bir ödeme/rıza yüzeyi açmıyor, güvenli varsayılan.

---

## Açık riskler (karar değil, ama karar vermeden önce bilinmesi gereken)

1. **Haiku, gerçek bir öğrenciye karşı hiç çalıştırılmadı** (CEO'nun bu oturumdaki notu —
   ben doğrulamadım). Bu bir maliyet riski değil, bir **kalite** riski: $0,50'de düşen bir
   öğrenci, danışmanın aniden daha kısa/daha az nüanslı cevap verdiğini fark edebilir.
   Karar 4'ün önerdiği görünür bar bunu kısmen çözüyor (öğrenci NEDEN olduğunu görür) ama
   Haiku'nun ORYN'in gerçek sistem promptuyla (Phase 8.2 — "titiz ama faydalı bir mentor"
   tonu) ne kadar iyi çalıştığı hiç ölçülmedi. Yayından önce bir kalite kontrolü öneririm —
   bu benim territory'm değil, `lib/ai/eval/` zaten var (oryn-3f'nin çalıştığı alan),
   oraya bir Haiku-spesifik değerlendirme eklemek mantıklı olur.
2. **Otomatik (haftalık plan + gerekçe) çağrıların gerçek payı ölçülmedi, sadece tahmin
   edildi** (Karar 2'deki "~%25" notu). Bunun gerçek dökümü olmadan Karar 2'deki 40-50
   aralığı hâlâ bir tahmin — `ai_usage` tablosunun `feature` sütununa göre gruplanmış bir
   sorgu (canlı veri gerektirir, ürün henüz yayında değil) bu belirsizliği kapatır.

---

## Özet — tek bakışta yedi karar

| # | Karar | Durum |
|---|---|---|
| 1 | Sohbet dışı her şey sonsuza kadar ücretsiz | Karar verildi |
| 2 | Sohbet kotası 300 → ~56 (otomatik yük dahil ~40-50) | Karar verildi |
| 3 | Premium'da gerçek kapasite (CV, araştırma, aralık tahmini) + tahsisat artışı (mesaj) ayrı ayrı | Karar verildi |
| 4 | $1 tavan = var olan mesaj kotasının düzeltilmesi, yeni mekanizma yok | Karar verildi |
| 5 | $6,99/ay USD, ~₺299/ay TRY (3 ayda bir gözden geçir) | Karar verildi |
| 6 | Veli mi öğrenci mi ödüyor | **Kilitli — hukuki incelemeye bağlı** |
| 7 | Dönem içi ücretli geri dönüş | **Kilitli — reddedildi, aynı hukuki inceleme** |

**Kaynaklar:** `lib/ai/limits/budget.ts`, `lib/ai/limits/job-budget.ts`,
`lib/ai/pricing.ts`, `lib/ai/limits/monthly-quota.ts` (hepsi bu oturumda doğrudan okundu,
`origin/main`@`18560fe1`); `docs/research/yz-kota-tasarimi-2026-09-02.md` (bu oturumun
önceki çıktısı); ChatGPT Türkiye fiyatlandırması —
[CNN Türk, 23.12.2025](https://www.cnnturk.com/teknoloji/chatgpt-go-turkiyede-kullanima-sunuldu-chatgpt-go-ne-kadar-chatgpt-plus-ve-pro-kac-tl-aylik-ve-yillik-fiyat-listesi-2376057)
(doğrudan açılıp okundu); USD/TRY kuru —
[tradingeconomics.com](https://tradingeconomics.com/turkey/currency), 2026-09-02 (arama
özetinden, sayfa doğrudan doğrulanmadı — kur verisi olduğu için düşük risk).
