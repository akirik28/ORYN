# 4 Eylül sabah paketi — oku, sonra çalıştır

Tek dosya: **`09-migrations-2026-09-04.sql`** (618 satır).
Tek işlem. Hepsi geçer ya da hiçbiri geçmez.

---

## Nasıl çalıştırılır

Supabase SQL Editor'de **yeni bir sekme aç**.

Eski sekmeyi tekrar kullanma. 3 Eylül'de tam da bu yüzden 558. satırda başka bir
dosyanın artığı karıştı ve paket yarıda kaldı.

```
Cmd + A  →  Delete  →  dosyanın TAMAMINI yapıştır  →  Run
```

Dosya **`commit;`** ile biter. Yapıştırdıktan sonra en son satır o değilse
yapıştırma eksik demektir — tekrar dene.

---

## İçinde ne var

**1 — Migration 0115**
`opportunity_matches.eligibility_notes_codes` sütunu ve onu koruyan trigger.

**2 — Migration 0116 — veli hesabı**
Bu gecenin ana işi. Aşağıda ayrıca anlatıyorum.

**3 — Türkçe ek düzeltmesi**
3 Eylül'deki isim değişikliği düz metin değiştirme kullandı: `Oryn` → `Proxola`.
128 satırın 118'inde doğru çalıştı. Ama **"Oryn" sessizle bitiyor, "Proxola" sesliyle** —
yani ekler bozuldu:

| şu an veritabanında | doğrusu |
|---|---|
| Proxola**'ın** | Proxola**'nın** |
| Proxola**'ı** | Proxola**'yı** |
| Proxola**'a** | Proxola**'ya** |
| Proxola**'la** | Proxola**'yla** |
| Proxola'da | ✓ bu zaten doğru, dokunulmuyor |

Bu benim hatamdı — düz `replace()` yazdım, Türkçe ünlü uyumunu hesaba katmadım.

**4 — Doğrulama**
Her nesneyi tek tek kontrol eder. **Bir tanesi bile eksikse işlemi durdurur ve
hiçbir şey uygulanmaz.** Sonuçlar NOTICE olarak alt panelde görünür.

---

## 0116 ne yapıyor — sade dille

Senin cümlen: *"veli hesapları sadece gözlemleyebilmeli asla ama asla bir şey
değiştirememesi lazım."*

**Bu kural arayüzde değil, veritabanı seviyesinde uygulanıyor.** Butonu gizlemek
yetmez — veli rolü çocuğunun satırlarında sadece `SELECT` alıyor, `INSERT`/`UPDATE`/
`DELETE` almıyor. Uygulama tamamen bypass edilse bile veli hiçbir şeyi değiştiremez.

**Veli çocuğun profilini doğrudan okumuyor bile.** Üç ayrı fonksiyon üzerinden
okuyor, ve o fonksiyonların kendi sütun listesi sınırı çiziyor: 9 sütun, o kadar.
Danışman sohbetleri, öğrencinin refleksiyon notları, özelleşme talimatları,
kanıt dosyaları — **hiçbiri o listede yok.**

Bu bilinçli bir karar, ve sebebi şu: 14–18 yaşındaki bir öğrenci danışmana
*"ailem tıp için baskı yapıyor"* yazabiliyor. **Velinin gördüğünü bilen bir
öğrenci onu hiç yazmaz.** Ürünün en değerli yüzeyi gizli olduğu için değerli.

**Bağlantı çift onaylı.** Veli davetle hesap açar → bağlantı `pending` durumunda
bekler → **veri hiç kimseye akmaz** → ancak **öğrenci** onayladığında erişim başlar.
Veli kendi kendini aktive edemez; politikalar özellikle bunu engellemek için yazıldı.
Bir e-posta yazım hatası yabancı birine çocuğun profilini açmasın diye.

---

## Dürüst olmam gereken iki şey

**1. Bu paket canlı veritabanında prova edilmedi — ama yerelde gerçekten uygulandı,
ve bu sayede paketi bozacak bir hata bulundu.**

07 numaralı paketi uygulamadan önce `begin/rollback` ile prova etmiştim. Bu sefer
edemedim — canlı veritabanına okuma erişimim bu oturumda engellendi ve **bunu
dolanmadım, başkasından da istemedim.**

İlk kontrolüm sadece **ayrıştırmaydı**: 618 satır, sıfır sözdizimi hatası. Bunun
yakalamadığı bir şey vardı ve **44 numaralı oturum onu yakaladı** — migration zincirini
gerçek bir Postgres'e uygulayarak, benim yaptığımdan daha güçlü bir kontrolle.

**Bulunan hata:** 0115, `eligibility_notes` sütununun tipini değiştirmeye çalışıyordu
ama sütuna bağlı trigger'ı **sonra** siliyordu. Postgres buna izin vermez:

```
ERROR: cannot alter type of a column used in a trigger definition
```

**Bu olsaydı ne olurdu:** 0115 patlar, işlem geri alınır, **0116 hiç uygulanmaz.**
Yani veli hesabı sabaha yetişmezdi.

**Düzeltildi** — sadece sıra değişti, tek satır yer değiştirdi, hiçbir mantık
değişmedi. Sonra iki yönlü doğruladım: aynı fixture'a **eski sıra hata veriyor ve
sütun `text` kalıyor**, **yeni sıra temiz geçiyor ve sütun `jsonb NOT NULL` oluyor.**
Kontrolün gerçekten kırmızıya dönebildiğini görmeden "temiz" demedim.

**Hâlâ yakalanmayan:** gerçek şemaya karşı geri kalan anlamsal doğruluk. 4. bölümdeki
doğrulama bloğu bunun için var — eksik bir nesne bulursa **her şeyi geri alır.**

**2. RLS politikalarının testi yazıldı ama çalıştırılmadı.**
`supabase/tests/parent_links_rls_manual.sql` — 339 satır, her engellemenin
gerçekten engellediğini tek tek deneyen bir betik. **Çalıştırılmadı**, çünkü
tek kullanımlık bir test veritabanı yok ve sana sormadan ücretli altyapı
açmak gecenin ortasında alınacak bir karar değil.

Betik hazır ve içinde **her bloğun neyi bozarsan testin kırmızıya dönmesi
gerektiği** yazıyor. İstersen sabah birlikte çalıştırırız.

---

## Uyguladıktan sonra

Bana **"0116 uygulandı"** de, yeter. Sonrasında:

- Veli davet akışı, ayarlar ekranındaki bağlantı ve kabul sayfası canlanır
- Veli panelinin okuma yolları gerçek veriye bağlanır
- Bekleyen uçtan uca kontroller (B1–B12) çalıştırılabilir hale gelir

**Mail gönderimi hâlâ kapalı** — babanın vereceği hukuki cevaba bağlı. Altyapı
kurulu, gönderim kapalı. Cevap gelince tek anahtar.
