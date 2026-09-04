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

**A4. Hukuki cevap.** Reşit olmayana ticari e-posta. Tüm mail gönderimi buna kilitli.

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

## Dağıtım — 4 Eylül, 11:30 (CEO)

**Oturum başlığı, o oturumun ne yaptığının kanıtı değildir.** İlk dağıtımda
dokuz oturumun işini kenar çubuğu başlığından çıkardım. **Üç oturum bunu ayrı
ayrı düzeltti**: "görsel script'i" sanılan oturum veli migration'larını yazmış,
"kullanım sınırları" sanılan oturumda öyle bir görev hiç yok, "40 kurum"
sanılan oturum dokuz üniversite kapatmış. Fleet yeniden başladığında başlıklar
önceki turdan kalmış. Tablo artık **oturumların kendi beyanına** göre.

| Oturum (kendi beyanı) | Madde | Durum |
| --- | --- | --- |
| veli E2E'sini koşan | **B3c** — veli kütüphane erişimi, gerekirse **0125** | başlıyor |
| ödeme worktree'sinde yazan (kimliği aranıyor) | **B1** — ödeme kesişimi, **0123** | yürüyor |
| locale shim + parent route-group yazan | **B3a** — veli ayrı sayfalar | başlıyor |
| veli haftalık runner'ını yazan | **B3b** — özeti aylığa | başlıyor |
| rename + plan sayfası + doğrulama denetimi | **D2** — fırsat doldurma | başladı |
| dokuz üniversiteyi kapatan | **D1** — 19 kurum (13 boş + 6 yakın-boş) | başladı |
| hukuki çerçeve | **A4'ün girdisi** — tüm e-posta buna kilitli | yürüyor |
| CFO | filo gözetimi + ödeme worktree'sinde kimin yazdığını bulma | yürüyor |
| academic_tier | **D3** — alan bazlı ölçüm | beyan bekleniyor |
| freemium | **B2** — yükseltme kartı, **0124** | beyan bekleniyor |

**Migration numaraları: 0123 → B1, 0124 → B2, 0125 → B3c (gerekirse).**

**Açık çakışma:** `ORYN-worktrees/payment-provider-seam-2026-09-04` içinde biri
canlı yazıyor (11:24-11:25, `0123` commit'li `236b9cf2`). B1'i verdiğim oturum
oraya girdi, **hiçbir şeye dokunmadan durup sordu** — doğru davranış. Karar:
**worktree'de duran iş B1'i ve 0123'ü tutar**, diğeri B3c'ye geçti.

---

## C1 — ✅ TAMAM (4 Eylül)

Veli akışı uçtan uca koşuldu: **26 kontrol, hepsi geçti**, tamamı geri alınan
işlemler içinde, sonrasında hiçbir şeyin kalmadığı teyitli.
`docs/parent-account-e2e-run-2026-09-04.md`, dal: `docs/parent-e2e-run-2026-09-04`.
Guard trigger hem `confirmed_at`'i hem `last_commentary_sent_at`'i velinin
kendi revoke'una karşı donduruyor, admin eşdeğeri yazıda dondurmuyor.

**Açık kalan tek düzeltme:** E2E plan script'inde B7, hata vermesi *beklenen*
bir insert'i savepoint'siz çalıştırıyor — işlem abort oluyor ve **B10-B12 hiç
koşmadan, ekranda hata görünmeden** geçiliyor. Bulan oturum düzeltiyor.

---

## D4 — üniversite tekilleştirme (yeni, sahipsiz)

MIT ve HKUST'un ikişer satırı var (biri dolu biri boş); "UCL" ile "University
College London" muhtemelen aynı kurum (biri 16 gereksinim, diğeri sıfır).
**Boş kopyayı doldurmak iki kez zarar verir** — efor boşa gider ve çift kayıt
kalıcılaşır. D1 bu satırları atlıyor. Tekilleştirme ayrı iş, henüz kimsede yok.

**Henüz kimseye verilmedi:** D4, C2 (danışman streaming), C3 (öğrenci ana akışı).
