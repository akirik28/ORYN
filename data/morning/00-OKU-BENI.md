# Sabah — 3 Eylül 2026

Uyandığında sırayla bunlar. Tahmini süre: 10 dakika.

## 1. Kendini admin yap

Supabase SQL Editor:

```sql
RESET ROLE;
SET ROLE service_role;
UPDATE public.profiles SET is_admin = true
WHERE id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d';
RESET ROLE;
SELECT id, is_admin FROM public.profiles
WHERE id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d';
```

`is_admin` **true** dönmeli. `SET ROLE service_role` satırı şart — onsuz `UPDATE 1` der
ve hiçbir şey değiştirmez (`profiles_00_guard_protected_columns` trigger'ı geri alır,
canlıda doğrulandı).

## 2. Migration'ları uygula

`01-migrations-2026-09-03.sql` — tamamını yapıştır, çalıştır. **On iki migration**, tek
işlem içinde. Bir tanesi patlarsa hiçbiri uygulanmaz ve tekrar çalıştırmak güvenli.

Sıra kesintisiz. Bir ara 0101 eksikti — sahibi oturum push edemiyordu — ama engel kalktı
ve iş birleşti. **Yani sabaha bekleyen bir engel kalmadı.**

**Bu adım olmadan panelin yazma tarafı çalışmaz.** Ultra yapma, hediye etme, iş durdurma,
bütçe ayarlama — hepsi bu on iki migration'a bağlı. Panel bunları dürüstçe "kurulu değil"
diye gösterecek, ama iş görmeyecek.

## 3. Bekleyen veriyi doldur

`02-veri-doldurma-2026-09-03.sql` — **347 düzeltme ifadesi, 212 tekil kayıt.** En görünür
etkisi: kurum adı boş olan **190 kayıt dolacak**, ve 84 kayıt tek tek doğrulanmış haliyle
`under_review`'dan `active`'e geçecek — yani öğrencinin göreceği katalog büyüyecek.

Şu anki durum (2026-09-03 02:40, canlı ölçüm — **kapsam yazılı, çünkü kapsamsız sayı
karşılaştırılamıyor**):

| Kapsam | Kayıt | Kurum adı yok | Son tarih yok | Görsel yok |
|---|---|---|---|---|
| Hepsi | 421 | 197 | 339 | 356 |
| Sadece `active` | 282 | 66 | 205 | 218 |
| `active` + `under_review` | 394 | 172 | 314 | 330 |

Paket **190** kaydın kurum adını dolduruyor (hepsi hâlâ boş, tek tek doğrulandı). Toplamda
197 boş var. O 7 farkın ne olduğuna baktım ve beklediğim şey çıkmadı: **7'sinin de kurum
adı eksik değil, 7'si de geçerli fırsat kaydı değil.** İkisi dizin sayfası, biri üniversite
ders kataloğu kaydı, birinin başlığı harfiyen `"Time: 4:30pm – 5:30pm (Hong Kong time)"`.
İkisinin adresi bambaşka bir yere gidiyor (Google CSSI kaydı Northeastern Illinois'in lisans
sayfasına, Exeter kaydı bir akademisyenin profiline — doğru adres kaydın kendi açıklamasında
yazılı). Biri de kapanmış bir marka: Duke TIP artık Duke Pre-College, canlıda doğrulandı.

Ayrıntı: `docs/yedi-kapsanmayan-kayit-2026-09-03.md`. **SQL hazırlamadım** — kurum adı
doldurmak dördü için de yanlış düzeltme olurdu. Duke'un kimliğini değiştirmek senin kararın.

## 3b. Tek tek kayıt düzeltmeleri

`03-firsat-kayit-duzeltmeleri-2026-09-03.sql` — iki gerçek düzeltme. Google CSSI'nin adresi
(canlı doğrulandı: `g.co/cssi`, yalnızca Google'ın oluşturabileceği bir kısa link, oraya
yönleniyor) ve Maastricht kaydının kapatılması.

**Benim yazdığım bir varsayım burada çürüdü ve bunu bilmen daha iyi:** Exeter kaydı için
"doğru adres zaten kaydın kendi açıklamasında yazılı" demiştim. d0 o adresi çalıştırıp
kontrol etti — **404.** Bulunabilen diğer Exeter sayfaları da kaydın anlattığı şeye uymuyor
(biri üniversite öğrencileri için, diğeri ayrı markalı ve yalnızca fen alanında). Dosyanın
sonunda yorum satırı olarak duruyor, gerekçesiyle birlikte. Çalıştırıp çalıştırmamak sana
kalıyor. Duke TIP'e hâlâ dokunulmadı.

**Maastricht hakkında iki lane farklı sonuca vardı, ikisi de doğru olabilir.** d0 kaydı
kapattı: başlık bir kurum-ülke ifadesi, açıklama bir ders izlencesi parçası, adres üçüncü
taraf bir dizin — yani kayıt bozuk. Ama 6e saatler sonra, bambaşka bir iş sırasında,
**gerçek Maastricht Summer School adresini buldu**: `maastrichtsummerschool.nl/courses/`.
Yani program gerçek; bozuk olan bu kayıt. İkisi çelişmiyor ama sonuçları farklı: kapatmak
mı, yoksa kaydı düzeltip programı katalogda tutmak mı? Bu senin kararın, ve kapatma
geri alınabilir.

## 4. İki paneli karşılaştır

**`/admin`** — bugünkü hali. Ondört bölüm, tek sayfa. Bugüne kadar hiç gerçek admin
hesabıyla açılmadı; ilk açan sen olacaksın.

**`/kumanda`** — onayladığın tasarımın gerçek hali. Ayrı uygulama kabuğu, açık yeşil zemin,
kendi sol rayı, 12 bölüm. Şu an sadece iskelet: ray çalışıyor, tema çalışıyor, genel bakış
ekranı duruyor. İçerik bölümleri sıradaki adım — mevcut 14 bölüm buraya taşınacak, yeniden
yazılmayacak.

`/admin` yerinde duruyor ve çalışmaya devam ediyor. İkisini yan yana görüp karar ver:
`/kumanda` doğru yolsa `/admin`'i oraya yönlendiririz.

Not: ikisi de admin olmayana **404** veriyor, yönlendirme değil — panelin var olduğunu
bile belli etmiyor. Canlıda doğrulandı.

---

## Senin kararını bekleyen üç şey

**Max planı.** `docs/uc-katman-karari-2026-09-03.md`. Opus, Sonnet'in 1,67 katı; 400/800 TL
ikisi de maliyeti rahat karşılıyor. Karar ürün tarafında, sende.

**`eligible` alanı iki durumlu.** "Doğrulandı, uygun" ile "kimse bakmadı" ayrımını yapamıyor.
Katalogun %67'sinde yaş sınırı kayıtlı değil ve motor hepsine "uygun" diyor. Uyarı notu
eklendi, ama alanın kendisini düzeltmek panonu, danışmanı ve öneri sıralamasını birden
etkiler. Gece yarısı tek başıma karar vermedim.

**Maliyet alanı beş kademeli fiyatı tutamıyor.** Boston University Tanglewood'un gerçek
fiyatı araştırılmış ve biliniyor — 2 hafta $4.055'ten 8 hafta $10.205'e kadar. Ama `cost`
alanı tek bir sayı; beş kademe sığmıyor. Araştırmacı bilgiyi `current_cycle_label`'a
yazmış, yani hiçbir fiyat kontrolünün bakmadığı yere. Ayrıca aynı kavram için **iki ayrı
sütun** var: elle araştırma `financial_aid_available`'ı, otomatik çıkarım
`funding_available`'ı yazıyor — ikisi asla birlikte dolmuyor. İkisi de migration gerektiren
şema kararları, o yüzden sana bırakıldı.

**Fırsat görselleri ve lisans.** 282 kaydın 218'inde görsel yok, ve **128'inin kaynak
sayfasında zaten görsel yok** — daha çok taramak bunu çözmüyor. Üçüncü taraf görseli
sunmanın hukuki temeli açık değil; `LEGAL_REVIEW.md`'ye eklendi. Bu arada lisans gerektirmeyen,
kategoriye göre üretilmiş görseller yapılıyor.

---

## Gece ne oldu

8 lane, 13 dal birleşti, **5091 test yeşil.** Kumanda merkezi tasarımı iki kez elden geçti.

En ciddi bulgu: eşleştirme motoru, yaş sınırı kayıtlı olmayan 189 fırsata hiçbir uyarı
olmadan "uygun" diyordu — 14 yaşındaki biri için "21 yaş üstü" bir program ile gerçekten
doğrulanmış bir program aynı görünüyordu.

İkincisi: 611+ üniversite, arkasında hiç veri olmadan kendinden emin bir seçicilik etiketi
gösteriyordu. Açıklama notu eklendi.

Üçüncüsü, aynı şeklin en kötü hali: fırsatların %65'inde `cost` alanı boş — ama bu sayı
**gerçek araştırma eksiğini olduğundan büyük gösteriyor**, çünkü alan tek bir sayı tutuyor
ve kademeli fiyat oraya hiç yazılamıyor. Yani bazı fiyatlar biliniyor, sadece koyacak yer
yok. Asıl sorun şuydu: fiyatı
bilinmeyen bir program danışmana **ücretsiz olanla tamamen aynı** şekilde anlatılıyordu —
"bilinmiyor" diye bir durum yoktu. Yani yapay zekâ, parası olmayan bir öğrenciye on bin
dolarlık bir programı, bedava olduğunu ima ederek önerebilirdi. Düzeltiliyor.

Dördüncüsü: bir tablo var mı diye bakan kontrol, tablo yokken de "var" diyordu
(PostgREST'in HEAD isteğinde 204 dönmesi). Yani "kurulu değil" uyarısı hiç çıkmıyordu ve
gerçek veriye yazan bir buton açık kalıyordu.

Beşincisi: aynı "bilinmeyen ücretsiz gibi görünüyor" deseni üniversite tarafında da var,
ama farklı biçimde — orası zaten daha iyi kurulmuş (yerel/uluslararası ücret ayrımı doğru,
para birimi doğru, "Bilinmiyor" etiketi detay sayfasında zaten vardı). Sorun kapsam ve
erişimdi: `cost_of_attendance` sadece ABD'de var (127/131), 888 ABD-dışı üniversitenin
**hiçbirinde** yok. Ama `university_profile_metrics`'te 173 ABD-dışı üniversitenin gerçek
yerel/uluslararası ücreti zaten kayıtlıydı — Almanya, İngiltere, Fransa, Hollanda dahil —
ve bu veri bugüne kadar sadece detay sayfasına ulaşıyordu; keşfet kartına ve karşılaştırma
sayfasına hiç ulaşmıyordu, ikisi de bu gece düzeltildi. Danışman ve haftalık plan tarafına
hâlâ hiç ücret bilgisi gitmiyor — bu ayrı ve kasıtlı olarak bu gece yapılmadı, çünkü
öğrenci bazında yapay zekânın ne düşündüğünü değiştiren bir karar, bir yan etki olarak
değil bilinçli olarak alınmalı.

**Ve senin kendi örneğin, tam sıfır:** Türkiye'deki 12 üniversitenin sıfırında —
`cost_of_attendance`'ta da, `university_profile_metrics`'teki ücret kayıtlarında da — hiç
ücret bilgisi yok. Küçük bir sayı ama düşük bir oran değil, tam bir sıfır. Düzeltmedim; 12
Türk üniversitesinin gerçek ücretini bulmak ayrı bir araştırma paketi, bu gecenin işi
değildi, ama bilmen gerekiyordu.
