# Hiçbir araştırma paketinde olmayan 7 kayıt

**Nasıl bulundu:** `data/morning/02-veri-doldurma` 190 kaydın kurum adını dolduruyor, ama
canlıda 197 kayıtta kurum adı boş. Farkı oryn-bb'nin bir sayı uyuşmazlığını sorgulaması
ortaya çıkardı — iki oturum aynı şeyi farklı kapsamla saydı ve fark açıklanmak zorunda kaldı.

**Bulgu, beklediğimden farklı çıktı: bu 7'sinin kurum adı eksik değil — 7'si de geçerli
birer fırsat kaydı değil.** Kurum adı doldurulamamış, çünkü kayıt tek bir kuruma ait değil.
Hiçbir araştırma paketinin kapsamamasının sebebi de bu.

## Sorgu

```sql
select left(id::text,8), status, category, title, official_url, left(description,90)
from public.opportunities
where organization is null or btrim(organization) = '';
```
Canlı `qtcvcflzxbuagvvwahhu`, 2026-09-03, salt okunur. 197 satır; aşağıdaki 7'si
`data/research/opportunities/organization_*.sql` dosyalarının hiçbirinde geçmiyor.

## Öğrenciye şu an görünen: 1 kayıt

**`14db7109` — "University of Maastricht, Netherlands"** · `status = active`

Başlık bir kurum-ülke ifadesi, fırsat adı değil. Açıklama bir ders izlencesi parçası
("Introduction to Data Science | Prerequisites: | • Familiarity with datasets (e.g., in
Exce"). `official_url` Maastricht'e değil, `summerschoolsineurope.eu` adlı bir dizin
sitesine gidiyor.

Bu kayıt şu anda tarama listesinde ve öğrenci tıklarsa Maastricht'in kendi sayfasına değil
üçüncü taraf bir dizine düşüyor. **oryn-d0'ın kuyruğunda ayrıca duruyor** (oryn-6e'nin
`under_review` denetiminde işaretlenmişti) — burada tekrar edilmiyor, sadece aktif oluşuyla
en acili olduğu için not ediliyor.

## Yanlış adrese giden: 2 kayıt

**`1da5f8df` — "Google Computer Science Institute"** · `under_review`
`official_url` → `neiu.edu/academics/programs/computer-science-bs`
Northeastern Illinois University'nin lisans programı sayfası. Google CSSI ile ilgisi yok.

**`9b013735` — "University of Exeter, United Kingdom"** · `under_review`
`official_url` → `experts.exeter.ac.uk/35701-fatima-naveed`
Bir akademisyenin kişisel profil sayfası. **Doğru adres kaydın kendi açıklamasında yazılı**
(`www.exeter.ac.uk/preunisummerschool`) — yani bilgi vardı, yanlış alana yazılmış.

Bu ikisi `under_review` olduğu için öğrenciye görünmüyor. Ama şu an tek yönlü kapının
arkasındalar ve kapı bir gün açılırsa yanlış adresleriyle birlikte açılırlar.

## Süresi geçmiş marka: 1 kayıt

**`0ad4ccae` — "Duke University Talent Identification Program 2024"** · `under_review`

Canlı kontrol edildi: `tip.duke.edu` artık `provost.duke.edu` üzerindeki **"Duke Pre-College
Programs"** sayfasına yönleniyor. Duke TIP markası bu adreste artık yok. Kayıt hem eski
markayı hem 2024 yılını taşıyor.

Program *ölmedi* — halefi var ve gerçek. Bu bir silme değil, bir güncelleme işi: başlık,
kurum ve adres Duke Pre-College'a taşınmalı. **Kararı founder'a bırakıyorum**, çünkü bir
kaydın kimliğini değiştirmek onu farklı bir şey yapmaktır, alan doldurmak değil.

## Zaten doğru şekilde kapatılmış: 3 kayıt

Üçü de `status = disabled`, yani öğrenciye görünmüyor. Kurum adlarının boş olması bir
eksiklik değil — hiçbiri bir kuruma ait tek bir fırsat değil:

| id | Ne olduğu |
|---|---|
| `7aa517a3` | UCSC ders kataloğu kaydı ("ECON 1 - 01 Introductory Microeconomics"). Bir ders, fırsat değil. |
| `b10444c7` | "Summer Programs in the Netherlands - 2025" — bir dizin sayfası. Açıklaması bunu kendisi söylüyor: *"Should be examined in each link, not all of th..."* |
| `910ec94d` | Başlığı harfiyen `"Time: 4:30pm – 5:30pm (Hong Kong time)"`. Bir webinar duyurusundan kopmuş satır. |

Bunlar için yapılacak bir şey yok. Doğru sonuç zaten uygulanmış.

## Ne yapılmalı

Hiçbir SQL hazırlanmadı, bilerek.

Kurum adı doldurmak dördü için de yanlış düzeltme olurdu: Maastricht ve dizin kayıtları
için doldurulacak tek kurum yok, iki yanlış adresli kayıt için asıl sorun adres, Duke için
ise sorun kimliğin kendisi.

1. **`14db7109`** — aktif olduğu için önce bu. d0'ın kuyruğunda; ya Maastricht'in kendi
   sayfasına düzeltilmeli ya da kapatılmalı.
2. **`1da5f8df`, `9b013735`** — `official_url` düzeltmesi. Exeter'inki kaydın kendi
   açıklamasında yazılı; Google CSSI için resmî sayfa araştırılmalı.
3. **`0ad4ccae`** — Duke Pre-College'a taşınsın mı? Founder kararı.
4. Kalan 3 — dokunulmayacak.

## Bundan çıkan genel ders

Bir tabloda "boş alan" saymak, o alanın **doldurulabilir** olduğunu varsayar. Bu 7 örnekte
boşluk eksik araştırmanın değil, kaydın yanlış şeyi temsil etmesinin sonucuydu. Bir alanı
doldurmadan önce, o alanın o satır için anlamlı olup olmadığına bakmak gerekiyor — yoksa
"kapsama %100" gösteren ama içi yanlış olan bir tablo elde edilir.
