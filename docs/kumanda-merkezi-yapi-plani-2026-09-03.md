# Kumanda merkezi — yapı planı

**Durum: onaylanmış tasarım, kodlanmayı bekliyor.** Founder prototipi gördü ve onayladı
("çok güzel olmuş"), ardından dört ek istedi — hepsi prototipte karşılandı. Bu doküman
prototipi gerçek koda çevirecek lane'in brief'i.

Prototip: bu oturumun artifact'i (Oryn Kumanda Merkezi). Kaynak scratchpad'de.

## Founder ne istedi (kendi sözleriyle)

> "sen bana rapor tarzı bir şey yapıyorsun ben böyle daha özellikli özetli bana yönetmedi
> çok çok yardımcı olacak bir sayfa mesela istediğimi ultra yapıyım basıp bir tuşa"

> "bu bir sayfa olmayayacak uygulama yönetme uygulaması olacak"

> "arka plan açık yeşil olacak şimdi sol barda bambaşka şeyler olacak olabildiğince
> detaylı tasarla ama karıştırma yani her şeyi üst üste yığma"

> "uygulamayı kaç kişi izlemiş falan her şey orda olmalı hani mesajlar ve post özellikleri
> eklenince de uyum sağlayabilmeli"

> "araştırmalar falan api üzerinden değil claude code uygulaması üzerinden yapılacak
> öbür türlü pahalı gelir"

## Bugünkü sorun

`app/(app)/admin/page.tsx` tek sayfa, 14 bölüm alt alta, her biri kendi Suspense'inde.
Founder'ın "her şeyi üst üste yığma" şikâyeti birebir bu.

Ayrıca `app/(app)/admin/` öğrenci kabuğunun içinde — aynı sol menü, aynı tema. Founder
ayrı bir uygulama istiyor.

## Yapı

Yeni route grubu: `app/(admin)/` — `app/(app)/` kabuğundan tamamen ayrı, kendi
`layout.tsx`'i, kendi sol rayı, kendi teması.

12 bölüm, her biri kendi route'u:

| Route | İçerik | Bugün nerede |
|---|---|---|
| `/admin` | Genel bakış — sadece karar bekleyen 3 şey + 4 kart | yeni |
| `/admin/kar-zarar` | Fiyat (TL), kur, abone sayısı, başabaş hesabı | yeni |
| `/admin/trafik` | Ziyaretçi, kayıt, ürün olayları | yeni |
| `/admin/ogrenciler` | user-list + plan-tier + kota sıfırlama + **1 hafta hediye** | var, taşınacak |
| `/admin/harcama` | spend-summary, spend-per-user, remaining-credit, budget-warnings, ai-feature-shape, job-budget | var, taşınacak |
| `/admin/katalog` | opportunities + moderation list + temizlik önizleme | var, taşınacak |
| `/admin/arastirma` | İş kuyruğu — **Claude Code çalıştırır, uygulama API çağırmaz** | yeni |
| `/admin/topluluk` | Mesaj/gönderi — özellik açılınca dolacak | yeni, boş |
| `/admin/moderasyon` | reports-section | var, taşınacak |
| `/admin/sistem` | provider-health + scheduled-jobs + degrade-standing | var, taşınacak |
| `/admin/defter` | Birleşik etkinlik zaman çizelgesi | var (oryn-31), taşınacak |
| `/admin/ayarlar` | Yeni kayıt, bakım modu, deneme süresi, AI tavanı, fiyat | yeni |

**Bölüm bileşenleri yeniden yazılmayacak.** `features/admin/sections/*` olduğu gibi kalır;
değişen sadece hangi route'un hangilerini render ettiği. Bu, taşımayı tersine çevrilebilir
tutar ve 14 bölümün test kapsamını korur.

## Tema

`[data-surface="admin"]` zaten var ve yeşil. Prototipin paleti onun üstüne kurulmalı,
yanına ayrı bir sistem olarak değil.

- Zemin: açık yeşil (`--ground`), koyu modda koyu yeşil
- Sol ray: koyu yeşil, açık zeminle kontrast
- Vurgu: mevcut `--admin-accent`
- **Alev degradesi sadece Ultra rozetlerinde** — admin kromu asla alev kullanmaz

## Sol ray

- 246px, sabit, kendi kaydırma alanı (`overflow-y:auto`, `max-height:100svh`)
  — prototipte 12 madde 860px ekranda taşıyordu, sonuncusu görünmüyordu
- Üç grup: Günlük / İçerik / Altyapı
- Her maddede bölümün kendi işini anlatan ikon
- Rozetler: gerçek sayılar, sıfırsa gösterme

## Üç zor kural

**1. Yok olan sayı `0` yazmaz.** Trafik ekranında ziyaretçi hanesi `—`. Sıfır "kimse
gelmedi" demek; gerçek şu ki sayan bir şey yok. Bu ayrım bu gece üç ayrı yerde hataya yol
açtı, dördüncüsü olmasın.

**2. Yıkıcı olan yıkıcı görünür.** Fırsat kapatma kırmızı ve gerekçe ister; plan değiştirme
düz. `post-removal-control.tsx` bu ayrımı zaten kuruyor.

**3. Migration uygulanmamışsa ekran bunu söyler, düğme kapanır.** `admin_actions` için
`isAdminActionsTableLive()` bunu zaten yapıyor — ama `head:true` ile yazılmış her tablo
varlık kontrolü **yalan söyler** (eksik tabloda 204 döner, PGRST205 değil). Yeni kontrol
yazarken `.select().limit(1)` kullan.

## Araştırma bölümü

Founder'ın açık talimatı: araştırma uygulamanın içinden AI API'si çağırmaz. Bu ekran bir
**kuyruk**: iş tanımlanır, Claude Code oturumu çalıştırır, sonuç buraya döner, founder
onaylar. Uygulama kodu araştırma için hiçbir sağlayıcıya para ödemez.

Bugün bu akış insan eliyle yürüyor (entegratör dağıtıyor, lane çalışıyor, SQL hazırlanıyor).
Ekran o akışı görünür kılar; otomatikleştirmez.

## Sıra

1. Route grubu + layout + tema + sol ray (görsel iskelet, mevcut bölümler taşınmadan)
2. Mevcut 14 bölümü route'lara dağıt
3. Yeni ekranlar: Genel Bakış, Kâr & Zarar, Ayarlar
4. Trafik ve Topluluk (bugün ikisi de boş veri gösterecek — dürüstçe)

Her adım kendi başına birleştirilebilir olmalı. `app/(app)/admin/` bir yönlendirmeye
dönüşene kadar çalışmaya devam etsin.

## Çakışma uyarısı

`app/(app)/admin/actions.ts` bu gece **dört** merge çakışması üretti, ikisi fonksiyon
ortasından geçen sınırlar yüzünden. Server action'lar taşınmıyorsa dosyayı hiç açma.
Taşınacaksa tek bir pakette taşı, başka değişiklikle karıştırma.
