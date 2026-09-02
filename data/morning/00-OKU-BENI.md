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

`01-migrations-2026-09-03.sql` — tamamını yapıştır, çalıştır. Dokuz migration, tek işlem
içinde. Bir tanesi patlarsa hiçbiri uygulanmaz ve tekrar çalıştırmak güvenli.

**Bu adım olmadan panelin yazma tarafı çalışmaz.** Ultra yapma, hediye etme, iş durdurma,
bütçe ayarlama — hepsi bu dokuz migration'a bağlı. Panel bunları dürüstçe "kurulu değil"
diye gösterecek, ama iş görmeyecek.

## 3. Bekleyen veriyi doldur

`02-veri-doldurma-2026-09-03.sql` — 254 satır düzeltme. En görünür etkisi: **kurum adı
boş olan 190 kayıt dolacak.**

Şu anki durum (2026-09-03 02:40, canlı ölçüm — **kapsam yazılı, çünkü kapsamsız sayı
karşılaştırılamıyor**):

| Kapsam | Kayıt | Kurum adı yok | Son tarih yok | Görsel yok |
|---|---|---|---|---|
| Hepsi | 421 | 197 | 339 | 356 |
| Sadece `active` | 282 | 66 | 205 | 218 |
| `active` + `under_review` | 394 | 172 | 314 | 330 |

Paket **190** kaydın kurum adını dolduruyor (hepsi hâlâ boş, tek tek doğrulandı). Toplamda
197 boş var — yani **7 kayıt hiçbir araştırma paketinde yok.** Küçük ama gerçek bir boşluk,
kimse üstünde çalışmıyor.

## 4. /admin adresine gir

Ondört bölüm bugüne kadar hiç gerçek admin hesabıyla açılmadı. İlk açan sen olacaksın.
Gördüklerini söyle.

---

## Senin kararını bekleyen üç şey

**Max planı.** `docs/uc-katman-karari-2026-09-03.md`. Opus, Sonnet'in 1,67 katı; 400/800 TL
ikisi de maliyeti rahat karşılıyor. Karar ürün tarafında, sende.

**`eligible` alanı iki durumlu.** "Doğrulandı, uygun" ile "kimse bakmadı" ayrımını yapamıyor.
Katalogun %67'sinde yaş sınırı kayıtlı değil ve motor hepsine "uygun" diyor. Uyarı notu
eklendi, ama alanın kendisini düzeltmek panonu, danışmanı ve öneri sıralamasını birden
etkiler. Gece yarısı tek başıma karar vermedim.

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

Üçüncüsü: bir tablo var mı diye bakan kontrol, tablo yokken de "var" diyordu
(PostgREST'in HEAD isteğinde 204 dönmesi). Yani "kurulu değil" uyarısı hiç çıkmıyordu ve
gerçek veriye yazan bir buton açık kalıyordu.
