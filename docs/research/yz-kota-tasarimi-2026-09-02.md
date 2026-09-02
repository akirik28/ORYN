# YZ ürünleri kota tasarımını nasıl yapıyor? (2026-09-02)

**Görev:** ORYN'in "asla sert duvar yok, bütçe dolunca sessizce Haiku'ya düş" kararını,
gerçek YZ ürünlerinin kota/limit tasarımlarına karşı sınamak. Kod yazılmadı; bu saf bir
araştırma belgesidir.

**Kapsam ve iş bölümü:** Bu belge brief #2'ye (limitte NE OLUYOR) ait. Paywall'un NEREDE
durduğu ve upgrade prompt'unun ne zaman göründüğü oryn-b9'un
[docs/research/freemium-genclik-urunleri-2026-09-02.md](freemium-genclik-urunleri-2026-09-02.md)
belgesinin konusu — o belgeden Khanmigo ve CollegeVine'a dair iki bulguyu, kendi
territoryma girdiği için burada devralıp analiz ediyorum (§8, §9.3); geri kalanına
dokunmuyorum.

**Kaynak kuralı:** Her rakamın yanında URL + erişim tarihi var. WebSearch/WebFetch özetleri
sadece ipucu olarak kullanıldı — yazılan her rakam, sayfa doğrudan açılıp (Browser aracıyla,
`get_page_text` veya DOM okuması ile) doğrulandıktan sonra yazıldı. Doğrulanamayan yerlerde
"bulunamadı" yazıyor, tahmin yok. Hiçbir yere kayıt olunmadı, hiçbir form doldurulmadı.

---

## 1. Cursor

**Kaynaklar:** [Models & Pricing](https://cursor.com/docs/models-and-pricing),
[Usage and limits](https://cursor.com/help/models-and-usage/usage-limits) — ikisi de
2026-09-02'de doğrudan açılıp okundu.

1. **Birim:** Dolar cinsinden aylık "usage pool" (iki havuz: Cursor'ın kendi modelleri +
   üçüncü taraf modeller), token maliyetine göre tüketiliyor. Pro $20/ay, Pro Plus $60/ay,
   Ultra $200/ay — plan fiyatı kabaca dahil kullanım bütçesi gibi çalışıyor. Mesaj sayısı
   veya "istek" sayısı değil, gerçek model maliyeti.
2. **Limitte ne oluyor:** Editörde bildirim çıkıyor. Sayfanın kendi ifadesiyle: **"Requests
   are never downgraded in quality or speed."** İki seçenek sunuluyor: on-demand kullanım
   aç (aynı API fiyatından pay-as-you-go) veya plana yükselt. On-demand açık değilse,
   pratikte devam edemiyorsun.
3. **Kalan kota gösterimi:** Sürekli görünür — editör ayarlarında ve "Spending" panosunda
   gerçek zamanlı, iki havuz da ayrı ayrı.
4. **Sıfırlanma penceresi:** Aylık, fatura döngüsüyle birlikte. Kullanılmayan kota
   devretmiyor.
5. **Ücretli aşım yolu:** Evet — aynı API fiyatından ölçülü kullanım (on-demand), ayrıca üst
   plana geçiş.

---

## 2. Perplexity

**Kaynaklar:** [What is Perplexity Pro?](https://www.perplexity.ai/help-center/en/articles/10352901-what-is-perplexity-pro)
(son güncelleme 21 Temmuz 2026), [What is Pro Search?](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search),
[Which plan is right for you?](https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you)
(son güncelleme 18 Ağustos 2026) — üçü de 2026-09-02'de doğrudan açıldı.

1. **Birim:** "Pro Search" adında ayrı bir sorgu tipi. **Önemli bulgu: Perplexity artık
   kendi resmi sayfasında kesin bir sayı vermiyor.** Free için "very limited amount",
   Pro için "a high volume of daily searches" gibi kasıtlı belirsiz ifadeler kullanılıyor.
   Üçüncü taraf bloglarda dolaşan "günde 5" (free) gibi rakamlar bu oturumda resmi sayfada
   doğrulanamadı → **bulunamadı (resmi kaynakta)**.
2. **Limitte ne oluyor:** Resmi sayfalarda açık bir "şu olur" cümlesi yok. "Best" modu
   "available without quota limits" olarak tanımlanıyor — yani her zaman kotasız bir geri
   dönüş modu var. Gelişmiş modeller için sayfa "access may be limited during weeks of
   especially heavy usage" diyor — muğlak, dinamik bir kısıtlama.
3. **Kalan kota gösterimi:** Resmi belgede bulunamadı.
4. **Sıfırlanma penceresi:** Resmi sayfada net değil; üçüncü taraf kaynaklar "haftalık"
   diyor ama bu oturumda resmi doğrulama **bulunamadı**.
5. **Ücretli aşım yolu:** Metrelenmiş pay-per-search yok; sadece üst plana geçiş (Max) veya
   **Education Pro** — SheerID ile doğrulanmış öğrenci/eğitimci planı, **$10/ay, sınırsız
   Pro Search dahil**. Doğrudan öğrenciye satılan bir üründe, doğrulanmış kullanıcıya sayı
   limitini tamamen kaldırma örneği.

**Vaka — sessiz kota daraltması (Mayıs 2026):** [piunikaweb.com, 15 Mayıs 2026, 19 Mayıs
güncellemeli](https://piunikaweb.com/2026/05/15/perplexity-rate-limit-reduce-pro/) —
Pro kullanıcıları günlük 10-20 sorguda haftalık kotanın tükendiğini fark etti, hiçbir
duyuru yapılmamıştı. Kullanıcı tepkisi doğrudan alıntı: *"these new limits feel like a
bait-and-switch tactic."* Perplexity'nin sonraki resmi açıklaması (Android Authority'ye
verilen ifade, makalede aktarılıyor): asıl neden promosyon kodu dolandırıcılığına karşı
uygulama sıkılaştırmasıydı, genel bir maliyet kısıtlaması değil. **Bu vaka bir kotanın
sessizce düşürülmesiyle ilgili — modelin sessizce değiştirilmesiyle değil; ORYN'in kararı
için ayrım önemli, bkz. §10.**

---

## 3. Notion AI

**Kaynaklar:** [Pricing](https://www.notion.com/pricing),
[Notion AI complimentary responses](https://www.notion.com/help/complimentary-ai-responses)
— 2026-09-02'de doğrudan açıldı.

1. **Birim:** Ayrık "AI response" sayacı — tek seferlik (aylık değil) ücretsiz deneme.
   **Bulgu: resmi sayfa artık geçmişte yaygın atıfta bulunulan "20" rakamını
   içermiyor** — sadece "complimentary AI responses" diyor, kesin sayı vermiyor. Üçüncü
   taraf bloglar hâlâ "20, workspace başına, tek seferlik" diyor ama güncel resmi sayfada
   **doğrulanamadı**.
2. **Limitte ne oluyor:** Sert duvar. Sayfanın kendi ifadesi: *"you will see a message that
   an upgrade to the Business or Enterprise Plan is necessary to continue using AI
   features."* Ölçülü/pay-as-you-go devam seçeneği yok (deneme havuzu için).
3. **Kalan kota gösterimi:** Resmi belgede bulunamadı.
4. **Sıfırlanma penceresi:** Yok — tek seferlik deneme, tekrar dolmuyor.
5. **Ücretli aşım yolu:** Sadece plan yükseltme (Business $20/kullanıcı/ay ya da
   Enterprise). Ayrı bir özellik olan "Custom Agents" $10/1.000 aylık kredi ile
   metrelenmiş, ama bu temel AI denemesinden farklı bir ürün.

---

## 4. ChatGPT / OpenAI (Free, Plus, Enterprise/Edu)

**Kaynaklar:** [What is ChatGPT Plus?](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus)
(16 gün önce güncellenmiş), [ChatGPT Free Tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq)
(19 gün önce), [Manage usage limits and overages in ChatGPT Enterprise and Edu](https://help.openai.com/en/articles/20001001-manage-usage-limits-and-overages-in-chatgpt-enterprise-and-edu)
(3 gün önce) — üçü de 2026-09-02'de doğrudan açıldı.

1. **Birim:** Free'de metin sohbeti **"unlimited"** (kötüye kullanım korumasına tabi) ama
   Free'nin varsayılan modeli zaten hafif model (**GPT-5.6 Luna**) — yani pahalı model hiç
   verilmiyor, "düşürme" değil "baştan hafif". Görsel/dosya/analiz araçları ayrı, ayrık
   limitlere tabi. Plus'ta kesin sayı **yok** — sayfa kelimesi kelimesine "may vary based
   on system conditions" diyor. Enterprise/Edu'da ise **kullanıcı başına aylık dolar
   kredisi havuzu** (admin tarafından yapılandırılıyor).
2. **Limitte ne oluyor:** Free'de araç-bazlı limitler → "wait for a later time" (sert
   duvar, bekle). "GPT'lere" (özel bot pazaryeri) erişim → "pauses until the limit
   resets." Plus'a geçince kota resetleniyor. Enterprise/Edu'da: kullanıcının aylık
   limiti dolunca **"additional eligible usage for the user is prevented"** — sert duvar
   — meğer ki workspace'in paylaşımlı havuzunun ötesinde admin bir "overage limit"
   tanımlamış olsun (o zaman faturaya yansıyarak devam edebiliyor).
3. **Kalan kota gösterimi:** Tüketiciye "ChatGPT will notify you when you reach an
   applicable limit" — eşiğe gelince bildirim, sürekli sayaç değil. Enterprise/Edu'da
   admin panelinde gerçek zamanlı analytics + eşik alarmları.
4. **Sıfırlanma penceresi:** Enterprise/Edu net: aylık (UTC ayın 1'i, 00:00) ya da fatura
   döngüsüne hizalı — admin seçiyor. Tüketici Free/Plus'ta kesin pencere **bulunamadı**
   (sadece "resets" deniyor).
5. **Ücretli aşım yolu:** Tüketici tarafında yok — sadece üst plana geçmek. Enterprise/Edu
   tarafında var: workspace'in "overage limit"i (admin tanımlı, dolar bazlı, fatura
   olarak yansıyor).

**Silik model geçmişi ve iki büyük vaka — bkz. §10.** Ayrıca not: 2025 ortası itibarıyla
yaygın belgelenen "ücretsiz kullanıcı GPT-4o limitine takılınca sessizce GPT-4o mini'ye
düşer" mekanizması, GPT-4o'nun kendisi kullanımdan kaldırıldığı için artık **güncel resmi
belgede karşılığı yok** — bunu tarihsel bir emsal olarak değerlendiriyorum, güncel davranış
olarak değil.

---

## 5. Claude / Anthropic (Pro, Max)

**Kaynaklar:** [What is the Pro plan?](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan)
(sayfa tarihi 10 Haziran 2026), [How do usage and length limits work?](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work)
(13 Temmuz 2026), [Manage usage credits for paid Claude plans](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)
(3 hafta önce güncellenmiş) — 2026-09-02'de doğrudan açıldı.

1. **Birim:** "Conversation budget" — mesaj uzunluğu, dosya eki uzunluğu, konuşma
   geçmişi, seçilen model ve "effort level"e göre değişen token tüketimi. Kesin sayı
   verilmiyor, sadece göreli: "en az free'nin 5 katı."
2. **Limitte ne oluyor:** Usage credits **kapalıysa** (varsayılan): **sert duvar**,
   "blocked when you hit your session limits." Usage credits **açıksa** (opt-in, ödeme
   yöntemi gerekli, sadece web'de açılabiliyor): standart API fiyatından ölçülü kullanıma
   geçiliyor, ayrı faturalanıyor. **Kritik bulgu: model otomatik olarak ucuza
   düşürülmüyor.** Sayfa, Haiku'ya geçişi kullanıcıya bir **tavsiye** olarak sunuyor
   ("Choose efficient models: Use our most efficient Haiku model...") — sistem kendisi
   yapmıyor, kullanıcı manuel seçiyor.
3. **Kalan kota gösterimi:** Talep üzerine — Settings > Usage'da gerçek zamanlı harcama,
   geçmiş, bir sonraki reset zamanı. Sürekli görünen bir HUD öğesi olduğuna dair belgede
   ifade **yok**.
4. **Sıfırlanma penceresi:** Oturum limiti her **5 saatte** bir; ayrıca hesaba özel sabit
   bir günde sıfırlanan **haftalık üst limit**.
5. **Ücretli aşım yolu:** Usage credits (opt-in, standart API fiyatı), kullanıcı tanımlı
   aylık harcama tavanı, otomatik yükleme opsiyonu. Günlük $2.000 üst sınır var (dolandırıcılık/kaçak koruması gibi görünüyor).

---

## 6. GitHub Copilot (Free, Pro, Pro+, Student, Business/Enterprise)

**Kaynaklar:** [Models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing),
[Usage-based billing for individuals](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals),
[Requests in GitHub Copilot (legacy)](https://docs.github.com/en/copilot/concepts/billing/copilot-requests)
— 2026-09-02'de doğrudan açıldı.

1. **Birim:** "GitHub AI Credits" — 1 kredi = $0,01, token maliyetinden dönüştürülüyor.
   1 Haziran 2026'da eski "premium request" sistemi tamamen bu modele geçti (eski sistem
   artık sadece göç etmemiş eski yıllık plan sahiplerine "legacy" olarak uygulanıyor).
   Her ücretli plan iki alt-havuzdan oluşuyor: **base credits** (abonelik fiyatıyla sabit)
   + **flex allotment** (AI ekonomisine göre değişen ek miktar). Pro $10/ay → 1.500 kredi
   toplam (1.000+500); Pro+ $39/ay → 7.000 (3.900+3.100); Max $100/ay → 20.000
   (10.000+10.000). **Free ve Student** planları sadece "auto model selection" ile
   sınırlı — model elle seçilemiyor; Free ayrıca ayda 2.000 kod tamamlamayla sınırlı,
   **Student sınırsız kod tamamlama alıyor.**
2. **Limitte ne oluyor:** Üç açık seçenek: plana yükselt (fiyat farkı kadar ödeyip aynı
   döngüde kalan krediler hemen kullanılabiliyor), mevcut planda kal ve **kendi
   belirlediğin dolar bütçesiyle** ek kullanıma devam et, ya da aylık sıfırlanmayı bekle.
   Daha ucuz modele geçiş mümkün ama **kullanıcı kendisi seçiyor**, sistem otomatik
   yapmıyor ("Switching to a less expensive model is one way to extend your usage
   allowance").
3. **Kalan kota gösterimi:** Kullanım panosu ("usage dashboard shows your available
   allowance and what you've used").
4. **Sıfırlanma penceresi:** Aylık, sabit — her ayın 1'i 00:00:00 UTC, abonelik fatura
   tarihinden bağımsız. Kullanılmayan kredi devretmiyor.
5. **Ücretli aşım yolu:** Evet — kullanıcı tanımlı dolar bütçesi, aynı token fiyatından.

---

## 7. Replit (Starter, Core, Pro)

**Kaynaklar:** [Replit AI Billing](https://docs.replit.com/billing/ai-billing),
[Managing Your Spend](https://docs.replit.com/billing/managing-spend),
[Pricing](https://replit.com/pricing) — 2026-09-02'de doğrudan açıldı.

1. **Birim:** Dolar cinsinden kredi, "effort-based" checkpoint fiyatlamasıyla tüketiliyor
   (basit istek < karmaşık istek maliyeti, token değil tamamlanan-iş birimi kullanıcıya
   gösteriliyor). Starter (ücretsiz): **günlük limitli** Agent chat / Free Mode, dolar
   tahsisi yok. Core $20/ay → "$20 towards most powerful models" + daha fazla ücretsiz
   Agent kullanımı. Pro $100/ay → "$100 towards most powerful models."
2. **Limitte ne oluyor:** Kredi paketi satın al ($100/$300/$500/$1.000, hacim indirimli),
   ya da aylık sıfırlanmayı bekle. Kullanıcı kendi bütçe tavanını $0,01'e çekerek fiilen
   kendini durdurabiliyor. **Dikkat çekici ters örnek:** "Intelligent model routing"
   sadece Core/Pro'da var — Starter (ücretsiz) bunu hiç almıyor. Yani Replit, daha akıllı
   yönlendirmeyi ödeyene veriyor, ORYN'in planladığının tersi bir mantık (ücretsiz/bütçesi
   biten kullanıcıya otomatik daha ucuz yönlendirme değil, daha zengin yönlendirmeyi
   ödeyene saklama).
3. **Kalan kota gösterimi:** Gerçek zamanlı — Agent panelinde checkpoint başına maliyet
   (hover ile), ayrıca kullanım panosu (30 dakikaya kadar gecikmeli olabiliyor).
4. **Sıfırlanma penceresi:** Aylık; Pro planın kredileri **2 ay boyunca devrediyor**
   (rollover), Core'da bu ifade yok.
5. **Ücretli aşım yolu:** Evet — kredi paketleri + otomatik yeniden yükleme.

---

## 8. Khanmigo (Khan Academy) — en yakın yaş-grubu emsali

**Bu ürün için iki farklı kaynak katmanı var, ayrı ayrı işaretliyorum:**

**(a) Fiyat ve erişim kapısı — oryn-b9'un aynı gece yaptığı, canlı sayfadan doğrudan
DOM-doğrulamalı araştırmasından devralındı** ([freemium
araştırması](freemium-genclik-urunleri-2026-09-02.md), §5, kaynaklar:
khanmigo.ai, khanmigo.ai/pricing, khanacademy.org/about — 2026-09-02): **$4/ay veya
$44/yıl**, hem bireysel hem aile planı için aynı fiyat, bir hesap 10 çocuğa kadar
ekleyebiliyor. **Kritik: bireysel/aile Khanmigo'da hiç ücretsiz kullanım yok** — ödeme
yapmadan, 18 yaş ve ABD ikametgahı olmadan hesap bile açılamıyor; 18 yaş altı biri
sadece ödeyen bir yetişkinin ailesine eklenmiş "çocuk" olarak erişebiliyor. Öğretmenler
için ücretsiz.

**(b) Ödeme sonrası, kota nasıl işliyor — bu benim territory'm, kendi araştırdım.**
Doğrudan yardım makalesi (`support.khanacademy.org/hc/en-us/articles/13984041207565`)
bu oturumda **404 döndürdü** — canlı sayfa artık mevcut değil ya da taşınmış. Aynı
içeriği [web.archive.org üzerinden aynı URL'nin arşiv kopyasından](https://web.archive.org/web/2026/https://support.khanacademy.org/hc/en-us/articles/13984041207565-How-is-my-AI-power-determined)
doğrudan okudum (arşiv sayfası kendi üstünde "Updated 2 years ago" diyor — yani bu artık
en az 2 yıllık, **güncelliği bu oturumda doğrulanamayan** bir mekanizma tarifi):

> "Having frequent and lengthy conversations with Khanmigo will result in Khanmigo's AI
> power decreasing more quickly. You can see how much of Khanmigo's AI power you have
> remaining by looking at the battery icon on Khanmigo. You will receive warning messages
> when (a) you are approaching the AI power limit and (b) when the limit has been
> reached. Once Khanmigo's battery runs out, you won't be able to use Khanmigo until the
> next morning (scheduled to reset at 1:00 am Pacific Standard Time)."

Yani (o dönem doğru olduğu doğrulanan tarif): **birim** konuşma uzunluğu/sıklığına göre
tükenen soyut bir "güç" (token'a dayalı olması muhtemel ama sayısal karşılığı hiç
verilmemiş); **limitte** sert duvar (kullanamıyorsun, sonraki sabaha kadar); **gösterim**
sayısal değil, sembolik pil ikonu + iki eşiği bildirimi (yaklaşıyorsun / doldu); **sıfırlanma**
**günlük**, sabit saatte (gece 1 PST) — bu araştırmadaki tek "günlük" reset penceresi
örneği, herkes ayı veya haftayı seçmişken. **Ücretli aşım yolu bulunamadı** — ne arşiv
sayfasında ne resmi fiyat sayfasında bahsi geçiyor.

**Bu iki katmanın birlikte söylediği:** Khan Academy, çocuklara doğrudan hiç ücretsiz
kullanım vermeyerek (a) riskini en baştan ortadan kaldırıyor — ORYN'in tam tersi bir
tercih (ORYN ücretsiz/dahil kullanım veriyor). Ama ödeme duvarının **arkasında bile**
sert bir günlük limit var; "ödedim, sınırsız" değil. Ve o limit sayısal olarak hiç ifşa
edilmemiş, sadece pil metaforuyla gösteriliyor — 14-18 yaş grubuna kota anlatmanın
bulduğum tek somut, sayı-kullanmayan örneği.

---

## 9. Sayılara toplu bakış ve iki ek gözlem

### 9.1 Karşılaştırma tablosu

| Ürün | Birim | Limitte davranış | Kalan kota gösterimi | Sıfırlanma | Ücretli aşım |
|---|---|---|---|---|---|
| Cursor | $ havuzu (token) | Bildirim → öde ya da yükselt; **kalite hiç düşmüyor** | Sürekli, panoda | Aylık | Var (aynı fiyat) |
| Perplexity | "Pro Search" sayısı (**sayı yok**) | Belirsiz / dinamik kısıtlama | Bulunamadı | Bulunamadı (3.parti: haftalık) | Yok (sadece plan/Education Pro) |
| Notion AI | Yanıt sayısı (tek seferlik) | **Sert duvar**, plan yükselt zorunlu | Bulunamadı | Yok (tek seferlik) | Yok (sadece plan) |
| ChatGPT Free | Sınırsız sohbet ama sabit ucuz model | Araçlarda sert duvar, bekle | Eşikte bildirim | Bulunamadı (tüketici) | Yok |
| ChatGPT Plus | Belirsiz ("may vary") | Belirsiz | Eşikte bildirim | Bulunamadı | Yok (sadece plan) |
| ChatGPT Edu/Ent. | $ kredi havuzu (admin) | **Sert duvar** (kullanıcı), workspace overage varsa devam | Admin paneli, gerçek zamanlı | Aylık (admin seçer) | Var (workspace overage) |
| Claude Pro | Token/"conversation budget" (sayı yok) | Kredi kapalıysa **sert duvar**; açıksa ölçülü — **model otomatik düşmüyor, tavsiye edilir** | Talep üzerine (Settings) | 5 saat (oturum) + haftalık | Var (opt-in, kullanıcı limitli) |
| GitHub Copilot | $ kredi (1cr=$0,01) | Yükselt / kendi bütçenle öde / bekle | Pano | Aylık, sabit gün | Var (kullanıcı bütçeli) |
| Replit | $ kredi (effort-based) | Kredi paketi al / bekle / kendi tavanını koy | Gerçek zamanlı pano | Aylık (Pro: 2 ay devir) | Var (paket) |
| Khanmigo (ödeme sonrası) | Sembolik "AI power" (sayı yok) | **Sert duvar**, ertesi sabaha kadar | Pil ikonu (sayısal değil) | **Günlük**, sabit saat | Bulunamadı |

### 9.2 Yeni bulgu: hiçbir ürün maliyeti sınırsız bırakmıyor — sadece deneyimi düşürüyor, ama bir yerde mutlaka duruyor

CEO'nun (oryn-a7) sorduğu soru buydu: *"Karşılaştırdığın ürünler maliyeti mi sınırlıyor,
yoksa sadece deneyimi mi?"* Yukarıdaki tabloya bakınca cevap net: **"dahil kullanımın
ötesinde devam etme" yolu sunan her ürün — Cursor, Claude, GitHub Copilot, Replit — bu
devamı açıkça dolar cinsinden sınırlıyor**: ya opt-in ölçülü kullanım (kullanıcı önce
ödeme yöntemi eklemek ve genelde kendi harcama tavanını belirlemek zorunda — Claude'da
ayrıca günlük $2.000 mutlak tavan var), ya sabit boyutlu bir kredi paketi satın alma
(Replit), ya da kullanıcı-tanımlı bütçe (Copilot). **Hiçbiri "dahil kullanım bitince
otomatik olarak, kullanıcı hiçbir şey yapmadan, sınırsızca ölçülü faturalamaya devam et"
yapmıyor** — ya sert duvar, ya kullanıcının bilerek/isteyerek açtığı sınırlı bir devam
yolu var. ChatGPT Free ise farklı bir yoldan aynı sonuca varıyor: pahalı model hiç
verilmiyor ki taşma riski olsun.

**Bunun ORYN için anlamı:** Bu oturumda paylaşılan hesaba göre ORYN'in mevcut tasarımı
(300 mesaj/ay, Sonnet'ten Haiku'ya düşüş, dolar tavanı yok) 15 Sonnet mesajından sonra
Haiku'da kalan ~285 mesajla teorik olarak **~$3,83**'e kadar çıkabiliyor — hedeflenen
$1,00 tavanın neredeyse 4 katı (`docs/what-the-cap-actually-permits-2026-09-02.md`).
Araştırdığım hiçbir üründe bu şekle rastlamadım: **"düşür ama asla durma."** Sektör
örüntüsü şu: düşür/devam et **VE** bir yerde, açık bir dolar rakamıyla, mutlaka dur.
"Asla sert duvar yok" ile "maliyet sınırsız" aynı şey değil — ORYN'in kararı ilkini
istiyor, ama mevcut uygulama farkında olmadan ikincisini de yapıyor gibi görünüyor.
Bu iki şeyi ayırmak, bu araştırmanın en somut, hemen kod haline gelebilecek bulgusu.

### 9.3 En yakın rakip hiçbir şey açıklamıyor

oryn-b9'un araştırmasına göre ([freemium
araştırması](freemium-genclik-urunleri-2026-09-02.md), §10.3), ORYN'e en
yakın gerçek rakip olan **CollegeVine'ın AI danışmanı "Sage"** kendi sayfasında iki ayrı
yerde *"Sage is completely free"* diyor ve **hiçbir kullanım limitinden, mesaj
tavanından ya da ücretli katmandan söz etmiyor.** Hesap açılmadığı için gerçek üründe
gizli bir limit olup olmadığı doğrulanamadı — ama pazarlamasında hiç yok. Bu, bu niş
pazardaki ifşa normunun şu anda çok düşük olduğunu gösteriyor: ORYN, rakiplerinin
hiçbirinin yapmadığı bir şeffaflık sunarsa bile bar çok düşük, yani "yeterince şeffaf
mıyım" sorusunu rakiple kıyaslayarak değil, kullanıcıyla (16 yaşında bir öğrenci) kıyaslayarak
cevaplamak gerekiyor.

---

## 10. Sessiz düşüşün maliyeti: şikayet üretiyor mu, ve neyi?

Bu, oryn-a7'nin sorduğu asıl soru: **sessiz model düşüşü, görünür bir duvara çarpmaktan
farklı ve ayrı bir şikayet türü üretiyor mu?** Üç gerçek vaka bulundu, üçü de doğrudan
kaynağından okundu:

### Vaka A — Perplexity, sessizce kota daraltma (§2'de detay)
Kota **sayısı** sessizce düşürüldü (model değil). Sonuç: "bait-and-switch" suçlaması,
yaygın kullanıcı öfkesi, sonunda şirketin resmi açıklama yapması. **Bu, kullanıcının
sahip olduğunu bildiği, sayılabilir bir şeyin sessizce alınması** — ORYN'in planladığı
şeyden farklı bir ihlal türü.

### Vaka B — ChatGPT / GPT-5 router'ın sessiz model geçişi (Ağustos 2025)
[TechCrunch, 8 Ağustos 2025](https://techcrunch.com/2025/08/08/sam-altman-addresses-bumpy-gpt-5-rollout-bringing-4o-back-and-the-chart-crime/)
— doğrudan okundu. GPT-5 lansmanında model seçici kaldırıldı, bir "router" hangi modelin
cevap vereceğine otomatik karar veriyordu. Router'ın arızalı çalıştığı gün kullanıcılar
GPT-5'i "daha aptal" buldu. Altman'ın kendi ifadesi (Reddit AMA, alıntı doğrudan
sayfadan): *"GPT-5 will seem smarter starting today. Yesterday, we had a sev and the
autoswitcher was out of commission for a chunk of the day, and the result was GPT-5
seemed way dumber."* Kullanıcı baskısıyla bir hafta içinde eski modeller (GPT-4o dahil)
geri getirildi, model seçici yeniden eklendi. En kritik cümle, Altman'ın söz verdiği
düzeltme: **"We will make it more transparent about which model is answering a given
query."** Yani şirketin kendi çözümü "asla söyleme" değil, "hangi modelin cevap
verdiğini daha görünür yap" oldu.

### Vaka C — ChatGPT'nin "güvenlik router"ı (Eylül 2025)
[TechRadar, 28 Eylül 2025](https://www.techradar.com/ai-platforms-assistants/chatgpt/openai-responds-to-furious-chatgpt-subscribers-who-accuse-it-of-secretly-switching-to-inferior-models)
— doğrudan okundu. Bu sefer maliyet değil güvenlik gerekçesiyle, hassas konularda
kullanıcı fark etmeden daha muhafazakar bir modele yönlendiriliyordu. Bunu **kapatma
seçeneği yoktu ve ne zaman geçiş yapıldığı belli değildi**. Kullanıcı tepkisi, makaleden
doğrudan alıntı: *"Adults deserve to choose the model that fits their workflow, context,
and risk tolerance. Instead we're getting silent overrides, secret safety routers and a
model picker that's now basically UI theater."* OpenAI'ın VP'si Nick Turley durumu
kabul edip açıklama yapmak zorunda kaldı.

### Sentez
Üç vakanın ortak deseni: **kullanıcıyı öfkelendiren şey "daha az/daha kötü almak" değil,
"neden daha kötü aldığını anlayamamak."** Vaka B ve C özellikle çarpıcı çünkü ikisi de
tam olarak ORYN'in planladığı şeyi yapıyordu — kullanıcı fark etmeden daha zayıf/farklı
bir modele geçiş — ve ikisi de kamuoyu önünde geri adım atmak zorunda kaldı. Hiçbir
ürün, "duvara çarp" ile "hiç söyleme" arasında **üçüncü bir yolu** açıkça ve övünerek
uygulamıyor; ama iki büyük şirket, tam da bu sessizlik yüzünden yaşadığı krizden sonra,
istemeden de olsa o üçüncü yola ("hangi modelin cevap verdiğini görünür yap, ama
kullanıcıyı durdurma") doğru itildi. Bu, ORYN'in önünde hazır bir çözüm değil ama
**yön gösteren, gerçek, iki kere tekrarlanmış bir sinyal.**

---

## 11. ORYN'in kararının sınanması

**Karar:** "Asla sert duvar yok; bütçe dolunca sessizce Haiku'ya düş."

**Bulgular kararı destekliyor mu?** Kısmen, ama önemli bir düzeltmeyle.

- **"Asla sert duvar yok" kısmı savunulabilir.** Araştırılan hiçbir üründe, bir öğrencinin
  ortasında olduğu bir soruyu yarıda kesecek bir "duvar" iyi karşılanmıyor — Cursor ve
  Copilot bile duvara çarpmadan önce açıkça uyarıyor ve devam etme yolu sunuyor. 16
  yaşında birinin sorusunun ortasında durdurulması, hiçbir emsalde savunulan bir tasarım
  değil.
- **"Sessizce" kısmı en riskli kısım — kanıtlarla en az desteklenen kısım.** §10'daki iki
  vaka, tam olarak bunu yapan iki büyük ürünün kamuoyu önünde geri adım attığını
  gösteriyor. Hiçbir araştırılan ürün, kalite düşüşünü kullanıcıdan tamamen ve kalıcı
  olarak gizlemeyi bir tasarım ilkesi olarak benimsemiyor; en yakın emsaller (Claude,
  Copilot) düşüşü kullanıcıya bir **öneri** olarak sunuyor, otomatik ve görünmez bir
  sistem kararı olarak değil.
- **"Bütçe dolunca" kısmı — ölçüm birimi sorunu.** Sektörün ağırlıklı örüntüsü (Cursor,
  Copilot, Replit, ChatGPT Edu/Ent.) dolar/token bazlı ölçüm; ORYN'in kendi ölçülmüş
  maliyet farkı da (haftalık plan $0,014 vs. CV okuma $0,062 — aynı "mesaj" kavramı
  içinde 4-5x fark) düz mesaj sayısının yanlış birim olduğunu gösteriyor.
- **Sınırsız düşüş sorunu (§9.2) kararın kendisinden değil, mevcut uygulamadan
  kaynaklanıyor** — "sessizce düşür" ile "asla durma" aynı cümlede söylenmiş ama farklı
  şeyler; hiçbir emsal ikisini birlikte yapmıyor.

---

## 12. Somut öneriler (oryn-60'ın kodlayabileceği şekilde)

oryn-a7'nin çerçevelediği üç soruya + ortaya çıkan dördüncü soruya doğrudan cevap:

**1) Karar neye göre tetiklenmeli?**
**Kümülatif dolar harcaması (model maliyeti eşdeğeri), aylık pencere.** Düz mesaj sayısı
değil — ORYN'in kendi özellik başına maliyeti 4-5x değişiyor (§9.2), düz sayı ya cömert
ya cimri olur. Bu aynı zamanda incelenen ürünlerin çoğunluğunun (7 üründen 5'i) vardığı
nokta.

**2) Kullanıcıya söylenmeli mi, ne zaman?**
**Geçişte (anında), rahatsız etmeden — ne önceden uyarı, ne tam sessizlik.** §10'un
gösterdiği şey: tam sessizlik iki büyük üründe kriz yarattı ("silent overrides... UI
theater"); ama akışı kesen bir bildirim/özür de "duvar" hissini geri getirir — tam da
kararın kaçınmak istediği şey. Orta yol: cevabın üzerinde küçük, sabit, göze batmayan
bir etiket (OpenAI'ın krizden sonra söz verdiği düzeltmeyle aynı yön: *"more transparent
about which model is answering"*) — bir öğrenci merak edip bakarsa görür, aramazsa
akışı bozmaz. Khanmigo'nun pil ikonu (§8) da aynı ilkenin sayısal olmayan bir versiyonu.

**3) Dönem içinde geri dönülebilir mi?**
**Varsayılan: sadece aylık sıfırlanmayı bekleyerek.** Ödeyerek anında geri dönme
(mid-month upgrade), 14-18 yaş grubuna doğrudan ödeme almanın hukuki/rıza sorunlarına
giriyor — bu, ayrı araştırılan reşit-olmayana-satış sorusuyla (brief #3) kesişiyor ve
benim territory'mde değil. O araştırma netleşmeden bu yola girmemeyi öneriyorum; sadece
bekleme yoluyla geri dönüş, yeni bir ödeme/rıza yüzeyi açmadığı için şimdilik güvenli
varsayılan.

**4) (Yeni) Düşüş nerede kesin olarak durmalı?**
**Mutlaka bir dolar tavanı olmalı — düşüş kendi başına yeterli değil.** §9.2'nin
gösterdiği gibi incelenen hiçbir ürün "düşür ama asla durma" yapmıyor. Mevcut ORYN
tasarımı (300 mesaj, Sonnet→Haiku, tavan yok) teorik olarak $1 hedefinin ~4 katına
çıkabiliyor. oryn-a7'nin gündeme getirdiği 130 mesaj/ay revizyonu (~$1,02 worst-case)
matematiği düzeltiyor, ama **aylık tek bir sayı olarak çerçevelenirse 16 yaşında birine
cimri gelebilir** — araştırmadaki tek "günlük"e sıfırlanan ürün (Khanmigo, ödeme
sonrası) tam bu yüzden günlük pencere seçmiş görünüyor: "bu ay 4 mesajın kaldı" değil
"bugünkü hakkın yarın yenilenecek" çerçevesi aynı toplam sayıyı çok daha az cezalandırıcı
hissettirir. Toplam bütçe aynı kalsa bile, **sıfırlanma penceresini aylıktan
haftalık/günlüğe indirmeyi** ayrı bir deneyim iyileştirmesi olarak öneriyorum — bu maliyeti
değiştirmez, sadece aynı maliyeti nasıl hissettirdiğini değiştirir.

**Tek nokta önerisi:** Bu dört kararın hepsi, çağrıdan hemen önce çalışan tek bir
fonksiyonda (örn. `selectModelForBudget(student)`) toplanmalı — model id'sini VE bir
`degraded: boolean`/`tier` bayrağını birlikte döndürsün; UI'daki küçük etiket bu bayrağı
okur, spend-cap mantığı da aynı yerden tetiklenir. Böylece bu belgedeki herhangi bir
bulgu değiştiğinde, tek bir fonksiyonun içi değişir, çağıran kodlar değişmez.

---

## Kaynak listesi (erişim tarihi: 2026-09-02, aksi belirtilmedikçe)

- Cursor: [Models & Pricing](https://cursor.com/docs/models-and-pricing) · [Usage and limits](https://cursor.com/help/models-and-usage/usage-limits)
- Perplexity: [What is Perplexity Pro?](https://www.perplexity.ai/help-center/en/articles/10352901-what-is-perplexity-pro) · [What is Pro Search?](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search) · [Which plan is right for you?](https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you) · vaka: [piunikaweb.com, 2026-05-15](https://piunikaweb.com/2026/05/15/perplexity-rate-limit-reduce-pro/)
- Notion: [Pricing](https://www.notion.com/pricing) · [Complimentary AI responses](https://www.notion.com/help/complimentary-ai-responses)
- OpenAI/ChatGPT: [What is ChatGPT Plus?](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus) · [Free Tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq) · [Enterprise/Edu usage limits](https://help.openai.com/en/articles/20001001-manage-usage-limits-and-overages-in-chatgpt-enterprise-and-edu) · vaka B: [TechCrunch, 2025-08-08](https://techcrunch.com/2025/08/08/sam-altman-addresses-bumpy-gpt-5-rollout-bringing-4o-back-and-the-chart-crime/) · vaka C: [TechRadar, 2025-09-28](https://www.techradar.com/ai-platforms-assistants/chatgpt/openai-responds-to-furious-chatgpt-subscribers-who-accuse-it-of-secretly-switching-to-inferior-models)
- Anthropic/Claude: [What is the Pro plan?](https://support.claude.com/en/articles/8325606-what-is-the-pro-plan) · [Usage and length limits](https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work) · [Manage usage credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)
- GitHub Copilot: [Models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing) · [Usage-based billing for individuals](https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals) · [Requests (legacy)](https://docs.github.com/en/copilot/concepts/billing/copilot-requests)
- Replit: [AI Billing](https://docs.replit.com/billing/ai-billing) · [Managing Your Spend](https://docs.replit.com/billing/managing-spend) · [Pricing](https://replit.com/pricing)
- Khanmigo: fiyat/erişim — oryn-b9, [freemium araştırması §5](freemium-genclik-urunleri-2026-09-02.md) (khanmigo.ai, khanmigo.ai/pricing, 2026-09-02); kota mekanizması — [web.archive.org arşiv kopyası](https://web.archive.org/web/2026/https://support.khanacademy.org/hc/en-us/articles/13984041207565-How-is-my-AI-power-determined) (canlı sayfa 2026-09-02'de 404 verdi; arşivlenmiş sayfa kendi üzerinde "Updated 2 years ago" diyor — güncelliği doğrulanamadı)
- CollegeVine (Sage): oryn-b9, [freemium araştırması §10](freemium-genclik-urunleri-2026-09-02.md) (collegevine.com/sage, 2026-09-02)
- ORYN'in kendi maliyet aritmetiği: `docs/what-the-cap-actually-permits-2026-09-02.md` (oryn-a7, bu oturum içinde paylaşıldı)

**Bulunamadı olarak işaretlenenler (tahmin edilmedi):** Perplexity'nin Free/Pro Search
kesin sayıları (resmi kaynakta), Perplexity'nin sıfırlanma penceresi (resmi kaynakta),
Notion'ın "20 yanıt" rakamının güncelliği, ChatGPT tüketici planlarının kesin
sıfırlanma penceresi, Khanmigo'nun ödeme-sonrası kota mekanizmasının 2026-09-02
itibarıyla hâlâ geçerli olup olmadığı, Duolingo Max'in AI özelliklerinde resmi/güncel
sayısal limit (bu ürün için tek bir doğrulanabilir resmi sayfa bu oturumda
yüklenemedi — araştırma denendi, sonuçsuz kaldı, daha fazla ısrar edilmedi).
