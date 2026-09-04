# Paket 14 — bekleyen 3 migration + 4 hazır dolgu, tek sıra, iki kez test edildi

**Dosya: `14-toplu-paket-2026-09-04.sql`. Tek işlem, Supabase SQL Editor'e yapıştır, çalıştır.**

**Yapıştırmadan önce editörü boşalt** (`Cmd+A` → `Delete`, ya da yeni bir sekme aç) —
bu gece daha önce bir paket, sekmede kalan eski içeriğin arasına yapıştığı için hata
verdi; dosyanın kendisinde sorun yoktu.

## Neden bu paket var

Bugün üç migration (`0124`, `0126`, `0127`) ve dört şeridin dolgusu (D1, D5, D8, D2)
ayrı ayrı hazırlandı ve ayrı ayrı doğrulandı — ama hiçbiri **birlikte, sırayla**
test edilmedi. Bu sabahki paketlerde tam bu yüzden üç hata çıkmıştı, biri kurucunun
çalıştıracağı **ilk** pakette. Aynı hatayı tekrarlamamak için bu paket gerçek bir
yerel Postgres'te, gerçek üniversite ID'leriyle, **iki kez art arda** çalıştırıldı.

## Ne içeriyor, hangi sırada

1. **Migration 0124** — yükseltme kartı susturma sütunları (B2)
2. **Migration 0126** — fırsat yaş/sınıf "şart yok, onaylandı" bayrakları (D2'nin şeması)
3. **Migration 0127** — `admission_rate_basis`'e `not_published` (D1'in bulduğu gerçek gap)
4. **D1** — QS top-100 dolgusu, ilk dokuz kurum (Oxford, Princeton, UChicago, UPenn,
   TU Munich, Université PSL, Edinburgh, KCL, TU Delft)
5. **D5** — Caltech'in son başvuru tarihleri (12 gerçek hedef kurumun tek boş olanı)
6. **D8** — 12 gerçek hedef kurumun istatistik boşlukları (Oxford tamamlama, LSE/Erasmus/
   Amsterdam/Boğaziçi/Bocconi yeni satır, Caltech'in eksik SAT aralığı)
7-8. **D2** — fırsat dolgusu, dört dosya (ikisi 0126'dan bağımsız, ikisi 0126'ya bağlı —
   sıra buna göre kuruldu)

Migration'lar önce, sonra veri dolguları. D2'nin 0126'ya bağlı iki dosyası paketin
sonunda, 0126'dan sonra gelecek şekilde.

## İki kez çalıştırılabilir — üç gerçek sorun bulundu ve düzeltildi

Supabase SQL Editor `begin`/`commit`'i tek işlem olarak onurlandırmıyor (bu gece
başka bir pakette bunun yüzünden bir adım ikinci denemede patladı). Bu paketi
**gerçekten** iki kez art arda çalıştırdım, sadece varsaymadım:

- **Migration 0126** sütun eklerken `IF NOT EXISTS` kullanmıyordu — tek başına
  ikinci koşuda hata veriyordu. Düzeltildi, migration dosyasının kendisinde
  (`supabase/migrations/0126_...sql`), diğer bütün migration'ların zaten kullandığı
  aynı kalıba getirilerek.
- **D5'in Caltech tarihleri** düz bir `INSERT`ti, `university_deadlines` tablosunun
  hiçbir benzersizlik kısıtı yok — ikinci koşuda dört satır sekize çıkıyordu. Açık bir
  "yoksa ekle" koruması eklendi, tarihlerin kendisi değişmedi.
- **D8'in beş yeni istatistik satırı** (LSE/Erasmus/Amsterdam/Boğaziçi/Bocconi) da düz
  `INSERT`ti. Tablonun `(university_id, stat_year)` benzersizlik kısıtı var ama hiçbiri
  `stat_year` yazmıyordu — boş kalan sütun asla çakışma saymıyor, yani ikinci koşu
  **hatasız beş çift satır** üretiyordu, hiçbir uyarı vermeden. En sinsi olanı buydu:
  paket "başarılı" görünüyordu, veri sessizce bozuluyordu. Beşine de açık "yoksa ekle"
  koruması eklendi.

Düzeltmelerden sonra: iki koşu da hatasız, ve her kurumun istatistik/gereksinim/tarih
satır sayısı **tek tek** kontrol edildi — hiçbiri ikiye katlanmadı.

## Ne dahil değil, ve neden

- **Migration 0123 (ödeme), 0128, 0129, 0130** — henüz yazılmadı ya da henüz main'e
  girmedi. Hazır olunca ayrı bir paket, ya da bu pakete ek.
- **D1'in ikinci partisi** (QS top-100'ün geri kalanı — şu an 14/19 kurum, hâlâ büyüyor)
  — bilerek dışarıda bırakıldı. Hâlâ başka bir şeridin elinde, ve yarım bir parti
  paketlemek "bitti" izlenimi verirdi. Tamamlanınca kendi paketi olur.

## Doğrulama yöntemi

`scripts/check-package-14-sequence.sh` — bu depoya yeni eklendi, aynı yaklaşımı
(`check-morning-packages-sequence.sh`'nin kendi altyapısı: sahte `auth`/`storage`
şeması, rol oluşturma) tekrar kurmadan kullanıyor.

1. Yerel Postgres'te, `0124`'ten önceki her migration'ı canlıdaki gibi kurar.
2. Paketin referans verdiği 10 gerçek üniversiteyi **gerçek ID'leriyle** ekler (canlı
   veritabanından okunmuş, uydurulmamış) — Oxford'un istatistik satırı da canlıdaki
   satırla birebir aynı (`stat_year: 2025`, aynı kaynak, aynı zaman damgası), rastgele
   bir yer tutucu değil.
3. Paketi çalıştırır. Hata varsa durur ve gösterir.
4. Paketi **ikinci kez** çalıştırır. Hata varsa durur ve gösterir.
5. Yedi kurumun istatistik satır sayısını tek tek sayar — hiçbiri 1'i geçmemeli.

Bu makinede son çalıştırma: iki koşu da temiz, 7 kurum 7 satır.

## Canlıya hiçbir şey yazılmadı

Bütün doğrulama yerel, tek kullanımlık bir Postgres veritabanında yapıldı. Gerçek
üniversite ID'leri sadece **okundu** (canlıdan `select`), hiçbir yazma yapılmadı.
`scripts/check-package-14-sequence.sh`'i istersen kendin de çalıştırabilirsin —
`psql` kurulu olması yeterli, canlıya dokunmuyor.

## Hata alırsan

Paket tek işlem — bir satır patlarsa hiçbiri uygulanmaz. Hata mesajını oku, hangi
bölümde olduğunu (1/8 ... 8/8 yorum satırları) bul. Aynı hatayı burada yeniden
üretemezsen (yerel testte çıkmadıysa), en olası sebep: canlı veritabanının şu anki
hâli bu paketin varsaydığından farklı — örneğin bir satır bu paket hazırlandıktan
sonra başka bir yoldan zaten eklenmiş olabilir. Durur, ne olduğunu buraya yaz, tek
tek bakarız.
