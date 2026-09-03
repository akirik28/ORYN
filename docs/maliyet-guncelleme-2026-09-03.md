# Maliyet modeli güncellemesi — 2026-09-03 gecesi

**Bu dosya `docs/maliyet-ve-fiyatlandirma-2026-09-02.md`'yi DEĞİŞTİRMİYOR.** O dosya ve
`docs/uc-katman-karari-2026-09-03.md` founder'ın okuduğu karar dosyaları — ikisini de
doğrudan düzenlemedim (`feedback_flag_dont_edit_shared_decision_docs`: rapor eden ile
düzenleyen ayrı olmalı, iki kişi aynı karar dosyasını yazarsa çelişki çıkar). Aşağıda hangi
satırın neden değiştiği ve yerine ne yazılması gerektiği açıkça yazılı — uygulaması
oryn-a7'nin ya da founder'ın.

**Sonuç, en başa:** Bu gecenin üç değişikliğinden hiçbiri iki dosyanın SONUÇ tablolarını
(Bölüm 4, Bölüm 6, üç katman marjı) sayısal olarak bozmuyor — çünkü ($0,99 tavan) dolar
bazlı ve token büyümesine karşı yapısal olarak bağışık, ve iki yeni iş bütçesi de bu gece
**kapalı** ($0 gerçek maliyet). Değişen: aynı $0,99 artık 73 değil ~71 mesaj alıyor, ve
**gerçekçi** (tavana dayanmayan) kullanıcı maliyeti ~%2 arttı. Küçük ama gerçek — yuvarlayıp
atlamadım.

---

## 1. Advisor context büyümesi — ÖLÇÜM (kendi PR'ım, bu gece birleşti)

`countTokens` ile ölçüldü (varsayımla değil): **+154 ile +190 girdi tokeni / mesaj**,
iki gerçek eval fixture'ında (Deniz: +190, Ada: +154). Orta nokta **+172**.

**$0,99 tavan hâlâ geçerli mi? EVET, değişmedi.** `lib/ai/limits/budget.ts`'teki
`selectModelForUser` gerçek dolara bakıyor (`ai_usage.estimated_cost`, gerçek token
sayısından hesaplanan) — `MONTHLY_BUDGET_TARGET_USD=0.50` ve `_CEILING_USD=1.00` hiç
değişmedi ve token sayısına değil dolara bakıyor. Bu, mesaj büyüklüğü değişse bile tavanın
yapısal olarak sabit kalmasını sağlıyor — kod öyle yazılmış, benim tahminim değil.

**Değişen: aynı $0,99'un karşılığı olan mesaj sayısı.** Eski çapa (3.628 girdi / 1.095
çıktı, doğrudan `lib/ai/monthly-quota.ts`'in `TOKENS_PER_USE_REFERENCE` sabitinden — kodun
kendisi hâlâ bu sayıyı kullanıyor, güncellemedim çünkü bu ayrı bir karar):

| | Eski (3.628g/1.095ç) | Yeni (+172 orta nokta, 3.800g/1.095ç) | Fark |
|---|---|---|---|
| Sonnet $/mesaj | $0,027309 | $0,027825 | +%1,9 |
| Haiku $/mesaj | $0,009103 | $0,009275 | +%1,7 |
| Degrade öncesi mesaj | 18 | 18 (sınır değişmedi) | — |
| Toplam mesaj / $0,99 | **73** | **71** | **-2** |
| Gerçek toplam maliyet | $0,99 | $0,992 | ~aynı |

**Yani: en kötü hâl hâlâ ~$0,99 — sadece aynı parayla 2 mesaj daha az alınıyor.**
Fiyatlandırma kararını etkileyecek büyüklükte değil.

**Gerçekçi (tavana dayanmayan) kullanıcı için ise büyüme doğrudan çarpılıyor** — sabit
mesaj sayısı × %1,7-1,9 daha pahalı mesaj = aynı oranda artış. Bölüm 4/6'nın $0,30-0,45
gerçekçi aralığı da aynı oranda, yani **~$0,005-0,008** kayıyor — ölçülebilir ama
yuvarlamayı değiştirmeyecek kadar küçük.

*Not: canlı `ai_usage`'daki gerçek advisor_chat ortalaması bugün 2.872g/871ç (n=14,
tüm zamanlar) — doc'un 3.628/1.095 çapasından daha düşük, ama bu benim değişikliğimden
bağımsız, doğal örneklem kayması (küçük örneklem, n=14). Çapayı buna kaydırmadım çünkü
kodun kendi `TOKENS_PER_USE_REFERENCE` sabiti hâlâ 3.628/1.095'e sabitli — çapayı
değiştirmek ayrı, daha büyük bir karar olurdu.*

**`docs/maliyet-ve-fiyatlandirma-2026-09-02.md`'de değişmesi gereken:** Bölüm 1'in
"73 mesaj / $0,99" satırı → "71 mesaj / $0,99" (yukarıdaki tablo). Bölüm 2/4/6 sayısal
olarak aynı kalabilir, dipnotla "advisor context 2026-09-03'te ~%2 büyüdü, tavan
etkilenmedi" eklenebilir.

---

## 2. Yeniden-doğrulama işi (`opportunity_reverification`) — $5/ay bütçe, KAPALI

Kodda gerçek: `lib/ai/limits/job-budget.ts`, `JOB_BUDGET_USD.opportunity_reverification = 5`
(env ile değiştirilebilir, `AI_JOB_BUDGET_OPPORTUNITY_REVERIFICATION_USD`). `vercel.json`'da
**hiçbir cron girdisi yok** — doğrulandı, iş kodu var ama zamanlanmamış.

- **Bugün gerçek maliyet: $0** (çalışmıyor).
- **Eğer açılırsa — tavan:** $5/ay (sert STOP, diğer iki iş bütçesi gibi degrade değil).
- **Eğer açılırsa — gerçekçi:** dosyanın kendi yorumunda hesaplı, ~$1,30–1,50/ay (günlük
  önerilen sıklıkta, %20 anlaşmazlık oranı varsayımıyla — ölçülmemiş ama gerekçeli).

Bu, diğer iki iş bütçesi (`opportunity_extraction` $25, `requirement_extraction` $15) ile
**aynı tür** maliyet — kullanıcı sayısıyla ölçeklenmiyor, sistem geneli sabit. Açılırsa
Bölüm 3'ün $86 sabit toplamına eklenir:

| Kalem | Bugün | Açılırsa (tavan) | Açılırsa (gerçekçi) |
|---|---|---|---|
| Mevcut $86 (Supabase+Vercel+alan+2 iş) | $86 | $86 | $86 |
| `opportunity_reverification` | $0 | +$5 | +$1,30–1,50 |
| **Toplam sabit** | **$86** | **$91** | **~$87,30–87,50** |

**`docs/maliyet-ve-fiyatlandirma-2026-09-02.md`'de eklenmesi gereken:** Bölüm 3'ün
tablosuna yeni satır: "`opportunity_reverification` işi | $0 (kapalı) — açılırsa $5 tavan,
~$1,30-1,50 gerçekçi | Sistem geneli, KAPALI".

---

## 3. Haftalık plan toplu tavanı — $10 varsayılan, gerçek YAPISI farklı

`lib/ai/limits/weekly-plan-budget.ts`: `DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD = 10.0`,
doğrulandı (`weekly_plan_budget_settings` tablosu canlıda yok — 12 uygulanmamış migration'dan
biri, founder sabah uygulayınca aktif olacak; şu an kod bu varsayılana düşüyor).

**Bu, önceki iki iş bütçesinden FARKLI bir şey — "$0,94" rakamı bunu karıştırmasın diye
açıkça ayırıyorum:**

- `opportunity_reverification`/`opportunity_extraction`/`requirement_extraction`: **sistem
  geneli sabit** — 100 öğrencide de 10.000 öğrencide de aynı iş, aynı fatura.
- Bu tavan ise **"Job D"** için — yani `generate-weekly-plans` her öğrenciye otomatik
  haftalık plan üretse (bugün **zamanlanmamış**, `vercel.json`'da yok, doğrulandı) —
  **öğrenci sayısıyla DOĞRUSAL ölçeklenen** bir maliyet. `docs/ai-cost-at-scale-2026-09-02.md`
  (oryn-d0) bunu zaten net ayırmış: gerçekçi oran **$0,126/öğrenci/ay** (4,33 plan/ay ×
  $0,029/plan).
- **"$0,94/ay, 8 öğrencide"** bu formülün bugünkü öğrenci sayısına uygulanmış hâli
  (8 × $0,126 ≈ $1,01 — dokümanın kendi $0,94'ü muhtemelen biraz farklı bir ortalama
  kullanmış; ~%7 fark, önemsiz). **Bu, bugün GERÇEKTEN harcanan bir para değil** — Job D
  kapalı olduğu için gerçek harcama $0 (canlı `ai_usage`'da bu ayki `weekly_plan` toplamı
  $0,11, sadece öğrenci-tetiklemeli 4 çağrı — Job D'nin hiç ürettiği bir şey yok). $0,94,
  "açılırsa bugünkü tabanla ne olurdu" projeksiyonu.
- Ayrıca: Job D açılsa bile bu maliyet **öğrencinin KENDİ $0,50/$1,00 tavanının içinden**
  düşüyor (`generate-for-active-students.ts`, gerçek `userId` ile), yani sistem geneli sabit
  bir fatura değil — her öğrencinin kendi payını mesaj göndermeden önce ~%25 tüketiyor
  ($0,126 / $0,50).

**Ölçeklenme eşiği (founder'ın büyüme planı için önemli):** $10 tavan, $0,126/öğrenci/ay
oranında, **~79 aktif öğrencide** aşılır (10/0,126). O noktadan sonra Job D açıksa herkesin
haftalık planı otomatik Haiku'ya düşer (durmaz, ucuzlar — `selectModelForWeeklyPlan`'ın
kendi tasarımı). Bugün 8 öğrenci var; üç katman kararı büyüme varsayıyorsa bu eşik
görünür olmalı.

**`docs/maliyet-ve-fiyatlandirma-2026-09-02.md`'de eklenmesi gereken:** Yeni bir alt bölüm
(Bölüm 3'e değil — bu farklı bir maliyet türü): "Job D (haftalık plan, herkese otomatik) —
bugün KAPALI, $0 gerçek. Açılırsa: $0,126/öğrenci/ay, öğrencinin kendi tavanından düşer,
sistem geneli $10 tavanı ~79 öğrencide aşılır."

---

## 4. Özet — sabit taban ve marjinal maliyet, ayrı ayrı

| | Bugün (her şey kapalı) | Yeniden-doğrulama açılsa | Job D de açılsa |
|---|---|---|---|
| **Sabit taban (ölçekle büyümez)** | $86/ay | ~$87,30–91/ay | *(değişmez — Job D sabit değil)* |
| **Öğrenci başı, en kötü hâl** | $0,99/ay (71 mesaj) | $0,99/ay | $0,99 + Job D'nin kendi payı zaten içinde |
| **Öğrenci başı, gerçekçi** | Eski $0,30-0,45 → **~$0,305-0,458** | aynı | +$0,126/öğrenci (Job D açıksa) |

**Üç katman kararına etkisi (`docs/uc-katman-karari-2026-09-03.md`):** O dosyanın kendi
sonucu — "400/800 TL, maliyetin çok üstünde marj bırakıyor, asıl soru pazar tarafı" —
**değişmiyor**. Bu gece ölçülen büyüme (~%2) o marjı gözle görülür şekilde etkileyecek
büyüklükte değil. Dosyanın kendi Bölüm 2 tablosu (3.628/1.095 çapasıyla) aynı ~%2 payla
güncellenebilir ama sonuç cümlesi aynı kalır.

**USD/TRY kuru:** uydurmadım, orijinal doküman gibi boş bırakıyorum — founder'ın admin
girdisi, bilgi kesme tarihimin ötesinde ve yanlış bir kur bütün tabloyu sessizce bozar.

**`ai_model_pricing` (migration 0100) hâlâ oryn-qa-scratch'te uygulanmamış** — geçen sefer
olduğu gibi, `lib/ai/pricing.ts`'in etiketlenmiş genel liste fiyatlarını kullandım
($3/$15 Sonnet, $1/$5 Haiku, $5/$25 Opus — kodun kendi `PRICE_PER_MILLION_TOKENS_USD`
tablosundan, ikinci doğrulama).
