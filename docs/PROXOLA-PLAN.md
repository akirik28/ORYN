# Proxola — çalışma planı

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

**A1. Migration'ları çalıştır.** Sıra: **09 → 13 → 11 → 12**.
Hepsi tekrar çalıştırılabilir; yarım kalmışsa baştan çalıştır, zarar vermez.

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

**C1. Veli uçtan uca doğrulama.** 0116 uygulanır uygulanmaz çalışacak.
Betik hazır: `docs/parent-account-e2e-plan-2026-09-04.md`. **A1'e bağlı.**

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
