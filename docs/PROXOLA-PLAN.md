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

---

## Dağıtım — 4 Eylül (CEO)

Dokuz oturumun hepsine tanıtım + kurallar + tek madde gönderildi.

**Önce bir düzeltme, çünkü tekrar edilmemesi gerekiyor:** ilk dağıtımda her
oturumun ne yaptığını **kenar çubuğundaki oturum başlığından** çıkardım.
Başlığı `Fırsatlar görsel edinim script'i` olan oturum aslında veli
migration'larını (0116, 0118), RLS doğrulamasını ve P5 haftalık yorum
runner'ını yazmış olan oturummuş. **Oturum başlığı, o oturumun ne yaptığının
kanıtı değildir.** O oturum durup sorduğu için yakalandı; sormasaydı sekiz
yanlış yönlendirme fark edilmeden gidecekti. Aşağıdaki tablo artık oturumların
*kendi* beyanına göre güncellenecek, başlığa göre değil.

| Oturum (başlık — güvenilmez) | Madde |
| --- | --- |
| academic_tier backfill | **D3** — alan bazlı ölçüm + "öğrenci görüyor mu" ekseni |
| production deployment | **B1** — ödeme kesişimi, migration **0123** |
| CFO | filo gözetimi — numara çakışması, merge girişimi, aynı dosya |
| freemium araştırması | **B2** — tam ekran yükseltme kartı, migration **0124** |
| i18n altyapısı | **B3a** — veli ayrı sayfalar |
| kullanım sınırları | **D2** — fırsat doldurma *(takas edildi)* |
| reşit olmayan hukuki çerçeve | **A4'ün girdisi** — tüm e-posta gönderimi buna kilitli |
| yeni ülke: 40 kurum | **D1** — üniversite doldurma, QS top-100'ün kalan 25'i |
| "görsel script'i" = veli migration'larını yazan oturum | **B3b** — veli özeti aylığa *(takas edildi)* |

**Takas sebebi:** B3b haftalık runner'ı aylığa çevirmek demek. O runner'ı yazan
oturum dururken işi bağlamı olmayan bir oturuma vermiştim — yani yazılmış olanı
baştan yazdırma yoluna sokmuştum. D2 ile yer değiştirdiler.

**Verilen migration numaraları: 0123 → B1, 0124 → B2.** Başkası almaz.

**Henüz kimseye verilmedi:** B3c (veli kütüphane erişimi), C1 (veli uçtan uca —
A1 bitti, artık çalıştırılabilir), C2 (danışman streaming), C3 (öğrenci ana
akışı). Oturumlar rapor ettikçe sıradan verilecek.

**Açık risk:** uzaktaki `ORYN i18n altyapısı` oturumu çevrimdışı ama duruyor;
yereldeki i18n oturumuyla aynı işi yapıyor olabilirler. Bu şüphe de iki başlığın
benzemesine dayanıyor — dala ve `origin`'e bakarak teyit edilecek.
