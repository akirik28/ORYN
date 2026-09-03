# `00-OKU-BENI.md` yeniden kontrol — 3 Eylül 2026, öğleye doğru

oryn-a7'nin isteği: belge 07:00'de bir kez denetlendi, ondan sonra founder adımları
uyguladı, oryn-a7 belgeyi tahminen on beş kez düzenledi — ama belge bütün gün canlı kaldı
ve kimse baştan sona bir daha okumadı. Her sayı canlı veriye karşı tekrar ölçüldü (bu
belgeyi yazarken, restart sonrası). Belgenin kendisine dokunulmadı — bulgular burada.

## Doğrulanan: hâlâ doğru, sayıları birebir tutuyor

| Belgenin iddiası | Canlı ölçüm | Durum |
|---|---|---|
| "hesabın 2 Eylül 22:18'den beri zaten admin" (adım 1) | `is_admin = true` | ✅ |
| `ultra_gift_expires_at` sütunu (adım 2, migration 0106) | var | ✅ |
| Kayıt açık / bakım kapalı / deneme 7 gün (adım 2'nin son iki migration'ı) | `signups_enabled=true, maintenance_mode=false, trial_period_days=7` | ✅ birebir |
| "kurum adı boş 197'den 6'ya" (adım 3) | 6 | ✅ birebir |
| "1.325'ten 1.535'e" (adım 5, üniversite gereksinimleri) | 1.535 | ✅ birebir |
| "Caltech'in 19 satırı... uzlaştırılmış 37 satırla değiştirildi" (adım 5) | 37 | ✅ birebir |
| "bugün katalog'a sıfır yeni kayıt girmiş" (adım 6, HENÜZ ÇALIŞMADI) | bugün oluşturulan fırsat: 0, son kayıt 2026-08-24 | ✅ hâlâ doğru — adım hâlâ çalışmadı |
| Maastricht kaydının kapatılması (adım 4) | "University of Maastricht, Netherlands" kaydı `disabled` | ✅ uygulandı |
| Google CSSI adresi düzeltmesi (adım 4) | `official_url` zaten `buildyourfuture.withgoogle.com/...` | ✅ uygulandı |
| `academic_tier` / `page_views` henüz canlıda yok (kararlar bölümü) | ikisi de `information_schema`'da yok | ✅ — henüz karar verilmedi, beklendiği gibi |

**"Kararlarını bekleyen yedi şey" bölümündeki sayılar** (eligible 128, cost, deadline,
corridor 481/1.019) ayrıca doğrulanmadı burada — aynı canlı kontrol bu sabah
`docs/kararlar-2026-09-03.md` yazılırken zaten yapıldı (eligible 128→**212**, deadline-boş
205→**272** — aktif havuz 282'den 366'ya büyüdüğü için, cost 258 sabit, corridor 1.019
değişmedi) — iki ayrı denetim aynı sonuca vardı, tekrar edilmedi.

## Bulunan tutarsızlık: adım 7b'nin "2 satır dokunulmadı" iddiası artık doğrulanamıyor

Belge şöyle diyor: *"başka bir hesapta aynı başlığı paylaşan 2 satır bulundu, ama metinleri
farklı... Dokunulmadı."* Canlı sorgu (`ai_recommendations`, başlık `%Oxbridge%` içeren her
satır, hesap ayrımı olmadan) **tam olarak 1 satır buluyor** — founder'ın kendi hesabında,
silme sonrası kalan "en erken gösterilen gerçek öneri." İkinci hesap, iddia edilen 2 satır
— hiçbiri yok.

Sebep araştırılmadı (bu denetimin kapsamı dışında) — ya iddia yazıldığı anda yanlıştı, ya da
o 2 satır sonradan başka bir işlemle silindi. Söylenebilecek tek şey: **belge şu an bu
noktada yanlış**, ve "98 kopya silindi, 2 gerçek öneri dokunulmadan kaldı" cümlesi düzeltme
istiyor.

## Yarım kalmış: Maastricht'in ikinci bir kaydı, üçüncü bir adresle

Belge Maastricht'i **tek bir kayıt** olarak anlatıyor — d0 kapattı, 6e farklı, gerçek bir
adres buldu (`maastrichtsummerschool.nl/courses/`), ikisi çelişmiyor ama sonuç farklı
("kapatmak mı, düzeltip tutmak mı — senin kararın").

Canlı veri **üç ayrı kayıt** gösteriyor:
- **"University of Maastricht, Netherlands"** — `disabled`. Bu d0'ın kapattığı kayıt.
- **"Maastricht Summer Program"** — `active`, adresi
  `maastricht.dreamapply.com/courses/search/id/48160-h41vq9`. **Ne d0'ın "bozuk" dediği
  kayıtla ne 6e'nin bulduğu `maastrichtsummerschool.nl` adresiyle eşleşiyor** — üçüncü bir
  URL.
- Google CSSI (yukarıda, ayrı konu, karıştırılmasın).

Bu iki ihtimalden biri: (a) "Maastricht Summer Program" zaten var olan, d0/6e tartışmasından
bağımsız, doğru bir kayıt — o zaman belgenin "kapat mı tut mu" sorusu zaten kendiliğinden
cevaplanmış (aktif, doğru başlıklı bir kayıt zaten katalogda). (b) ya da üçüncü bir adres
kimin tarafından, ne zaman yazıldığı bilinmeyen ayrı bir karışıklık. **Hangisi olduğunu bu
denetim çözmedi** — taze bir bakış gerekiyor, burada tahmin yürütülmedi.

## Yapı önerisi: bölüm bölüm ne yapılmalı

**1, 2, 3, 5 — tamamen uygulandı, sayılar birebir doğrulandı.** Bu adımların "nasıl
yapılır" ayrıntısı (SQL yapıştır, hangi sırada) artık founder'a bir talimat değil, bir
kayıt. Adım adım SQL bloklarını tutmaya gerek yok — sadece "uygulandı, doğrulandı" satırı
yeterli, geri kalanı geçmiş olarak okunmalı.

**6 — hâlâ tam canlı bir talimat.** Adım çalışmadı, altı komut hâlâ doğru, hâlâ bekliyor.
Dokunulmamalı.

**7 — koşullu, hâlâ doğru.** "Sadece deploy edeceksen" çerçevesi hâlâ geçerli.

**7b — düzeltme gerekiyor**, yukarıdaki bulgu.

**4 — kısmen kapandı, kısmen taze bakış istiyor.** Google CSSI cümlesi artık geçmiş zamana
alınabilir (uygulandı). Maastricht cümlesi yukarıdaki üçüncü-kayıt bulgusuyla güncellenmeli,
tekrarlanmamalı.

**"Kararını bekleyen yedi şey" bölümü — artık `docs/kararlar-2026-09-03.md` ile aynı
zemini kaplıyor, ve o belge daha yeni, daha kapsamlı (dokuz karar, canlı doğrulanmış,
maliyet sırasına göre).** İki ayrı yerde aynı kararların iki ayrı, zamanla birbirinden
uzaklaşacak listesi tutmak riskli — biri güncellenir öbürü unutulur. Öneri: bu bölüm
`00-OKU-BENI.md`'de kısa bir yönlendirmeye indirilsin ("güncel karar listesi:
`docs/kararlar-2026-09-03.md`"), ayrıntı orada kalsın. Karar oryn-a7'nin veya founder'ın —
burada sadece öneriliyor, uygulanmadı.

## Denetlenmeyen, bilerek

Adım 8 (panel karşılaştırması, `/admin` vs `/kumanda`) ve "Gece ne oldu" bölümündeki genel
anlatı (8 lane, 134 birleştirme, 5.604 test) — bunlar canlı veritabanı sayısı değil,
tarayıcıda görülecek ya da o anki gates çıktısına bakılacak şeyler; bu denetim veritabanı
sorgularıyla yapıldı, ikisine bakılmadı. Söylenmeden bırakılmadı.
