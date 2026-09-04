# Paket 15 — Paket 14'ten sonraki 4 migration + 4 hazır dolgu, tek sıra, iki kez test edildi

**Dosya: `15-toplu-paket-2026-09-04.sql`. Tek işlem, Supabase SQL Editor'e yapıştır, çalıştır.**

**Yapıştırmadan önce editörü boşalt** (`Cmd+A` → `Delete`, ya da yeni bir sekme aç) — Paket
14'ün kendi OKU-BENİ'sinde de aynı uyarı var, aynı sebep: eski içeriğin arasına yapışan bir
paket, dosyanın kendisinde sorun olmasa bile hata verebiliyor.

**Bu paket Paket 14'ten SONRA çalıştırılmalı.** Paket 14 henüz uygulanmadıysa, önce onu
çalıştır — bu paketin migration'ları (0129, 0133) Paket 14'ün 0126'sının yazdığı sütunları
okuyor, ve baseline testim de Paket 14'ün 0124/0126/0127'sinin zaten uygulanmış olduğunu
varsayıyor.

## Neden bu paket var

CEO'nun dispatch'i: Paket 14'ten sonra `main`'e giren ve hiçbir pakette olmayan 4 migration
artı, aralarında CEO'nun 3'lü testiyle sınıflandırdığı 7 satırı da içeren, hazırlanmış 4 veri
dosyası. Ben Paket 14'ü kurdum, harness bende — aynı disiplinle: gerçek yerel Postgres'te,
gerçek fırsat ID'leriyle, **iki kez art arda** çalıştırıldı.

## Ne içeriyor, hangi sırada

1. **Migration 0129** — fırsat yaş/sınıf eligibility "basis" sütunları (0126'nın iki durumuna
   üçüncü bir durum ekliyor: sayfa kontrol edildi ama hiçbir şey söylemiyor)
2. **Migration 0130** — `parent_commentary_entries` tablosu (B3a'nın aylık veli özeti için
   içerik saklama — üretim kodu zaten bunu hesaplıyordu, hiç kaydetmiyordu)
3. **Migration 0132** — `university_statistics`'in benzersizlik indeksi hiç çalışmıyordu
   (NULL `stat_year` hiçbir zaman NULL'a eşit sayılmıyor); `coalesce` ile düzeltildi
4. **Migration 0133** — fırsat ÜLKE eligibility'sine aynı üçüncü durum (0129'un ülke yarısı)
5. **citizenship_restrictions/residency_restrictions boilerplate temizliği** — 11 fırsatta,
   17 alan-örneğinde, bir araştırma notu ("Sayfada hiçbir şey bulunamadı") gerçek kısıtlama
   metni yerine kayıtlı duruyordu; öğrenci detay sayfası bunu OLDUĞU GİBİ, hiç doğrulamadan
   gösteriyor. 10 örnek temizlendi (7'si bilerek dokunulmadan bırakıldı — gerçek, kullanışlı
   bilgi taşıyorlar, sadece aynı yanıltıcı "Hiçbir şey bulunamadı" cümlesiyle başlıyorlar)
6. **CEO'nun 3'lü testiyle sınıflandırılan 7 satır** (REQUIRES 0133) — açık "kısıtlama yok"
   ifadesi olan 2 satır (Bocconi, Wharton LBW) `confirmed_no_restriction`'a yükseltildi;
   gerçek işlem bilgisi taşıyan 2 satır (Ross Mathematics'in vize detayı, IE University'nin
   vize notu) dokunulmadan bırakıldı; sadece "sayfa hiçbir şey söylemiyor" olan 3 satır
   (Immerse, Oxford Scholastica, UCSB) `checked_not_stated`'a taşındı
7. **D2 — ülke eligibility'si "checked_not_stated" dolgusu, 11 satır** (REQUIRES 0133) —
   D2'nin görünür-öncelik araştırmasının ülke yarısı; 0129 sadece yaş/sınıfı kapatmıştı
8. **Waterloo/CEMC bölünmesi** — dokuz farklı yarışmayı tek, uyumsuz `eligible_grades`
   değeriyle bir araya getiren şemsiye satır, 5 doğru kapsamlı yeni satıra bölündü, eski
   satır kapatıldı (silinmedi — `status = 'disabled'`)

Migration'lar önce (0132 dahil — aşağıda neden), sonra dört veri dosyası kendi yazılış
sırasıyla. Dört veri dosyası birbirinden bağımsız — hiçbiri aynı fırsatın aynı alanına
yazmıyor, tek tek doğrulandı.

## 0132'nin yeri — neden veri dolgusundan önce

CEO açıkça sordu: index oluşturma veride çift satır varsa patlıyor, bu paket sırasında
dolgudan önce mi sonra mı gelmeli. Cevap ve gerekçe:

**Bu paket için pratikte fark etmiyor** — 0132 sadece `university_statistics`'e dokunuyor,
ve bu paketteki HİÇBİR veri bölümü o tabloya yazmıyor (D1'in ikinci partisi — QS top-100'ün
kalanı — hâlâ büyüyor, şu an 14/19 kurumda, başka bir oturum bu paket hazırlanırken canlı
üzerinde çalışıyordu; Paket 14'te verdiğim aynı karar burada da geçerli: bitmemiş bir dolguyu
pakete almam).

**Ama genel, savunmacı ilke olarak indeksi en başa koydum, migration'ların ilk grubuna.**
Gerekçe: kısıt erken kurulursa, bu paketten SONRA gelecek herhangi bir
`university_statistics` yazımı (bu paketin kendisinde olmasa bile — D1'in ikinci partisi
tamamlanınca kendi paketi olacak) o andan itibaren korunmuş olur; bir INSERT çift satır
üretmeye çalışırsa AÇIKÇA hata verir, sessizce girmez. Kısıt geç kurulsaydı, tam tersi:
çift satır sessizce girer, sonra index oluşturma AYRICA patlar — iki kat kötü, ve founder'ın
önünde temizlenmesi gereken hem çift veri hem başarısız migration olurdu. 0132'nin kendi
ölçümü (canlı veride 0 çift satır, 2026-09-04) bu paket sırasında geçerliliğini koruyor
çünkü aradaki hiçbir bölüm o tabloya dokunmuyor.

## Kaynağında bulunup düzeltilen tek gerçek sorun

`waterloo-cemc-split-execute-2026-09-04.sql`'in 5 INSERT'inde re-run koruması yoktu —
`gen_random_uuid()` kullanıyorlar, ve hiçbir `ON CONFLICT` yoktu. **Kanıtlandı, sadece
iddia değil:** korumayı geçici çıkarıp paketi tekrar çalıştırdım — ikinci koşu **açık bir
hatayla durdu** (`duplicate key value violates unique constraint "opportunities_dedup_idx"`),
sessizce çoğalmadı ama paket ikinci kez çalıştırılamaz hâle geldi. Düzeltme: mevcut
`opportunities_dedup_idx`'i (migration 0008, `normalized_title` + `organization`) kullanan
`on conflict (normalized_title, coalesce(organization, '')) do nothing` eklendi — yeni bir
mekanizma değil, `supabase/seed_drive_batch1.sql`'de zaten kanıtlanmış aynı desen. **Kaynağın
kendisinde düzeltildi** (`docs/waterloo-cemc-split-execute-2026-09-04.sql`), sadece bu paketin
kopyasında değil — bugün 0126/D5/D8 için uygulanan aynı standart. Koruma geri konunca ikinci
koşu temiz geçti, 5 satır kaldı (10'a çıkmadı).

Diğer üç veri dosyası (boilerplate temizliği, sınıflandırma, D2 ülke dolgusu) zaten her
UPDATE'i tam metin/durum eşleşmesiyle koruyor — kendiliğinden re-run güvenli, herhangi bir
değişiklik gerekmedi.

## Ne dahil değil, ve neden

- **D1'in ikinci partisi** (QS top-100'ün geri kalanı, şu an 14/19 kurum, hâlâ büyüyor) —
  bilerek dışarıda bırakıldı, Paket 14'teki aynı gerekçe: yarım bir parti "bitti" izlenimi
  verir, başka bir oturumun elinde şu an.
- **Migration 0123 (ödeme)** — henüz yazılıyor, ayrı bir iş.

## Doğrulama yöntemi

`scripts/check-package-15-sequence.sh` — Paket 14'ün kendi `check-package-14-sequence.sh`'i
aynı yaklaşımla, üçüncü kez yeniden kurulmadan.

1. Yerel Postgres'te, 0129'dan önceki her migration'ı kurar (Paket 14'ün 0124/0126/0127'si
   dahil — bu paket ondan sonra geldiği için zaten uygulanmış varsayılıyor).
2. Paketin referans verdiği 22 gerçek fırsatı **gerçek ID'leri ve gerçek alan değerleriyle**
   ekler (canlı veritabanından okunmuş — `citizenship_restrictions`/`residency_restrictions`
   metni dahil harfiyen aynı, her UPDATE'in kendi WHERE koruması tam bu yüzden tutuyor).
3. Paketi çalıştırır. Hata varsa durur ve gösterir.
4. Paketi **ikinci kez** çalıştırır. Hata varsa durur ve gösterir.
5. Sekiz farklı sonucu tek tek sayar: 5 yeni CEMC satırı (10 değil), eski Waterloo satırının
   `disabled` olduğu, üç yeni "basis" sütununun var olduğu, `parent_commentary_entries`
   tablosunun var olduğu, `university_statistics` indeksinin artık coalesce'li olduğu,
   14 satırın `checked_not_stated` olduğu, 2 satırın `confirmed_no_restriction`'a
   yükseldiği, Lumiere'in kirli `citizenship_restrictions`'ının temizlendiği.

Bu makinede son çalıştırma: iki koşu da temiz, sekiz kontrolün hepsi beklenen sayıda.

## Canlıya hiçbir şey yazılmadı

Bütün doğrulama yerel, tek kullanımlık bir Postgres veritabanında yapıldı. Gerçek fırsat
alan değerleri sadece **okundu** (canlıdan `select`), hiçbir yazma yapılmadı.
`scripts/check-package-15-sequence.sh`'i istersen kendin de çalıştırabilirsin — `psql`
kurulu olması yeterli, canlıya dokunmuyor.

## Hata alırsan

Paket tek işlem (`begin`/`commit` ile sarılı, Paket 14 ile aynı desen) — bir satır patlarsa
hiçbiri uygulanmaz. Hata mesajını oku, hangi bölümde olduğunu (1/8 ... 8/8 yorum satırları)
bul. Aynı hatayı burada yeniden üretemezsen (yerel testte çıkmadıysa), en olası sebep: canlı
veritabanının şu anki hâli bu paketin varsaydığından farklı — örneğin bir satır bu paket
hazırlandıktan sonra başka bir yoldan zaten değişmiş olabilir. Durur, ne olduğunu buraya
yaz, tek tek bakarız.
