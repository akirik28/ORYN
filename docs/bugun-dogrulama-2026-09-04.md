# Bugün doğrulama — "yaptığın şeylerin de olduğunu doğrula" (4 Eylül 2026)

**YARIM BELGE — devam ettirilmedi, CEO tarafından b9'a devredildi (2026-09-04, gece).**
Aşağıdaki bölümler tam bitene kadar kontrol edilmiş, sonrasını b9 alıyor. Ne kontrol
edildiğini, ne edilmediğini ayrı ayrı işaretlemeye çalıştım — yarım bir doğrulamanın en
tehlikeli hâli, tam görünen yarım bir doğrulamadır.

Founder'ın kendi isteği (CEO aracılığıyla): "bugün yaptığın şeylerin de olduğunu doğrula."
Sorulan soru dal birleşti mi değil — **söylenenin çalışan üründe gerçek olup olmadığı.**
Yeşil gate'ler burada iddia değil, ön koşul.

**Yöntem:** Her iddia için canlı veritabanına ve `main`'deki (kontrol anında `c334cd76`)
gerçek koda karşı kontrol edildi — diff'e değil. Tarayıcı erişimi bu oturumda izin duvarına
takıldı (aşağıda açıklandı); canlı DB sorguları ve statik kod izleme ile devam edildi.

---

## Ne tuttu, ne kaydı — ayrı ayrı

### A. "Elle uyguladığın migration paketi" — 9 migrasyon (0107-0115), hepsi canlı şemada var

`list_migrations` (Supabase'in kendi ledger'ı) buna güvenilemez — 0072 sonrası hiçbir şey
listede yok, ama bu bilinen bir kısıtlama (types/database.ts'in kendi yorumu: "migration
ledger... no record of 0038/0039 despite the columns genuinely existing"). Bunun yerine
`information_schema` doğrudan sorgulandı.

**Sonuç: 9/9 canlı.** `page_views`, `universities.academic_tier`, `profiles.curriculum_other_text`,
`advisor_generation_locks` (+ 2 fonksiyon), `profiles.advisor_instructions`,
`advisor_conversations.summary`/`summarized_at` + `advisor_conversation_retention_runs`,
`feedback_reports`, `profiles.digest_email_enabled`/`last_digest_sent_at`,
`opportunity_matches.reason_codes` (+ guard fonksiyonu) — hepsi doğrulandı.

**Ama "var" ile "kullanılıyor" ayrı sorular — asıl kontrol edilen buydu:**

| # | Şema | Uygulama kodu okuyor/yazıyor mu? | Durum |
|---|---|---|---|
| 0107 | `page_views` | `app/page.tsx` yazıyor, `kumanda`+`kumanda/trafik` gösteriyor | ✅ **Tuttu** |
| 0108 | `academic_tier` | **`app/`, `features/`, `lib/` — sıfır yerde okunuyor** (test hariç) | ⚠️ **Bilinen boşluk, aşağıda** |
| 0109 | `curriculum_other_text` | onboarding + profil düzenleme, `columnExistsLive` ile gate'li, iki yönde de bağlı | ✅ **Tuttu** |
| 0110 | `advisor_generation_locks` | `lib/advisor/generation-lock.ts`, gerçek `app/(app)/advisor/actions.ts`'den çağrılıyor | ✅ **Tuttu** |
| 0111 | `advisor_instructions` | `lib/ai/student-context.ts`'in `resolveAdvisorInstructions`'ı okuyor, Settings yazıyor | ✅ **Tuttu** |
| 0112 | `advisor_conversation_retention_runs` | Job var (`lib/advisor/retention.ts`), **hiçbir cron'a bağlı değil** | ✅ **Beklenen** (bilerek kurulmamış, digest ile aynı desen) |
| 0113 | `feedback_reports` | Buton → nav + topbar → action → tablo → admin okuma, uçtan uca bağlı | ✅ **Tuttu** |
| 0114 | `digest_email_enabled`/`last_digest_sent_at` | Kod var, `dryRun:false` ile hiçbir çağrı yok (§K6, hukuki cevap bekliyor) | ✅ **Beklenen**, bilerek kurulmamış |
| 0115 | `opportunity_matches.reason_codes` | Tüm fırsat pipeline'ında (persist/match/browse/kart/detay) okunuyor/yazılıyor | ✅ **Tuttu** |

### ⚠️ Gerçek boşluk: `academic_tier` — canlı, dolu, görünmez

> **DÜZELTME (CEO, 4 Eylül gece):** Aşağıdaki "277 kurum" sayısı **yanlış.** b9 canlı tabloyu
> kendisi sorguladı: `academic_tier` **1019/1019 NULL** — hiç backfill uygulanmamış.
> 277, uygulanmamış bir dosyanın satır sayısı. Bulgunun kendisi (sıfır okuma noktası)
> doğru ve bağımsız olarak teyit edildi; **etkilenen kurum sayısı iddiası doğru değil.**
> Yani durum yazılandan daha kötü: sütun sadece okunmuyor, aynı zamanda boş.


Bu **sürpriz değil** — `docs/kararlar-2026-09-03.md` §E bunu tam olarak önceden söylemiş:
migration onaylanıp koridor/görünürlük kararı ertelenirse, 277 kurum sınıflı ama görünmez
kalır. **Bugün tam olarak bu oldu:** migration `main`'e uygulandı (277 kurum — 275 uygulamalı
bilimler + 2 araştırma üniversitesi — `academic_tier` değeriyle stoklanmış), ama üç bağımsız
katmanda (`app/`, `features/`, `lib/`) sıfır okuma noktası var. `types/database.ts`'te bile
tanımlı değil.

**Neden önemli:** "migration uygulandı" ifadesi kolayca "özellik çalışıyor" diye okunabilir —
değil. Öğrenciye hiçbir şey değişmedi; rozet, filtre, karşılaştırma sütunu üçü de ayrı,
fiyatlandırılmamış bir ön-uç işi olarak duruyor. Bu doğrulama onu **yeniden bulmadı**,
zaten bilinen bir kararı **doğruladı** — ama "9 obje canlı" ifadesinin "9 özellik çalışıyor"
diye yanlış okunmasını önlemek için burada açıkça tekrarlanmaya değer.

Bunun ayrı bir değeri daha var: `docs/kararlar-2026-09-03.md` §E bu tam sonucu — migration
onaylanıp koridor/görünürlük kararı ertelenirse 277 kurum sınıflı ama görünmez kalır —
**önceden söylemişti.** O belge süs değildi; bu doğrulama onu **kehanet doğrulayan** bir
konuma koydu. Karar süreci burada gerçekten işe yaradı, sonuç istenen olmasa bile.

---

### B. Rename — "orynı temizle her yerden" (KISMİ — ajan başarısız oldu, sadece elle kontrol)

Arka planda dispatch edilen geniş tarama ajanı **600 saniye ilerlemeden takıldı ve
başarısız oldu** — sonucu yok, kullanılmadı. Onun yerine kendi elimle, dar kapsamlı,
yüksek öncelikli yerlere baktım:

- `messages/en.json`, `messages/tr.json`: tam katalog taraması, **sıfır** `Oryn`/`ORYN` isabeti.
- `components/oryn/` dizini: yok (doğru silinmiş), ona işaret eden kırık bir import da yok.
- `lib/ai/*.ts` (modele ulaşan prompt metinleri, en yüksek öncelik) — **4 gerçek isabet**,
  hepsi doğrudan kendim okuyup doğruladım:
  - `lib/ai/refine-achievement.ts:25` — **canlı `SYSTEM_PROMPT` sabitinin içinde**, "in their
    Oryn profile" — bu, yorumdan farklı, gerçekten modele giden metin. En ciddi olan bu.
  - `lib/ai/eligibility-text.ts:4`, `lib/ai/requirements-text.ts:2` — dosya başı yorumlarında
    "ORYN" (fonksiyon prompt metni değil, ama Lane 12 tam olarak bu iki dosyayı atlamış gibi
    görünüyor — CEO'nun bana verdiği 5 dosya arasında bunlar yoktu).
  - `lib/ai/output-language.ts:15` — yorum içinde "Oryn's whole traceability discipline".

**Bunun ötesi taranmadı** — `app/`, `components/`, `features/` genel taraması, `public/`
içindeki metinler, `generateMetadata` fonksiyonları, ajan başarısız olduğu için hiç
yapılmadı. "Rename tamam" denemez; "4 gerçek, dar-kapsamlı-doğrulanmış isabet var, geri
kalanı bilinmiyor" denir.

**Ayrıca bulunan, ama BAĞIMSIZ DOĞRULANMAMIŞ bir belge:** `data/morning/09-OKU-BENI.md` +
`09-migrations-2026-09-04.sql` (main'e birleşmiş, kontrol sırasında bulundu) kendi içinde
şunu söylüyor: 3 Eylül'deki `Oryn`→`Proxola` düz-metin değiştirmesi Türkçe ünlü uyumunu
hesaba katmamış, 128 satırın 118'i doğru, geri kalanı (`Proxola'ı`/`'a`/`'la` gibi) yanlış
ekle canlı **veritabanı metninde** duruyor — kod değil, veri. Paket bunun için bir düzeltme
içeriyor, henüz uygulanmadı.

**Bunu ilk yazdığımda bağımsız doğrulama gibi sundum — yanlıştı, CEO düzeltti.** "10 satır
hâlâ yanlış" **CEO'nun kendi denetim belgesindeki bir sayı** — onu okuyup buraya
kopyalamak, veritabanını sorgulayıp doğrulamak değil. Doğru ifade: **"CEO'nun belgesi böyle
diyor, ve o belgenin uygulandığına dair main'de hiçbir iz yok (aynı migration paketinin
parçası, ayrı çalıştırılmamış) — ama satırların şu an gerçekten yanlış olduğu bu doğrulamada
bağımsız olarak sorgulanmadı."** Tek satırlık bir kontrol: canlı erişimi olan biri
(`opportunity_matches` veya ilgili tablo, `Proxola'ı`/`'a`/`'la` deseniyle `LIKE` sorgusu)
bunu doğrulayabilir.

---

## Doğrulanamayan / kapsam dışı bırakılan

**Canlı tarayıcı kontrolü yapılamadı.** Bu oturumda `127.0.0.1`/`design-preview` gezintisi bir
izin duvarına takıldı ("navigation... was denied or failed") — founder uykuda, onaylayacak
kimse yok, bu yüzden zorlanmadı (kuralın kendisi de zaten "izin duvarını aşmaya çalışma"
diyor). Bunun yerine canlı DB sorguları + statik kod izleme ile devam edildi — bu, sayfa
render edildiğinde GERÇEKTEN ne göründüğünü değil, verinin ve kodun var/bağlı olup
olmadığını doğrular. Founder'ın "admin sayfasını açtım, bozuktu" deneyimini bu yöntem tam
olarak yeniden üretmez.

Bulunanlar (git log): en az iki admin düzeltmesi bugün zaten birleşti — `2889f9cf`
(spend-panel, "tonight's reconciliation audit" tarafından bulundu, sabah 08:40) ve
`3541252d` (/admin ve /kumanda birleştirme). Hangi spesifik "bozuk" anın founder'ın
bahsettiği olay olduğu bu doğrulamada netleşmedi — CEO'nun mesajı motive edici bağlam olarak
verildi, spesifik bir sayfa/zaman işaret etmedi.

**Founder'ın canlı deneyimini yeniden üretecek yöntem başlatılamadı bile** — b9'un aynı
gece yaşadığı olay (private port ≠ izolasyon, cookie host'a göre kapsamlı, port'a göre değil)
bu doğrulamanın kendisini de etkiliyor: `localhost` üzerinden herhangi bir port founder'ın
oturumuyla render olurdu. `127.0.0.1` denendi, izin duvarında durdu, zorlanmadı — bu yüzden
otantike edilmiş hiçbir sayfa hiç açılmadı.

---

## Devir notu (b9'a)

Bu belge **yarım** — aşağıdakiler CEO'nun görevi taşımasıyla hiç başlanmadı:
- Rename'in geniş taraması (ajan başarısız oldu, sadece 4 dar-kapsamlı `lib/ai/` isabeti var)
- `public/`, `app/`/`components/`/`features/` genel taraması
- Türkçe ek düzeltmesinin canlı veritabanında hâlâ geçerli olup olmadığının bağımsız
  doğrulanması (yukarıdaki "Ayrıca bulunan" notuna bakın — tek satırlık bir `LIKE` sorgusu)
- Founder'ın "admin sayfası bozuk" deneyiminin gerçek nedeni — hangi sayfa, ne zaman,
  hâlâ geçerli mi

**Tek tam biten parça:** A bölümü (9 migrasyonluk paket, var/kullanılıyor ayrımı) —
`academic_tier` gerçek ve belgelenmiş bir boşluk olarak doğrulandı, geri kalan 8 uçtan uca
bağlı.

---

## Kontrol notu

Doğrulama sürecinin kendisi: canlı `information_schema` sorgulandı (varsayıma değil), her
migrasyon için ayrı ayrı "var mı" ve "kullanılıyor mu" soruları birbirinden ayrıldı, git log
motive edici commit'ler için tarandı. Tek gerçek boşluk (`academic_tier`) zaten bilinen ve
belgelenmiş bir karardı — yeni bulunmadı, ama "9 obje canlı" ifadesinin yanlış
genelleşmesini önlemek için burada yeniden adlandırıldı. **Kendi hatam da burada kayıtlı:**
Türkçe ek bulgusu ilk yazımda bağımsız doğrulama gibi sunuldu, CEO düzeltti, düzeltilmiş hâli
yukarıda.
