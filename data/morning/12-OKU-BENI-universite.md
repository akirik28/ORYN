# Üniversite verisi paketi — EN SON çalıştır

**Sıra: 09 → 11 → 12.** Ters yaparsan durur, hiçbir şey uygulanmaz.

**Bu paket öncekilerden farklı: veri yazıyor.** Diğer ikisi sadece şema değiştiriyordu.

---

## Neden bu paket var

Sen *"opportunity ve unilerle ilgili çok şey boş"* demiştin. Ölçtük:

**1010 üniversitenin 695'i (%68,8)** hiçbir içerik göstermiyor — istatistik, program,
gereksinim, kaynak, hiçbiri. Eksik bir alan değil, **sayfanın tamamı boş.**

695'i doldurmadık. **Dokuz üniversite**, ve her birinin **dört alanı da**. Bir üniversitenin
sayfasının çalışması, elli üniversitenin birer alanının dolu olmasından iyidir — ikincisi
hâlâ elli boş sayfa demek.

---

## ⚠ Bir düzeltme var, ve ayrıca bakmanı istiyorum

**TU Münih'in uluslararası öğrenci ücreti şu an veritabanında "0" yazıyor. Bu yanlış.**

O satır, Almanya'nın genel eyalet politikasını anlatan **üçüncü taraf bir siteden** gelmiş:
"sadece Baden-Württemberg ücret alıyor, TUM Bavyera'da, demek ki ücretsiz."

**TUM'un kendi ücret sayfası başka söylüyor:** AB dışı lisans öğrencisi için
**dönemde 2.000–3.000 avro.** TUM o genel politikanın gerçek bir istisnası.

Düzeltme, alt sınırı (yılda 4.000 avro) temel alıyor ve tam aralığı nota yazıyor —
**öğrencinin bilmeden karşılaşacağı bir sayı vermemek için.**

**Neden ayrıca söylüyorum:** bu, bir öğrenciye *"bedava"* diyen bir kaydı *"bedava değil"*
yapıyor. Gerçek bir para kararını etkiler. Diğer satırlar sadece boşluk dolduruyor;
bu bir iddiayı değiştiriyor. **Kabul etmezsen sadece o bölümü sil, gerisi çalışır.**

---

## Doğrulama — sessiz başarısızlığı da raporlar

Düzeltmenin bir koruması var: **sadece mevcut değer 0 ise çalışıyor.** Yani biri araya
girip başka bir şey yazdıysa **hiçbir şey yapmaz** — ve bunu fark etmen imkânsız olurdu.

O yüzden paket sonunda **ne olduğunu tek tek yazıyor.** Dört durumu da ayırt ediyor,
ve dördünü de ayrı ayrı denedim:

| veritabanındaki değer | paketin söylediği |
|---|---|
| 4000 | `DUZELTILDI — 0 idi, simdi 4000` |
| 0 | `HALA 0 — duzeltme calismadi, bana soyle` |
| başka bir sayı | `beklenen 0 veya 4000 degil, ELLE BAK` |
| satır yok | `DUZELTME UYGULANMADI, bana soyle` |

**Hiç kırmızıya dönmeyen bir kontrol, kontrol değildir.** Bu gece bunu dört kez öğrendim.

---

## Nasıl doğrulandı

**119 migration'ın tamamı sıfırdan yerel bir Postgres'e uygulandı** — 103 tablo, sıfır hata.
Sonra bu paket o gerçek şemaya karşı çalıştırıldı, uydurma bir taslağa değil.

TU Münih satırı **bilerek yanlış değerle** kuruldu ve düzeltmenin gerçekten çalıştığı görüldü.

**Yakalamadığı:** senin veritabanındaki gerçek satırların bu fikstürle aynı olup olmadığı.
Doğrulama bloğu tam da bunun için var.

---

## Doldurulmayan alanlar — ve bu bir eksiklik değil

Bazı alanlar **bilerek boş bırakıldı**, çünkü dürüst cevap yok:

- **Oxford'un kabul oranı** — yayınlamıyor, siteleri bot koruması arkasında
- **TU Münih'in kabul oranı** — Almanya'da her bölüm ayrı kabul yapıyor, **üniversite
  geneli diye bir sayı yok**
- **TU Delft'in kabul oranı** — bölümlerinin çoğu açık kayıt

Ve 0119 tam olarak bunun için: şu ana kadar boş bir kabul oranı **"araştırılmadı"** mı
yoksa **"böyle tek bir sayı yok"** mu, ayırt edilemiyordu. Artık ediliyor.

**Edinburgh bu alanın bahane olmadığının kanıtı:** onlar gerçek bir sayı yayınlıyor (%53),
ve öyle kaydedildi.
