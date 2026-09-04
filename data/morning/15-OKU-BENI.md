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
8. **Edinburgh eşitleme düzeltmesi** (REQUIRES 0133) — Edinburgh'ün Paket 16'da hayatta
   kalan satırına (`30436a92`) `country_eligibility_basis` dolduruyor. Bugüne kadar hiçbir
   pakete dahil edilmemiş, bağımsız bir dosyaydı — bulunup buraya eklendi (aşağıda DÜZELTME 4)
9. **Waterloo/CEMC bölünmesi** — dokuz farklı yarışmayı tek, uyumsuz `eligible_grades`
   değeriyle bir araya getiren şemsiye satır, 5 doğru kapsamlı yeni satıra bölündü, eski
   satır kapatıldı (silinmedi — `status = 'disabled'`)

Migration'lar önce (0132 dahil — aşağıda neden), sonra beş veri dosyası kendi yazılış
sırasıyla. Beş veri dosyası birbirinden bağımsız — hiçbiri aynı fırsatın aynı alanına
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

## Kaynağında bulunup düzeltilen dört gerçek sorun

**1. Waterloo/CEMC'nin 5 INSERT'inde re-run koruması yoktu** —
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

**2. Immerse Education'ın (id `7f90019e`) sınıflandırması, Paket 14'ün aynı satır için verdiği
kararla çelişiyordu — CEO merge öncesi incelerken buldu, ben doğruladım ve kaynağında
düzelttim.** Paket 14'ün D2 dolgusu bu satırı `country_eligibility_confirmed_open = true`
yapmıştı ("140+ ülke, olumlu bir beyan" gerekçesiyle); Paket 15'in sınıflandırma dosyası aynı
satırı `country_eligibility_basis = 'checked_not_stated'` yapıyordu ("betimleme, politika
beyanı değil" gerekçesiyle) **ama boole'yi geri almıyordu.** 0133'ün CHECK kısıtı sadece enum
üyeliğini doğruluyor, boole ile çapraz kontrol etmiyor — hata vermeden ikisi aynı satırda
duruyordu, ve `computeEligibility` boole'yi önce okuduğu için daha dikkatli yeni sınıflandırma
sessizce etkisiz kalıyordu.

**Kalıcı kontrolü yazarken, sadece incelemekle değil, ikinci, daha sinsi bir etki buldum:**
0133'ün kendi backfill'i her koşuda yeniden çalışıyor, tek seferlik değil. Boole `true` bırakılınca,
**ikinci koşuda** 0133'ün backfill'i bu satırın basis'ini `confirmed_no_restriction`'a **geri
yazıyordu** — sınıflandırma dosyasının kendi koruması artık `citizenship_restrictions`'ın null
olması yüzünden tetiklenmiyordu. Sonuç: iki koşu sonunda çelişkili bir durum değil, **temiz
görünen ama yanlış** bir durum (`checked_not_stated` yerine `confirmed_no_restriction`) —
tam da tek-satır incelemenin kaçıracağı türden. Kanıtlandı, iki ayrı ölçümle: düzeltmeyi
geçici çıkarıp gerçek iki-koşu testini çalıştırdım — genel `checked_not_stated` sayısı 14'ten
13'e düştü, VE Immerse'in kendi satırını doğrudan sorguladım: iki koşu sonunda
`country_eligibility_basis = 'confirmed_no_restriction'`, `country_eligibility_confirmed_open
= true` — tam olarak tahmin ettiğim yanlış durum, varsayılmadı. Düzeltme (boole'yi basis'le
birlikte sıfırlamak) bu satırı 0133'ün backfill'inin bir daha hiç eşleşmeyeceği hâle getiriyor
— sadece ilk koşuda değil, her koşuda kararlı.

**Sistematik kontrol, tek satırla sınırlı kalmadı:** Paket 14'ün `*_confirmed_open = true`
yaptığı diğer 4 satır (Penn Pre-College, Interlochen Review, TechGirls, bir sınıf-only satır)
tek tek `grep`lendi — hiçbiri Paket 15'in hiçbir dosyasında geçmiyor. Tek çakışma Immerse'ti.
Yaş ve sınıf boyutları için de aynı soru soruldu: Paket 14'te `age_eligibility_confirmed_open
= true` yapan **hiçbir satır yok** (grep ile doğrulandı), yani o boyutta çakışma imkansız.

**Kalıcı kontrol eklendi** (`scripts/check-package-15-sequence.sh`): iki koşu sonunda hiçbir
satır `*_confirmed_open = true` ile `*_basis = 'checked_not_stated'` birlikte taşımamalı, üç
boyutta da (ülke/yaş/sınıf). Bugün bu tek satırda çıktı; bir sonraki pakette üç satırda çıkarsa
kimse tek tek bakmayacaktı.

Diğer üç veri dosyası (boilerplate temizliği, sınıflandırma, D2 ülke dolgusu) zaten her
UPDATE'i tam metin/durum eşleşmesiyle koruyor — kendiliğinden re-run güvenli, herhangi bir
değişiklik gerekmedi.

**3. Bu paket üretildikten SONRA kaynak dosyaya bir satır daha eklendi (Interlochen Review,
`95093e1a`) — bugün ikinci kez, aynı hata sınıfı.** CEO merge etmeden önce kimlikleri tek tek
karşılaştırdı: sınıflandırma dosyasındaki 6 UPDATE'in 5'i pakette vardı, biri (Interlochen)
yoktu — çünkü paket ilk üretildikten sonra eklenmişti. Paketin kendi yorumu da artık yanlış
bir şey iddia ediyordu ("diğer 4 satır ... Paket 15'in hiçbir dosyasında geçmiyor" — Interlochen
artık o listede değildi).

**Paket kaynaktan yeniden üretildi**, 6. UPDATE otomatik dahil oldu. **Sistematik kontrol
yeniden çalıştırıldı, önceki iddiaya güvenilmedi:** Paket 14'ün `*_confirmed_open = true`
yaptığı satırlar taze bir `grep` ile yeniden sayıldı — Penn Pre-College/TechGirls/sınıf-only
satırın hâlâ hiçbir Paket 15 dosyasında geçmediği doğrulandı.

**Bu sırada ayrı, daha derin bir sorun çıktı:** Interlochen'in `confirmed_open=true`'sunun
asıl kaynağı (`docs/d2-visible-priority-additions-2026-09-04.sql`) o dosyanın KENDİSİNDE
zaten geri çekilmişti — ama bu geri çekme, **çoktan inşa edilmiş Paket 14 paketine hiç
yansımamıştı.** Yani `data/morning/14-toplu-paket-2026-09-04.sql`, kurucunun eline geçecek
hâliyle, hâlâ eski/hatalı satırı taşıyordu. **Paket 14'ün kendisi de kaynağında düzeltildi**
(satır sadece `eligible_grades` yazacak şekilde), Paket 14'ün kendi `check-package-14-
sequence.sh`'i ile yeniden doğrulandı — temiz.

**Kalıcı önlem — CEO'nun açık talebi:** paket üretildikten sonra kaynak dosyalar değişirse
artık **sessizce** fark edilmeyecek. `scripts/check-package-15-sequence.sh`'in en başına bir
**sağlama kontrolü** eklendi: paketin kendi başlığı, üretim anındaki 9 kaynak dosyanın
(4 migration + 5 veri dosyası) SHA-256'sını taşıyor; test her çalıştığında bunları YENİDEN
hesaplayıp karşılaştırıyor, herhangi biri farklıysa **veritabanına hiç dokunmadan** açıkça
durup hangi dosyanın bayatladığını söylüyor. Kanıtlandı, sadece yazılmadı: bir kaynak
dosyaya deneme amaçlı bir satır ekleyip testi çalıştırdım, kontrol hemen kırmızıya döndü ve
doğru dosyayı adlandırdı; değişikliği geri alıp tekrar çalıştırdım, temiz geçti.

**4. `edinburgh-duplicate-row-parity-fix-2026-09-04.sql`, Paket 16'nın kendi yorumunun
"zaten uygulanmış" varsaydığı bir düzeltme, hiçbir pakete dahil edilmemişti.** CEO'nun
"üç paketi arka arkaya çalıştır" talebini hazırlarken bulundu, kurucuya sunulmadan önce.
Bu dosya Edinburgh'ün Paket 16'da hayatta kalan satırına (`30436a92`) `country_eligibility_
basis` dolduran, 0133'e bağımlı, zaten yazılmış bir düzeltme — ama kendi başına, bağımsız
duruyordu. Üç paket de (14/15/16) çalıştırılsa bile bu satır dolmayacaktı, çünkü hiçbiri bu
dosyayı içermiyordu. **0133'e bağımlı olduğu için buraya, D2 ülke dolgusunun hemen ardına
eklendi** (yeni BÖLÜM 8/9). Sağlama listesine 9. dosya olarak katıldı. Kendi WHERE koruması
`status`'a bakmıyor — Paket 16'nın Edinburgh'ü emekliye ayırmasından önce mi sonra mı
çalıştığından bağımsız, `check-morning-packages-14-15-16-sequence.sh` ile ölçülerek
doğrulandı (aşağıya bakın).

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
2. Paketin referans verdiği 24 gerçek fırsatı **gerçek ID'leri ve gerçek alan değerleriyle**
   ekler (canlı veritabanından okunmuş — `citizenship_restrictions`/`residency_restrictions`
   metni dahil harfiyen aynı, her UPDATE'in kendi WHERE koruması tam bu yüzden tutuyor).
3. Paketi çalıştırır. Hata varsa durur ve gösterir.
4. Paketi **ikinci kez** çalıştırır. Hata varsa durur ve gösterir.
5. On farklı sonucu tek tek sayar: 5 yeni CEMC satırı (10 değil), eski Waterloo satırının
   `disabled` olduğu, üç yeni "basis" sütununun var olduğu, `parent_commentary_entries`
   tablosunun var olduğu, `university_statistics` indeksinin artık coalesce'li olduğu,
   16 satırın `checked_not_stated` olduğu, 2 satırın `confirmed_no_restriction`'a
   yükseldiği, Lumiere'in kirli `citizenship_restrictions`'ının temizlendiği, Interlochen'in
   kendi satırının doğru son durumda olduğu, Edinburgh survivor'ının basis'inin dolduğu.

Ayrıca (0'ıncı adım, veritabanına dokunmadan önce): **sağlama kontrolü** — 9 kaynak dosyanın
şu anki SHA-256'sı, paketin kendi başlığındaki üretim-anı değerleriyle karşılaştırılıyor.
Farklıysa test hemen durur, hangi dosyanın bayatladığını söyler.

Bu makinede son çalıştırma: sağlama kontrolü temiz, iki koşu da temiz, on kontrolün hepsi
beklenen sayıda.

## Üç paket arka arkaya — CEO'nun asıl istediği test

Paket 14/15/16'nın kendi testleri her paketi **tek başına** doğruluyor. CEO'nun kendi
gerekçesi: *"Bugün paketleri tek tek doğruladık. Üçünü sırayla hiç kimse çalıştırmadı — ve
sabah kurucunun elinde patlayan hata tam olarak buydu: her paket ayrı ayrı doğruydu, sıra
bozuktu."* `scripts/check-morning-packages-14-15-16-sequence.sh` üçünü **gerçek sırasıyla
(14 → 15 → 16), aynı veritabanında, iki kez** çalıştırıyor.

**İki kesişim özellikle soruldu, ikisi de ölçüldü:**
- **0132'nin indeksi (Paket 15) ile Paket 16'nın birleştirmesi aynı tabloya mı dokunuyor?**
  Hayır — Paket 16 sadece `public.opportunities`'e yazıyor, `university_statistics`'e hiç
  dokunmuyor. Dosya okunarak (statik) doğrulandı, veritabanı gerekmedi.
- **Paket 16'nın emekliye ayırdığı satırlar, Paket 15'in güncellediği satırlarla kesişiyor
  mu?** Evet, Edinburgh'te — Paket 15'in D2 dolgusu `dc762fce`'ye `country_eligibility_basis`
  yazıyor, Paket 16 aynı satırı emekliye ayırıp verisini `30436a92`'ye taşıyor. **Sıra
  önemli değil, ölçüldü:** iki koşu sonunda `30436a92` (hayatta kalan) hem doğru
  `country_eligibility_basis`'i hem Paket 16'nın taşıdığı yaş/tarih verisini taşıyor;
  `dc762fce` (emekli) `disabled` durumunda. Paket 15'in D2 dolgusu `dc762fce`'ye emekli
  olmadan önce yazıyor olsa da zararsız — emekli bir satırın hiçbir alanı hiçbir öneri
  yüzeyinde okunmuyor.

Bu makinede son çalıştırma: statik kontrol temiz, iki tam geçiş de (14→15→16, iki kez)
hatasız, üç satırlık çapraz-paket kontrolü beklenen sonuçlarda.

**Not:** bu test sırasında bir kez gerçek bir disk dolması yaşandı (`ENOSPC`, en basit
komutlar bile başarısız oluyordu) — benden kaynaklanmadı, muhtemelen filo genelinde bir
anlık zirve, CEO'ya anında bildirildi. Birkaç dakika içinde kendiliğinden düzeldi (5,5 GB
boş alana döndü), test o zaman tekrarlandı ve temiz geçti. Test scripti kendi başına bu
sınıf bir hatayı ayırt edemez (psql'in gerçek hata mesajı `>/dev/null 2>&1` ile
bastırılıyor) — aynı "BASELINE FAILED" mesajı gerçek bir SQL hatasından da gelir. Aynı
belirsiz hatayı tekrar görürsen, önce `df -h /` ile disk alanını kontrol et.

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
