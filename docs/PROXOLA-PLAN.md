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
> > 9. **Ana depoya yazma.** Keşif okumaların `Desktop/Founder/ORYN`'da geçtiyse
>    el o yolda kalıyor — bugün **üç bağımsız oturum** yazma anında oraya kaydı
>    (biri, o checkout'a bağlı canlı bir önizleme sunucusu çalışırken). Üçü de
>    kendi yakaladı, zarar olmadı. Dikkatsizlik değil, **ortamın şekli.**
>    Yazmadan önce worktree'ye geç veya `git -C <worktree>` kullan, ve ilk
>    yazmadan önce `git status`'a bak.
> 10. **Disk raporlarken yüzde verme, boş alan ver.** Bu Mac'te `/` (sistem
>    hacmi) %84, `/System/Volumes/Data` (worktree'lerin yeri) %99 gösteriyor —
>    ikisi aynı APFS container'ı ve **boş alan ikisinde de aynı: 3,3Gi.** Yüzde
>    hangi hacimden baktığına göre değişiyor; boş alan değişmiyor. CEO bugün bu
>    yüzden gözetmenin doğru rakamını yanlış diye "düzeltti."

**Çalışma penceresi: yarın akşam 22.00'a kadar.**

**Bu dosya tek doğruluk kaynağı.** Bir oturum açtığında ona madde numarası ver:
*"PROXOLA-PLAN.md'deki P3'ü al."* Madde kendi içinde yeterli.

**Kurallar, her madde için geçerli:**
- Bitince rapor et, sonra yeni iş iste — bekleme.
- Canlı veritabanına yazma yok. Migration numarasını CEO verir.
- `main`'e merge etme; dalını push et, dur.
- Bir şey zaten yapılmışsa **baştan yazma** — bugün üç kez "eksik" denen şey yazılmış çıktı.
- Kontrolün kırmızıya dönebildiğini kanıtlamadan "geçti" deme.

---

## 🟠 DÜNKÜ DÜRÜSTLÜK İŞİ CANLIDA DEĞİL — 5 Eylül, CEO doğruladı

**Canlı veritabanı `opportunities` tablosunda altı uygunluk sütunundan beşi yok.**
CEO kendi SQL'iyle doğruladı (bir şeridin bulgusu üzerine):

| sütun | canlıda |
|---|---|
| `country_eligibility_confirmed_open` (0060) | ✅ var |
| `age_eligibility_confirmed_open` | ❌ yok |
| `grade_eligibility_confirmed_open` | ❌ yok |
| `country_eligibility_basis` · `age_eligibility_basis` · `grade_eligibility_basis` | ❌ yok |

**Sonuç: dün "%97 → %79" diye raporlanan iyileşme canlıda geçerli değil.** Kod ve
migration'lar `main`'de duruyor, uygulanmayı bekliyor. Bir şeridin bugünkü bağımsız
ölçümü (%94,8) **dünkü başlangıç sayısıyla birebir aynı** — tam da bu yüzden.

**Ama arıza değil, ve yönü güvenli:** sorgular `select("*")` kullanıyor, yani eksik
sütun hata değil **yokluk** olarak geliyor; kod `?? false` / `?? null` ile düşüyor.
Bu da ürünü **daha çok uyarı gösteren** tarafa düşürüyor, daha az değil. Yani canlı
ürün **fazla temkinli**, yanıltıcı değil. **Kullanıcı zarar görmüyor, iyileşme
sadece teslim edilmemiş.**

**Bu, aşağıdaki "Kurucuyu bekleyen migration'lar — HİÇBİRİ ACİL DEĞİL" başlığını
geçersiz kılmıyor ama anlamını değiştiriyor:** acil değil çünkü bir şey bozuk değil;
**ama uygulanmadan dünkü işin hiçbiri öğrenciye ulaşmıyor.**

---

## ✅ JOB D DÜZELTİLDİ — cron'lar artık bu yüzden engellenmiyor (5 Eylül)

`lib/plan/persist.ts:92`'deki sarmalanmamış `getTranslations()` kaldırıldı;
`persist-matches.ts`'in kendi satır içi locale deseni uygulandı. **Kırmızıya
döndürülerek kanıtlandı:** yeni test `next-intl/server`'ı **reddedecek** şekilde
kurgulayıp gerçek işi sürüyor — eski kodda tam beklenen iz çıkıyor
(`getTranslations → persist.ts:92 → generateForStudent`), düzeltmeyle gerçek plan
üretiliyor. Eski testin **hiçbir şey yapmayan** next-intl mock'u da silindi; o mock
hatanın saklandığı yerdi.

**Aynı sınıftan ÜÇÜNCÜ bir hata da bulundu ve kapatıldı:**
`buildUniversityAdmissionContextText` kendi oturum kapsamlı istemcisini kuruyordu,
dışarıdan istemci alamıyordu — Job D'de **her plan için sessizce boş** dönerdi.
`buildStudentAdvisorContext`'in zaten kullandığı `supabaseClient?` parametresiyle
düzeltildi.

**İki bağlam boşluğu da kapandı:** hedef coğrafya artık `StudentAdvisorContext`'e
giriyor (etiket metni onboarding'in **kendi** çeviri anahtarlarından alındı,
uydurulmadı) · kabul oranı bağlamı **önce ölçülüp** sonra bağlandı: haftalık plan
bu ay 10 çağrıda **$0,1953**, ~5.120 girdi token/çağrı, **aylık ~$1,17** — $10
tavanına karşı geniş pay. Kabul oranının kendi maliyeti 234-569 token (%4,6-11,1
artış). **Tavan tehdit altında değil, o yüzden bağlandı.**

**Dürüstçe bildirilen açık:** eval harness'ının prompt kurucuları bu DB'ye bağlı
bölümü **hiç temsil edemiyor** (fixture'larda gerçek `target_universities` satırı
yok) — B7 dünden beri bunu sessizce atlıyormuş. Sahte veri **uydurulmadı**, harness'ın
kendi başlık yorumuna açık boşluk olarak yazıldı.

---

## ✅ SIRALAMA KARARSIZLIĞI KAPANDI — kanıt üretildi, iddia edilmedi (5 Eylül)

`home-strip.ts` ve **veli panelinin kendi ilk-5 yüzeyi** (`panel-data.ts:76`, ikinci
örnek, aynı şekil) ikincil sabit anahtar aldı (`.order("id")`).

**Kararsızlık gerçekten üretildi:** yerel geçici Postgres, 20 satır, hepsi aynı
`match_score`. `enable_seqscan=off` (Index Scan Backward) → bir satır **1. sırada**;
`enable_indexscan=off + enable_bitmapscan=off` (Seq Scan) → **aynı satır 5. sırada.**
Aynı veri, aynı sorgu, iki geçerli plan, farklı sıra. Düzeltmeden sonra iki planda da
**bayt bayt aynı.**

**Ve sahte harness kullanılmadı:** `mock-supabase-table.ts` `.order()`'ı bilinçli
no-op sayıyor — onunla yazılan test **her zaman yeşil** olurdu. Şerit bunu fark edip
kendi spy'ını yazdı.

**Ham SQL taraması da yapıldı** (`.order(` taraması yalnızca TypeScript'i görüyordu):
migration ve edge function'larda 4 isabet, **hiçbiri yeni örnek değil** — biri hep
`limit 1` ile çağrılıyor, ikisi zaten iki anahtarlı ve yazma anında bir kez çalışıyor.
**Dördüncü gerçek örnek yok**, ve bu ölçülerek söylendi.

---

## 🟠 DÜNKÜ DÜRÜSTLÜK İŞİ CANLIDA DEĞİL — 5 Eylül, CEO doğruladı

**Canlı veritabanı `opportunities` tablosunda altı uygunluk sütunundan beşi yok.**
CEO kendi SQL'iyle doğruladı (bir şeridin bulgusu üzerine):

| sütun | canlıda |
|---|---|
| `country_eligibility_confirmed_open` (0060) | ✅ var |
| `age_eligibility_confirmed_open` | ❌ yok |
| `grade_eligibility_confirmed_open` | ❌ yok |
| `country_eligibility_basis` · `age_eligibility_basis` · `grade_eligibility_basis` | ❌ yok |

**Sonuç: dün "%97 → %79" diye raporlanan iyileşme canlıda geçerli değil.** Kod ve
migration'lar `main`'de duruyor, uygulanmayı bekliyor. Bir şeridin bugünkü bağımsız
ölçümü (%94,8) **dünkü başlangıç sayısıyla birebir aynı** — tam da bu yüzden.

**Ama arıza değil, ve yönü güvenli:** sorgular `select("*")` kullanıyor, yani eksik
sütun hata değil **yokluk** olarak geliyor; kod `?? false` / `?? null` ile düşüyor.
Bu da ürünü **daha çok uyarı gösteren** tarafa düşürüyor, daha az değil. Yani canlı
ürün **fazla temkinli**, yanıltıcı değil. **Kullanıcı zarar görmüyor, iyileşme
sadece teslim edilmemiş.**

**Bu, aşağıdaki "Kurucuyu bekleyen migration'lar — HİÇBİRİ ACİL DEĞİL" başlığını
geçersiz kılmıyor ama anlamını değiştiriyor:** acil değil çünkü bir şey bozuk değil;
**ama uygulanmadan dünkü işin hiçbiri öğrenciye ulaşmıyor.**

---

## 🔴 CRON'LARI AÇMADAN ÖNCE OKU — moladan hemen önce bulundu

**Haftalık plan işi (Job D) açılırsa, hiçbir öğrenciye plan üretmeden "başarılı"
raporlar.**

`lib/plan/persist.ts:92`'de sarmalanmamış bir `getTranslations()` çağrısı var ve
Job D ona **plan üretimi başlamadan önce** ulaşıyor. Öğrenci başına `try/catch` işi
çökmekten koruyor — yani **iş sonuna kadar çalışır, iş seviyesinde başarı bildirir,
ve herkes için sıfır plan üretir. Sessizce.**

Bilinen grounding-loss hatası (`persist-matches.ts`) **düzeltilmiş**; bu **ikinci,
teşhis edilmemiş** bir bölge ve daha kötüsü: ilki kaliteyi düşürüyordu, bu **hiç
üretmiyor.**

**Bugün kimseyi etkilemiyor:** Job D `vercel.json`'a ve `JOB_DEFINITIONS`'a **hâlâ
bağlı değil** (dosyalar okunarak doğrulandı, yorumlara güvenilmedi). **Ama A6'da
cron'ları açarken bu iş de armadılırsa, ana ekrandaki "bu hafta 3 iş" bloğu herkes
için boş kalır ve hiçbir hata görünmez.**

**Sıra: önce bu düzeltilsin, sonra Job D armadılsın.**

**Aynı denetimden iki bağlam boşluğu daha:**
- **Hedef coğrafya** haftalık plana **hiç ulaşmıyor** — bugünkü ülke yükseltmesi
  yalnızca fırsat eşleştirmesindeydi, `StudentAdvisorContext`'e eklenmedi.
- **Kabul oranı bağlamı** (B7) yalnızca danışmana bağlı; haftalık plan onu hiç
  import etmiyor.
- **Beceriler** ulaşıyor (paylaşılan formatlayıcı üzerinden), doğrulandı.

---

## ⏸️ KONTROLLÜ MOLA — 4 Eylül akşamı (yeniden açıldığında önce bunu oku)

Kurucu limit dolduğu için filoyu durdurdu. **Dokuz şerit de düzenli durdu:** her
biri işini push etti, devir notu yazdı, `.next`'ini sildi. **Kayıp yok.**

**✅ SIRA TESTİ YAPILDI — üç paket de teslim edilebilir.**
`scripts/check-morning-packages-14-15-16-sequence.sh`: **14 → 15 → 16, tek
veritabanında, gerçek sırayla, iki koşu.** Temiz.

İki kesişim de ölçüldü:
- **0132'nin indeksi ile paket 16 aynı tabloya dokunmuyor** — paket 16 yalnızca
  `opportunities`'e yazıyor.
- **Edinburgh her iki pakette de geçiyor, ama sıra önemsiz:** iki koşu sonunda
  hayatta kalan satır hem doğru `country_eligibility_basis`'i hem paket 16'nın
  taşıdığı yaş/tarih verisini taşıyor; emekli satır `disabled` ve hiçbir öneri
  yüzeyinde okunmuyor.

**Ve bu test hazırlanırken DÖRDÜNCÜ bayatlama bulundu:**
`edinburgh-duplicate-row-parity-fix` **hiçbir pakette yoktu**, ama paket 16'nın
yorumu "zaten uygulandı" varsayıyordu — yani üç paket de çalıştırılsa o satır
**hiç dolmayacaktı.** Paket 15'e eklendi (0133'e bağımlı), sağlama listesine 9.
dosya olarak katıldı.

**Bugün dört kez bir yorum, artık doğru olmayan bir şey iddia etti.** Yorumlar
doğrulandıkları anın fotoğrafı; kod değişince onlar değişmiyor. Dört paketin
dördünde de artık SHA sağlaması var — bu sınıf kapandı.

**🔧 YENİDEN AÇILINCA İLK KOD İŞİ — tek satırlık, ve öğrencinin güvenine dokunuyor.**
`home-strip.ts:175` fırsatları **yalnızca `match_score`** ile sıralıyor, ikincil
anahtar yok. **2039 satırda sadece 21 farklı skor var**, ve 8 öğrencinin 7'sinde
5. sıradaki skor paylaşılıyor — en kötü vakada bir öğrencinin **tüm top-5'i, aynı
43 puana sahip 191 fırsattan** geliyor. SQL beraberlik sırasını garanti etmiyor.

**Şu an kararlı, ama tesadüfen:** tabloya bu oturum boyunca hiç yazma olmadı, o
yüzden index'in fiziksel sırası sabit kaldı. **Herhangi bir yazma** — o öğrenciyle
ilgisi olmayan bir satırı değiştiren rutin bir eşleşme tazelemesi bile — sıralamayı
sessizce değiştirebilir. Ve cron'lar açıldığında yazma başlayacak.

**Düzeltme muhtemelen tek satır:** ikincil sabit anahtar (`.order("id")`).
**Uygulanmadı** — mola talimatı geldiğinde bulgu yeni gelmişti; gate'siz tek satır
atmaktansa açık bırakıldı. Ayrıntı: `docs/home-strip-ranking-stability-2026-09-04.md`.

**Yeniden açıldığında sıra:**
1. **Kurucunun yedi maddesi aşağıda** — ilk üçü tek oturumda biter ve en çok onlar açar.
2. **`data/morning/14 → 15 → 16` paketleri hazır**, üçü de iki kez test edilmiş.
   **Eksik olan tek şey: üçünü ARDIŞIK çalıştıran sıra testi** — hiç yapılmadı,
   ve sabah kurucunun elinde patlayan hata tam olarak sıradan çıkmıştı.
3. **Dağıtım tablosu aşağıda** — her şeridin nerede kaldığı yazılı. Yeni oturuma
   madde numarası ver, dokümanı okusun.

**Molada geçerli iki kural (bugün ikisi de gerçek olay sonrası kondu):**
- **`git stash` şeritler arasında PAYLAŞILIYOR.** `pop`/`apply` asla index'siz;
  uzun saklama için dal. Bugün bir şeridin dosyaları başkasının worktree'sine
  uygulanmaya başladı, tesadüfen durdu.
- **Derleme yapan `.next`'ini siler.** Bugün disk iki kez doldu, ikincisinde
  tamamen — sebep dokuz worktree'de biriken ~2,5 GB derleme önbelleğiydi.

---

## DURUM — 4 Eylül, öğleden sonra (önce bunu oku)

**Sende bekleyen yedi şey. Hiçbiri şu an kimseyi durdurmuyor — hepsinin etrafından
çalışılıyor. İlk üçü tek oturumda biter ve en çok onlar açar.**

| | Ne | Neden sende | Ne açar |
| --- | --- | --- | --- |
| **A7** | **Paylaşılan tarayıcıyı QA öğrenci hesabıyla aç** | senin oturumun orada, şeritler bakamıyor | C3, mobil, giriş gerektiren her doğrulama |
| **A6** | **Cron'ları bir kez çalıştır** | canlı veriye yazma | kabul görünümleri, veri tazeleme, bildirimler |
| **—** | Disk: 1,7 GB'lık tek komut (aşağıda) | silme izni bende engellendi | 3,3 GB boş → ~5 GB |
| **—** | Paket 14'ü çalıştır | canlı veriye yazma | 0124/0126/0127 + üniversite ve fırsat verisi |
| **A3** | Ödeme sağlayıcısı | kod hazır olacak, seçim senin | B1'in son dosyası |
| **A5** | E-posta sağlayıcısı | altyapı **hiç yok** | otomatik veli e-postası (davet zaten çalışıyor) |
| **A2** | Şirket kaydı | unvan, sicil, adres, `privacy@` | yasal metinlerdeki dört boşluk |
| **A4** | Hukuki onay | araştırma bitti, öneri hazır | öğrenciye pazarlama e-postası |

```
rm -rf "/Users/adasarpkirik/Desktop/Founder/ORYN-wt-outlook-test-2026-09-04/node_modules" \
       "/Users/adasarpkirik/Desktop/Founder/ORYN-wt-b3c-parent-catalog-2026-09-04/node_modules"
```

**Bugün `main`'e giren:** tam ekran yükseltme kartı · veli uçtan uca doğrulama
(26 kontrol) · aylık veli özeti · danışman streaming (iki yarısı, 11 koruma tek
tek kanıtlı, zaman aşımı + `maxRetries:0`) · ücret tarihi etiketi · Oxford kabul
oranı · üniversite sayfalarında dürüst boş durumlar (301 sayfa) · üniversite
dolgusu 12/19 · fırsat dolgusu (görünür 34) · hukuk araştırması · onboarding
denetimi · ana ekran denetimi · dürüstlük ayrımları denetimi · yedi ayrı ölçüm.

**✅ VELİ ZİNCİRİ KAPANDI (`8976eaf2`) — ve bu sefer iddia etmeden önce ölçtüm.**
Kanıt, dördü de merge sonrası koşturuldu: (1) `app/parent/(dashboard)/universities/page.tsx`
ve `opportunities/page.tsx` katalog tarayıcılarını **gerçekten import ediyor**;
(2) sekiz veli rotasının hepsi `main`'de; (3) katalog tarayıcıları
`/parent/universities/${id}` ve `/parent/opportunities/${id}` — yani **veli
ad alanındaki** detay sayfalarına bağlıyor, öğrencininkine değil; (4) üretim
derlemesi sekiz `/parent/*` rotasını da derliyor. 422 dosya / **6293 test**.

**Aşağıdaki eski düzeltme tarihsel kayıt olarak duruyor — hatanın kendisi
silinmesin diye:**

**⚠️ CEO DÜZELTMESİ (artık geçersiz) — veli katalog erişimi HENÜZ ULAŞILABİLİR DEĞİL.** Kurucuya
"veli artık katalogu gezebiliyor" diye rapor ettim; **yanlıştı.** Katalog
tarayıcıları (B3c) ve detay sayfaları (B6) `main`'de, **ama hiçbir dosya onları
import etmiyor** ve `app/parent/` altında liste rotası yok — B3a `origin`'de bile
değil, bir şeridin yerel dalında. **Bileşen var demek, ulaşılabilir demek değil.**
Zincir B3a push edilip merge edilince tamamlanıyor: liste → katalog → detay.

**Bekleyen migration'lar:** 0124, 0126, 0127 (+ B1 bitince 0123, sonra 0129, 0130).
**Uygulanmadan güvenli olduklarını tek tek kontrol ettim** — hiçbiri hata vermez.

**Bugünün iki büyük bulgusu:**
1. **Ürünün temel iddiası ilk kez doğrulandı** — 5 gerçek hesapta, 10 gerçek "bunu
   yapma" kaydında: gerekçeler o öğrencinin gerçek verisine izlenebiliyor, jenerik
   değil. Ve 8 boyutu sıfır olan hesap **uydurma bir puan değil, dürüst bir cümle**
   görüyor.
2. **Zamanlanmış işlerin hiçbiri hiç çalışmamış** (A6) — bugün ölçtüğümüz veri
   boşluklarının bir kısmını doğrudan açıklıyor.

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

**A4. Hukuki cevap — girdi hazır, karar sende.**
`docs/minor-commercial-email-legal-2026-09-04.md`. Araştırma **kilidin yanlış
kapıda olduğunu** gösterdi: veli özeti, veli daveti ve son tarih hatırlatmaları
**pazarlama değil** — alıcı ya yetişkin, ya da mesaj hesabın zaten kullandığı bir
özelliğe bağlı. Gerçek kapı dar: **öğrenciye pazarlama e-postası.** Öneri: her
yerde 14+ kendi rızası, **Türkiye hariç** — Türk hukukunda net yaş eşiği yok
(vaka bazlı "ayırt etme gücü"), o yüzden bir Türk avukat teyit edene kadar veli
rızası. Beş madde avukata bırakıldı, uydurulmadı.

**A6. HİÇBİR ZAMANLANMIŞ İŞ BUGÜNE KADAR ÇALIŞMADI — yeni, ve büyük.**
`external_sync_jobs` canlıda tek tek kontrol edildi: **altı işin altısında sıfır
çalışma kaydı.** Fırsat keşfi, gereksinim keşfi, üniversite verisi senkronu, bayat
veri tespiti, bildirimler, kabul görünümü tazeleme — hiçbiri **bir kez bile**
dönmemiş. Tek istisna iki elle test (22 Ağustos).

**Bu, bugün ölçtüğümüz veri boşluklarının bir kısmını doğrudan açıklıyor:** veriyi
tazeleyecek mekanizma yazılmış, `vercel.json`'da kurulmuş, ama hiç çalışmamış.
En olası sebep dağıtımın yapılmamış olması (hiçbiri çalışmadığına göre).

**Kod hatası yok** — `isOutlookStale` hiç hesaplanmamış görünümü zaten maksimum
bayat sayıyor, tarayıcı null'ları dışlamıyor, cron tanımı doğru. **Eksik olan tek
şey işin bir kez çalışması.** Bu canlı veriye gerçek bir yazma — **kurucunun kendi
eliyle**; CEO da yapmıyor.

**A6 hakkında ikinci bulgu — cron'lar açılınca hatırlatmalar YİNE çalışmayacak.**
Son tarih hatırlatmaları **tam gün eşleşmesiyle** çalışıyor (30/14/7/3/1). Yani
**6 gün kalan bir başvuru için hiçbir zaman tetiklenmiyor**, iş her gün çalışsa
bile. Canlı kanıt: gerçek bir öğrencinin **Oxford erken başvurusu 10 Eylül**,
%0 hazırlık — ve sistem onu hiç uyarmayacak. Bir gün atlanırsa o eşik bir daha
asla gelmiyor.

**Sonuç: cron'ları açmak bildirim seli DEĞİL** (45 gün içinde son tarihi olan 5
öğrenciden bugün hiçbiri eşik gününde değil) — **seyrek ve kaçırılması kolay bir
kapsama.** Düzeltme yazılıyor: "tam o gün" yerine "eşiği geçti ve henüz
bildirilmedi", ve tekrarı önleyecek tablo (`deadline_notification_log`) **zaten
var, tamamen boş.**

**Cron'ları açmadan önce sorulan soru — CEO kontrolü, cevap: GÜVENLİ.**
Altı iş **hiç çalışmadı**, yani ilk çalışmaları canlı veriye karşı provasız olacak
— ve bugün elle araştırılmış verinin üzerine yazma riski gerçekti. Kontrol ettim:
- `sync-university-data` yalnızca **`DEFAULT_US_UNIVERSITIES`** listesini işliyor
  (Harvard, MIT, Stanford, Yale…). Bugün elle doldurulan Oxford, LSE, Bocconi,
  Rotterdam, Amsterdam, Boğaziçi **bu listede yok — dokunulmuyor.**
- Oxford'un satırı pakette **UPDATE** ile tamamlanıyor (ikinci satır açılmıyor),
  ve Oxford/Caltech güncellemeleri `admission_rate is null` gibi koşullarla
  korunuyor — tekrar çalıştırma mevcut değeri ezmiyor.

**Kalan tek pürüz (küçük, sahipsiz):** paketteki beş satır (LSE, Rotterdam, UvA,
Boğaziçi, Bocconi) `stat_year` **yazmıyor**. Pakete açık bir varlık kontrolü
eklendiği için paket güvenli, ama o satırlar `(university_id, stat_year)`
kısıtıyla **kalıcı olarak eşleşemez** — gelecekteki bir dolgu ya da ABD dışı bir
senkron onları çiftleyebilir. `stat_year` set edilmeli.

**Ve kılavuz zaten yazılmış: `docs/deployment.md`.** Sıralı, eksiksiz, ve kendi
açılış cümlesi bu teşhisi bu geceden önce koymuş: *"Proxola hiç dağıtılmadı… 22
Ağustos'tan beri hiçbir zamanlanmış iş çalışmadı."* Cron kurulumu (§6, `CRON_SECRET`
ve elle tetikleme komutu dahil) ve e-posta (§4, Supabase'in yerleşik e-postası
gerçek bir kayda teslim edemiyor, özel SMTP şart) zaten içinde. Bugün eklenen tek
şey ödeme satırı. **Yeni bir doküman yazılmadı — bu, bugün dördüncü kez "eksik"
sanılan şeyin yazılmış çıkması.**

**A7. Paylaşılan tarayıcıyı QA öğrenci hesabıyla aç — YENİ, ve bugünün en büyük
gizli maliyeti.** *"Elimde test hesabı yok"* cümlesi bugün **dört ayrı şeritten**
çıktı: karşılaştırma sayfası, veli sayfaları, öğrenci ana akışı, mobil kontroller.
Hepsi giriş gerektiren yüzeyler, ve paylaşılan panel **kurucunun kendi oturumunu**
taşıdığı için hiçbir şerit bakamıyor — kural gereği bakmamalı da.

Sonuç: şeritler kod okuma ve render testiyle idare ediyor. **Bugünün iki gerçek
hatası yalnızca sayfayı açan birinin görebileceği türdendi** (Oxford'un kendi
kendini çürüten kaynak rozeti; gizlenecek olan gerçek ücret kartı) — ikisi de
tesadüfen yakalandı.

**Çözüm ucuz:** paneli kendi hesabıyla değil **bir QA öğrenci hesabıyla** aç.
`.env.example`'da `QA_ACCOUNT_A_EMAIL`/`QA_ACCOUNT_B_EMAIL` **zaten var** — ihtiyaç
baştan öngörülmüş, hiç kurulmamış. Kimseyle parola paylaşmaya gerek yok: oturum
açık gelir, şeritler bakar, kurucunun kendi verisi risk altında olmaz.

**Bu tek adım C3'ü, mobil kontrolleri ve tüm giriş gerektiren yüzey
doğrulamalarını açar.**

**A5. E-posta sağlayıcısı seç — YENİ, ve A4'ten daha bağlayıcı.**
Aylık veli özeti yazıldı ve **hiçbir yere gönderilmiyor**: projede e-posta
altyapısı **hiç yok** (`package.json`'da sağlayıcı paketi yok, `.env.example`'da
mail değişkeni yok). Yani e-postayı hukuk değil, **altyapının yokluğu**
durduruyor. Sağlayıcı seçilince kesişim ödeme gibi sağlayıcıdan bağımsız yazılır.

**Ama kurucunun isteği e-postayı beklemiyor:** *"ayda bir AI özet versin"* için
e-posta şart değil — özet B3a'nın **gelişim** sayfasında gösterilecek. Üretim
kodu hazır (`ff95182f`), sadece çağrılıp render edilecek.

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

**B3. Veli hesabı — ✅ ÜÇÜ DE YAPILDI (4 Eylül). Şikâyet düzeltmeden ÖNCEYE ait.**
Kurucunun *"çok kapsamsız, ayrı sayfalar bile yok"* cümlesi plana **11:01**'de
girdi; B3a merge'i **14:43** — üç buçuk saat sonra. **Şikâyet eski, iş yapılmış.**
Zaman damgalarıyla doğrulandı, tahminle değil.
- **B3a ✅** `c70eb0ca` — `app/parent/(dashboard)/` altında dört gerçek rota
  (`opportunities/`, `universities/`, ikisi kendi `[id]` sayfasıyla, `applications/`,
  `progress/`), gerçek Supabase verisi, `ParentNav` beşini de bağlıyor. Dört sayfanın
  dördünde de **kendi bağlamına özgü** boş durum metni var, hiçbiri diğerini
  kopyalamıyor. `parent.*` anahtarları EN/TR tam senkron.
- **B3b ✅** `f656db2a` (kurucunun kendi commit'i) — haftalıktan aylığa çevrildi,
  30 günlük döngüsel pencere, boş ay için dürüst cümle, uydurma koruması.
  **Açık kalan tek şey: hiçbir cron'a bağlı değil** — çalışıyor, test edilmiş, ölü.
  Ve kurucu 5 Eylül'de şeklini değiştirdi: not artık geriye dönük özet değil,
  **ileriye dönük fırsat** olacak.
- **B3c ✅** B3a'nın `[id]` detay sayfalarıyla birlikte geldi.
- **B6 sınırı korunmuş:** `lib/parent/university-detail.ts` `refreshAdmissionOutlook`'u
  bilerek import etmiyor; `__tests__/parent/university-detail-read-safety.test.ts`
  bunu kanıtlıyor (4/4).

**Küçük temizlik, sahipsiz:** `origin/feat/parent-separate-pages-b3a-2026-09-04`
(v2'siz) hâlâ rebase öncesi `c774f901`'e işaret ediyor — ölü remote ref, iş kaybı
değil.

---

**B5. Ücret tarihi — ✅ BÜYÜK KISMI YAPILDI (`82a85d95`, 4 Eylül). Kalan: karşılaştırma sayfası.**
Üniversite detay sayfasında `SourceBadge`'e `asOf` eklendi ve tuition rozetine
bağlandı; veli tarafında ayrı bir satır olarak zaten gösteriliyor (`04aa5053`).
Canlı ölçüm bugün tekrar alındı: **296/296 dolu, sıfır boş** — sapma yok.
**Gerçek açık, ve tarif ettiğimden kötü:** karşılaştırma sayfasında tuition
satırının **hiçbir kaynak rozeti yok** — ne `asOf`, ne `checkedAt`, ne kaynak.
Aynı tablodaki `costOfAttendance`/`admissionRate` bir `statisticsSource` rozeti
paylaşıyor, `researchStrengths`'in kendi rozeti var; **tuition tek çıplak satır.**
Kartlarda hiçbir metriğin rozeti yok — bu bilinçli tasarım, açık sayılmıyor.
**Sahibi var, sürüyor.**

<details><summary>Özgün madde (artık geçersiz — "sahibi yok" yazıyordu)</summary>
`university_profile_metrics.stats_as_of` ve `notes` **var ama hiçbir uygulama
kodu okumuyor** — yani ürün her ücreti tarihsiz gösteriyor. Pekin Üniversitesi'nin
2026 harcı henüz yayınlanmadığı için 2025 rakamı yazılıyor; etiketi olmadan
öğrenci güncel sanır. Sorun tek üniversite değil, **tüm ücret gösterimi.**
Sorgudan geçir, rakamın yanında göster. Sahibi yok.
</details>

**B6. Veli için güvenli üniversite/fırsat detay sayfası — ERTELENDİ, bilerek.**
Öğrencinin `[id]` detay sayfası **bakan kişinin kendi profiline göre** kabul
görünümü hesaplayıp **yazıyor**, ayrıca "kaydet" düğmesi ve admin formu render
ediyor. Veliyi oraya bağlamak veli hesabının altına çöp satır yazardı. B3c bu
turda **satır içi açılım** yapıyor; gerçek detay sayfası ayrı bir karar.

---

## E — KURUCUNUN 5 EYLÜL İSTEKLERİ (kararlar verildi, sahibi aranıyor)

**E1. Başvuru sayfası 11. sınıfa bilgilendirme notu.** Kurucu: *"11. sınıf bir
öğrenci için application sayfası çok bir işe yaramaz."* Doğru — başvurular son
sınıfta açılıyor, o yüzden sayfa erken sınıflarda yapısal olarak boş.
**Karar: sınıfa duyarlı olacak, sabit bir uyarı değil.** Statik "yakında işinize
yarayacak" notu, sayfayı boş bırakmakla aynı işe yaramazlığa sahip.
- Öğrencinin `graduation_year`'ından hangi sınıfta olduğunu türet.
- Son sınıf **değilse**: bu sayfanın **ne zaman** işe yarayacağını söyle, ve
  **şu an ne yapılabileceğini** göster — bu, ürünün "ne yapmalıyım" sorusuna
  cevap verme sözünün ta kendisi. Boş bir tabloya "henüz başvuru yok" demek değil.
- Son sınıfsa: not hiç çıkmasın.
- **Uydurma yok:** "şu an şunu yap" cümlesi öğrencinin gerçek verisinden çıkmalı
  (açık fırsat, yaklaşan son tarih, eksik profil alanı) — genel tavsiye değil.

**E2. Öğrencinin kendi e-postasına doğrulama kodu.** Kurucu: *"çocuktan kendi
mailini alıyoruz ya, doğrulama kodu koysak çok iyi olur."*
**Karar: evet, ama ürünü kilitlemeden.**
- Kod e-posta **toplandığı anda** gider; doğrulanana kadar o e-posta **hiçbir
  şey için kullanılmaz** (veli bağlama, bildirim, kurtarma).
- **Ürünün geri kalanı engellenmez** — 16 yaşındaki biri doğrulama yüzünden
  onboarding'de takılmamalı. Doğrulanmamış e-posta = kullanılmayan e-posta,
  kilitli hesap değil.
- **Reşit olmayan kullanıcı kuralı geçerli:** bu **veri toplamayı genişletmez.**
  Zaten aldığımız e-postayı doğruluyoruz, yeni alan istemiyoruz.
- Kod süresi dolmalı, deneme sayısı sınırlı olmalı, ve **kod loglanmamalı.**
- Doğrulama durumu ekranda dürüst görünsün — "doğrulandı" ile "doğrulanmadı"
  farkı, kanıt sistemindeki `self_reported`/`verified` ayrımının aynısı.

---

## C — KALİTE / DOĞRULAMA

**C1. Veli uçtan uca doğrulama — ✅ TAMAM (4 Eylül).** 26 kontrol, hepsi geçti.
Ayrıntı aşağıda; tek açık kalan, plan script'indeki savepoint'siz B7.

**C2. Danışman akışı — ✅ KAPANDI.** Zaten kurulmuş ve merge edilmişti
(`b345e002`), plan onu "birkaç günlük iş" sanıyordu. 5 Eylül'de 11 korumanın
**hepsinin hâlâ yerinde** olduğu koda karşı doğrulandı. Ve gerçek bir açık
bulunup kapatıldı (`84cab58f`): `reader.read()`'in **kendisi reddettiğinde**
(gerçek ağ kopması) hata yakalanmıyordu — "düşünüyor" balonu sonsuza kadar
asılı kalıyor, hata görünmüyor, tek çare sayfa yenilemek. Düzeltme okuma
döngüsünün kendisine kondu, `submit()` ve `retry()` bedavaya aldı.

**C3. Öğrenci ana akışı — ✅ ZATEN YÜRÜNDÜ (4 Eylül, dört rapor).**
`c3-core-loop-handoff-trace`, `c3-onboarding-and-cross-discovery-seams`,
`c4-dashboard-content-audit`, `c6-knows-what-it-doesnt-know-audit`. "Tarayıcı
engeli" gerekçesi de bayat: C4 gerçek QA hesaplarını kullan-at bir route'tan
geçirerek engeli aşmış.
**Dağıtılmamış gerçek bulgular, sahibi aranıyor:** dashboard'da hedef üniversite
ve fırsat satırları **tıklanamıyor** (id elde var, `<Link>` yok) · fırsat
kaydetme `/dashboard`'ı revalidate etmiyor, üniversite kaydetme ediyor ·
onboarding'in `target_geographies` alanı toplanıyor, hiçbir yerde okunmuyor ·
5 gerçek hesabın 2'sinde hedef üniversite var ama outlook hiç hesaplanmamış
(yalnızca detay sayfası açılınca hesaplanıyor).
**İyi haber:** boş hesapta ana ekran dürüst ve sakin, çökme yok, güven
seviyeleri karışmıyor; profil gücü / tamamlanma / hazırlık / kabul olasılığı
dördü gerçekten ayrı.

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

## Dağıtım — 4 Eylül, 11:50 (CEO)

**Oturum başlığı, o oturumun ne yaptığının kanıtı değildir.** İlk dağıtımda
dokuz oturumun işini kenar çubuğu başlığından çıkardım; **dördü yanlıştı** ve
dördünü de oturumların kendisi düzeltti. Tablo artık kendi beyanlarına göre.

| Oturum | Madde | Durum |
| --- | --- | --- |
| ödeme kesişimini yazan | **B1** — **0123** | yürüyor |
| veli E2E + B7 düzeltmesini yapan | **B3c** — gerekirse **0125** | ölçüyor |
| locale shim + `/parent` route group | **B3a** — veli ayrı sayfalar | yürüyor |
| D3 + C1'i bitiren | **C2** — danışman streaming | yeni aldı |
| B3b'yi bitiren | **D4** — tekilleştirme, **0128** | yeni aldı |
| D2 dolgusu | **D2** + fırsat bayrakları **0126** | yürüyor |
| D1 dolgusu | **D1** — 19 kurum + tarihler, **0127** | yürüyor |
| B2'yi doğrulayıp kapatan | **A4'ün girdisi** — hukuk | yürüyor |
| CFO | filo gözetimi | yürüyor |

**Migration numaraları:** 0123 B1 · 0124 B2 ✅ · 0125 B3c · 0126 D2 bayrakları ·
0127 `admission_rate_basis`'e `not_published` · 0128 D4 · sıradaki **0129**.

---

## Bugün merge edilenler

**B2 — tam ekran yükseltme kartı (`599f9d97`).** Çarpı sağ üstte, dönen
özellikler, alevli logo, fiyat kumandadan, sahte ödeme ekranı yok. Yazan oturum
önce *var mı* diye baktı — vardı; yeniden yazmak yerine doğruladı ve iki gerçek
boşluk kapattı (commit'lenmiş kırık `node_modules` symlink'i, sıfır test).
CEO kontrolü: typecheck temiz, 413 dosya / 6177 test, lint 0 hata.

**C1 — veli uçtan uca (`ff95182f`).** İki oturum **paralel** koştu (CEO hatası:
kimin neyle meşgul olduğunu bilmeden dağıttım). Boşa gitmedi: biri B7 savepoint
boşluğunu bulup açık bıraktı, diğeri bulup düzeltti; sonra ilki mekanizmayı daha
doğru teşhis edip ayrıca düzeltti (`execute_sql` stop-on-error, çıplak savepoint
yetmiyor). Üç kayıt da merge edildi.

**B3b — veli özeti aylığa (`ff95182f`).** Cron olmadığı için "aylık" davranış
çağrılma sıklığına değil `last_commentary_sent_at`'e dayanıyor (30 günlük kayan
pencere). Yeni fonksiyon değil, `period` parametresi — mevcut çağıranlar aynen
duruyor. Merge sonrası: 413 dosya / **6190 test**.

---

## D3 — ✅ ölçüm tamam (`9abea707`)

**En boş tekil alan `university_deadlines`: %89,7** — ve mevcut "içerik yok"
kontrolünün hiç kapsamadığı bir eksen. Son başvuru tarihi öğrencinin en çok
işine yarayan veri. **D1 bu yüzden kalan 16 kurumda tarihleri de topluyor** —
zaten resmî kabul sayfasında, ikinci tur atmaktan ucuz.

## D4 — üniversite tekilleştirme (**0128**, sahibi var)

MIT ve HKUST ikişer satır, "UCL" ile "University College London" muhtemelen aynı
kurum. D3 beş satırı isim isim yazdı. **Boş kopyayı doldurmak iki kez zarar
verir.** D1 bu satırları atlıyor.

## Kurucuyu bekleyen migration'lar — HİÇBİRİ ACİL DEĞİL

Kod `main`'de, migration'lar canlıda **uygulanmadı.** Bugün sabah `/opportunities`
tam bu yüzden çöktü (kod uygulanmamış bir migration'ı varsaymıştı), o yüzden
ikisini de **elle kontrol ettim:**

| No | Ne | Uygulanmadan güvenli mi? |
| --- | --- | --- |
| 0123 | Ödeme tabloları | henüz yazılıyor |
| 0124 | Yükseltme kartı susturma sütunları | ✅ `select("*")` + `?? null` — çökmüyor |
| 0126 | Fırsat yaş/sınıf "şart yok" bayrakları | ✅ okuyan her sorgu `select("*")`, `?? false` |
| 0127 | `admission_rate_basis`'e `not_published` | ✅ yalnızca hazırlanan SQL kullanıyor |

**Yani acele yok.** Uygulanana kadar özellikler sadece varsayılan davranışı
gösterir; hiçbiri hata vermez.

**Paket 14 ve Paket 15 hazır, ikisi de iki kez çalıştırılmış.**
- **14** (`data/morning/14-toplu-paket-2026-09-04.sql`): 0124 + 0126 + 0127, artı
  üniversite dolgusu, Caltech tarihleri, hedeflenen 12'nin istatistikleri.
- **15** (`data/morning/15-toplu-paket-2026-09-04.sql`): 0129 + 0130 + 0132 + 0133,
  artı vatandaşlık notu temizliği, uygunluk sınıflandırması, ülke dolgusu,
  Waterloo/CEMC ayrımı.

**Sıra: önce 14, sonra 15.** İkisi arasında gerçek bir çelişki vardı ve kapatıldı:
14 bir fırsatı "kısıtlama yok doğrulandı" işaretliyordu, 15 aynı satırı daha sıkı
ölçütle yeniden sınıflandırıyor ama **boole'yi geri almıyordu** — ve şemada bunu
engelleyen bir kural yok, yani **hata vermeden** çelişkili durum kalacaktı.

**Ve düzeltmeyi yazan şerit, benim istediğim kontrolün yetersiz olduğunu buldu:**
0133'ün backfill'i her koşuda yeniden çalışıyor, dolayısıyla **ikinci koşuda**
durum çelişkili olmaktan çıkıp **sessizce yanlış** hâle geliyordu — çelişki arayan
bir kontrol bunu göremezdi. Kalıcı kontrol artık üç boyutta da bunu tarıyor.

**⚠️ Paket 14'ten SONRA merge edilen, hiçbir pakette OLMAYAN:**
- **0129** (fırsat yaş/sınıf üçüncü durumu) — `main`'de
- **0130** (veli aylık özet saklama) — `main`'de
- **0131** (ülke üçüncü durumu) ve **0132** (istatistik indeksi) — yolda

**Paket 15 gerekecek.** Bu satır, bu sabah tam olarak "paketi doğruladıktan sonra
dosyaya bir migration eklendi" hatasıyla yandığımız için burada duruyor:
**paketi kimin hazırlayacağı değil, neyin dışarıda kaldığı unutuluyor.**

## D2 sonucu bir ürün kararı doğurdu — 0129

**Öğrencinin gerçekten gördüğü 34 fırsat araştırıldı. 24'ünde resmî sayfa yaş/sınıf
şartını hiç söylemiyor.** Bu bir başarısızlık değil, yapısal gerçek — ve o 24 fırsat
bugünkü şemayla **sonsuza kadar "doğrulanmadı" uyarısı taşıyacak.**

**Öğrenci her fırsatta uyarı görürse, uyarıyı okumamayı öğrenir** — ve gerçekten
önemli olanı da kaçırır. Uyarının değeri, nadir olmasında.

**Karar: üçüncü durum ekleniyor (0129)**, bugün üniversite tarafında yapılanın
birebir aynısı (`admission_rate_basis` → `not_published`):
araştırılmadı · **bakıldı, sayfa belirtmiyor** ← yeni · bakıldı, şart yok yazıyor (0126).
Sütun eklenip bırakılmayacak: yeni durumda arayüz uyarı yerine sakin bir cümle
kuracak — *"resmî sayfa yaş şartı belirtmiyor, kontrol edildi (tarih)"*.

**İki veri hatası ayrıca bulundu:** AMC-AIME'nin `official_url`'i yanlış sayfaya
gidiyor (eksik alan değil, **yanlış veri** — öğrenci tıklıyor, başka yere düşüyor);
Waterloo/CEMC tek satırda birden çok yarışma taşıyor (Beaver 5-10. sınıf, Euclid
yalnız 12) — o satır bugün 10. sınıfa Euclid'i uygun gösteriyor. Bölünecek, ama
önce kimsenin kaydettiği/eşleştiği bir satır mı diye ölçülecek.

**Yeniden ölçüm (dolgudan sonra): %97 → %88 → %85** (0126 da uygulanırsa). **Az
hareket etmesi kararın gerekçesi:** kalan uyarılar doldurulabilir bir boşluktan
değil, **sayfanın hiçbir şey söylememesinden** geliyor. Bu sayıyı 0129 hareket
ettirecek, daha fazla dolgu değil.

**Görünmeyen 333 satıra dönülmeyecek** — bugün ürünü değiştirmiyorlar.

### Dolgu şeritleri için kalıcı kural (bugün iki kez ısırdı)

**Yazmadan hemen önce mevcut değeri tekrar oku.** Bir dolgu şeridi "doldurdum"
dediği değerin satırda **zaten aynen durduğunu** son anda yakaladı — kaynak mevcut
veriyi *doğrulamıştı*, boşluk doldurmamıştı, ve satırın **gerçek** eksiği (yaş, iki
alan da null) hiç ele alınmamıştı. **Hiçbir şeyi değiştirmeyen bir UPDATE, diff'te
gerçek bir dolgudan ayırt edilemez.** Aynı kontrol ikinci bir hatayı da yakaladı:
önerilen değer mevcuttan *farklıydı* — yani ekleme değil **düzeltme**, ve kurucu
ikisini farklı gözle okumalı. Birkaç adım önce alınmış liste, o adımlar sırasında
eskir.

## D7 — ✅ ÖLÇÜLDÜ, KOD YAZILMADI (bilinçli)

D1 dolgusunda çıktı: **Tokyo Üniversitesi'nde bizim 14-18 yaş kitlemiz için
İngilizce-öğretim lisans başvuru yolu yok** — PEAK son alımını Fall 2026'da
yaptı, diğer İngilizce program (GSC) yalnızca yurt dışında iki yıl okumuş
öğrenciler için transfer kabul ediyor.

**Ürün sonucu:** öğrenci böyle bir üniversiteyi hedef listesine ekleyebiliyor ve
ürün ona bir **kabul görünümü** hesaplıyor — başvurabileceği bir yol olmadığı
hâlde. Spesifikasyonun yasakladığı sahte kesinliğin tam örneği.

**Ölçüm sonucu işi durdurdu, ve doğrusu bu:** Tokyo'nun `target_universities`'de
**sıfır**, `university_programs`'ta **sıfır** satırı var — bugün hiçbir öğrenciyi
etkilemiyor. Gerçekten hedeflenen 12 üniversitenin hiçbiri bu şekilde değil, ve en
olası ikinci vaka (Kyoto) kontrol edildi: **açık bir yolu var.** Yani sıfır
öğrenciyi etkileyen, tek bir vaka.

**Karar (CEO): ne migration, ne tek girdili liste.** Tek satırlık bir liste, altı ay
sonra kimsenin güncellemediği bir bakım yüzeyidir. `international_eligible` ve
`discontinued` sütunlarının 17046 satırın **sıfırında** kullanılmış olması da bunu
destekliyor: **okunmayan sütun değil, hiç araştırılmamış boyut** — çözümü kod değil
araştırma.

**Kalıcı kural:** dolgu şeritleri böyle bir üniversiteye rastlarsa **dokümana
kaydeder.** Üç vaka birikince mekanizma kurulur — bağlanma noktası
(`refreshAdmissionOutlook`, `fieldAvailability`'nin yanı) ve hazır `not_applicable`
mekanizması (0049) `docs/d7-no-pathway-universities-findings-2026-09-04.md`'de
haritalanmış durumda, iş bir saatlik olacak.

## D4 eki — yeni kopya çifti, sahipsiz

"The University of Technology Sydney (UTS)" ve "University of Technology Sydney"
iki ayrı satır. MIT/HKUST/UCL ile aynı şekil. D4'ün kuralı geçerli: **isim
benzerliği yetmez**, en az iki bağımsız kanıt (resmî alan adı, şehir, kurum
kimliği). Kimse dokunmadı.

---

## C2 — ✅ TAMAM, ama "AI yavaş" ŞİKÂYETİ TAM KAPANMADI

**Ölçülmüş gerçek (2026-09-04, üretim kod yoluyla, 4 gerçek çağrı): ilk görünür
harf 19,9-57,8 saniye sonra düşüyor.** Model önce düşünüyor, ve o faz bitmeden
tek harf gelmiyor. Yani tipik bir çağrının **yaklaşık yarısı boyunca akışlı cevap
akışsız cevaptan ayırt edilemiyor.**

**CEO hatası, kayda geçsin:** kurucuya "artık ilk saniyede yazmaya başlıyor"
dedim — **ölçmediğim bir sayıydı.** Şerit gerçek ölçümü yapıp çürüttü ve kendi
dokümanındaki "1-2 saniye" tahminini de kendi bulup düzeltti
(`docs/advisor-latency-options-2026-09-04.md`, düzeltme bloğu olarak; eski cümle
duruyor ki neden yanlış olduğu görülsün).

**Dürüst iddia:** 20-58 saniyelik pencereyi taşıyan şey streaming değil, **ara
durum göstergesi** (sabahki iş). Streaming ondan sonrasını kazanıyor — cevap
yazılırken görünüyor, sonunda tek blok patlamıyor. **Kimse "streaming AI'ı
hızlandırdı" diye raporlamasın.**

**Düşünme bütçesini kısmak kapalı** — kurucunun kalite kararı, duruyor.

**Bekleme göstergesi hakkında karar (CEO, ölçümden sonra):** düşünme olayı gerçek
bir çağrıda **tam olarak metin başladığı anda, sıfır karakterle, bir kez** geliyor
— canlılık sinyali olarak işe yaramaz. **Ama canlılık sinyalimiz modelde değil,
bağlantıda.** Zamanlayıcıyla dönen gösterge kalıyor; dürüstlük iki şeyden gelecek:
(1) akış `done` gelmeden kapanır veya hata verirse gösterge **durur ve gerçek hata
görünür** — özellikle "hiç olay gelmeden kapandı" hâli doğrulanacak; (2) 300 sn'lik
tavanın **altında** bir zaman aşımı (ölçülen en kötü çağrı 58 sn).

**Açık düşünme modu (`thinking: {type:"enabled"}`) kovalanmayacak** — faturalı çağrı
+ gerçek yapılandırma değişikliği, kazancı en iyi ihtimalle daha hoş bir animasyon.
Açık soru olarak duruyor.



`73124976`: sağlayıcıya `generateTextStream`, `generateAdvisorReplyStream`, ve iki
Route Handler (`app/api/advisor/chat/route.ts`, `.../retry/route.ts`).

**Artık istemci de bağlı** (`b345e002`): `submit()`/`retry()` SSE üzerinden akıyor,
her parça mesaj balonuna canlı düşüyor. 11 korumanın her biri **kaynağı tek tek
bozularak** kırmızıya döndürüldü, sonra geri alındı — okuyarak değil, kırarak.
O sırada iki testin **kendisi** bozuk çıktı: aynı tabloya iki kez yazan bir rotada
ham `insert` sayacı yanlış insert'i sayıyordu, ve biri **gerçek dal tamamen
kapalıyken bile geçiyordu.**

**KARAR (CEO): `sendAdvisorMessage`/`retryAdvisorMessage` silinmeyecek.** Artık
çağrılmıyorlar ama **streaming yolu hiç gerçek tarayıcıda çalışmadı.** Ölçülmüş,
sertleştirilmiş, korumaları kanıtlanmış bir yolu, yerine geçen şey canlıda bir kez
bile denenmeden silmeyiz. Silme şartı: canlı doğrulama. **Kimse "ölü kod" diye
temizlemesin.**

Eski uyarı (tarihsel): uç noktalar bir süre ulaşılamaz duruyordu — Route
Handler'lar `sendAdvisorMessage`/`retryAdvisorMessage`'ın **11 korumasını elle
aynalıyor**, ve bu tam olarak bir korumanın sessizce eksik kalabileceği şekil.
Şu an güvenli olmasının tek sebebi ulaşılamaz olmaları. **İstemci `submit()`
bağlanmadan önce, her korumanın kırılıp yakalandığına dair ayrı kanıt
bekleniyor** — tercihen parite testiyle (aynı bozuk koşulu hem sunucu eylemine
hem Route Handler'a ver, aynı sonucu döndürsünler), çünkü o test listeyi ezbere
değil mevcut sunucu eylemine kilitler.

**Kimse bu uç noktaları erken bağlamasın.**

---

## D5 — son başvuru tarihleri: ölçüm tanımı değiştirdi

Global boşluk %89,7 ama **öğrencilerin gerçekten hedeflediği yerde neredeyse
sorun yok**: 12 farklı üniversite hedeflenmiş, yalnızca 1'i (Caltech) tamamen
boş. Ölçmeden doldursaydık kimsenin bakmadığı ~900 üniversiteye saatler
harcanacaktı.

**Asıl bulgu daha sinsi: MIT 10 kez hedeflenmiş ve tek satırı
`scholarship:undated`** — yani satır var, ama öğrencinin aradığı *başvuru*
tarihi yok. **"Kaç satır var" diye sayan her kontrol MIT'yi dolu sayar.**
D5 artık türe göre denetliyor, satır sayısına göre değil.

**Henüz kimseye verilmedi:** B5, B6, C3 (öğrenci ana akışı — paylaşılan tarayıcı
engeli).
