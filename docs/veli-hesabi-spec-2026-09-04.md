# Veli hesabı — spesifikasyon (4 Eylül 2026)

Kurucunun kendi cümleleriyle verdiği özellik, artı benim verdiğim tasarım kararları.
**Kararlar açıkça işaretlendi** — hangisi onun, hangisi benim, karışmasın.

---

## 1. Kurucunun söyledikleri (birebir, yorumsuz)

> velilere hitab etmek istiyorum dolayısıyla bir veli hesabı sistemi açıcaz veli hesabı bir karar
> veremeyecek sadece çocuğuna en uygun opportunity ve ünileri görecek çocuğunun en son
> başvurduğu şeyleri görecek durumunu ve neleri geliştirilmeli onu görecek ama velilerin farklı
> girişi olacak dolayısıyla bu akşam onu da kahverengi temada oluşturmanı istiyorum normalde
> sadece görsünler hiç ai özelliği olmasın ama aiın her hafta çocuklarının gelişimini
> yorumlaması için premium almaları gereksin veli hesabı çocuk hesabı gerektirir ama her çocuk
> hesabı veli hesabı gerektirmez bununla birlikte premium 2si için ortak alınır falan ana
> sayfada artık sign in yerine student sign in olmalı yani özetleme mekanizmasını kur ai
> opportunity önersin ve yeni şeylere odaklansın o hafta olan bununla birlikte veliye de mail
> atıcaz veli hesapları sadece gözlemleyebilmeli asla ama asla bir şey değiştirememesi lazım
> ödeme iki hesap tarafından da yapılabiliyor bununla birlikte olacak loginlerde çocukların veli
> maillerini almamız değer kazanıyor böylece o maile veli hesabı açmak ister misiniz maili
> göndeririz falan pop outlar burda da olsun ve sadece veli değil öğrenci premium özelliklerini
> de anlatsın veliler oğullarını düşünür

---

## 2. Gereksinimler, maddelenmiş

| # | Gereksinim | Kaynak |
|---|---|---|
| G1 | Veli hesabı **hiçbir şeyi değiştiremez** — "asla ama asla" | kurucu |
| G2 | Veli şunları görür: çocuğuna uygun **fırsatlar**, **üniversiteler**, **son başvurular**, **durum**, **neyi geliştirmeli** | kurucu |
| G3 | Velinin **ayrı girişi** var | kurucu |
| G4 | **Kahverengi tema** | kurucu |
| G5 | Varsayılan olarak **hiç AI yok** | kurucu |
| G6 | **Premium**: AI'ın haftalık gelişim yorumu | kurucu |
| G7 | Veli hesabı çocuk hesabı **gerektirir**; çocuk hesabı veli **gerektirmez** | kurucu |
| G8 | Premium **ikisi için ortak** alınır | kurucu |
| G9 | Ödemeyi **iki hesap da** yapabilir | kurucu |
| G10 | Ana sayfada `Sign in` → **`Student sign in`** | kurucu |
| G11 | Veliye **haftalık mail** | kurucu |
| G12 | Öğrenci kaydında **veli e-postası** toplanır | kurucu |
| G13 | O adrese **"veli hesabı açmak ister misiniz"** maili | kurucu |
| G14 | Veli tarafında da **yükseltme pop-up'ları**, ve **öğrenci premium özelliklerini de** anlatsın | kurucu |
| G15 | Haftalık özet **o hafta yeni olana** odaklansın | kurucu |

---

## 3. Benim kararlarım — gerekçeleriyle

Kurucu "karar sorma, karar ver" dedi. Aşağıdakiler benim; itiraz ederse değişir.

### K1 — Veli neyi GÖRMEZ

G2 ne görüleceğini sayıyor. Görülmeyecekleri saymıyor, ve bu boşluk doldurulmalı:

**Veli görmez:** danışman sohbetleri, öğrencinin kendi refleksiyon notları, `advisor_instructions`
(özelleşme talimatları), kanıt dosyalarının içeriği, geri bildirim formuna yazdıkları.

**Gerekçe:** 14–18 yaş bir öğrenci danışmana *"ailem tıp için baskı yapıyor"* yazabiliyor —
bu gece o senaryoyu ölçtük ve danışman doğru davranıyor. **O konuşmanın velinin gözü önünde
olduğunu bilen bir öğrenci onu hiç yazmaz.** Ürünün en değerli yüzeyi, gizli olduğu için değerli.

**Bu, G1'in ruhuna da uygun:** veli gözlemci, denetçi değil.

### K2 — Salt-okunurluk arayüzde değil veritabanında

Butonu gizlemek yeterli değil. **RLS politikası seviyesinde**: veli rolü bağlı çocuğunun
satırlarında `SELECT` alır, `INSERT`/`UPDATE`/`DELETE` **almaz**. Arayüz sadece ikinci savunma
hattı.

**Gerekçe:** "asla ama asla" bir arayüz sözü değil, bir yetki sözü. Bu depo bu gece bir kuralın
sadece koda yazıldığında nasıl sessizce delindiğini üç kez gördü.

### K3 — Bağlantı çift onaylı

Öğrenci veli e-postasını girer → o adrese davet → veli hesabı açar → **öğrenci onaylayana kadar
`pending`**, veri akmaz.

**Gerekçe:** yalnızca e-posta girmek yeterli olsaydı, bir e-posta yazım hatası yabancı birine
çocuğun profilini açardı. Ve öğrencinin rızası olmadan veli erişimi, aşağıdaki hukuki sorunun
tam ortasında.

### K4 — Premium tek abonelik, iki hesap

Abonelik **öğrenci hesabına** bağlanır; bağlı veli onun tier'ını miras alır. Ödeme sayfası
ikisinde de var, ikisi de ödeyebilir (G9), ama **kayıt tek**.

**Gerekçe:** iki ayrı abonelik iki ayrı kota, iki ayrı fatura ve "hangimiz ödedik" karmaşası
demek. Tek kayıt, iki giriş noktası.

### K5 — Kahverengi tema mevcut tier mekanizmasını kullanır

Ultra'nın alev teması `data-tier="ultra"` ile çalışıyor. Veli teması `data-role="parent"` ile
aynı şekilde. **Yeni bir tema sistemi kurulmuyor.**

### K6 — E-posta altyapısı hâlâ hukuki cevaba bağlı

G11 ve G13 e-posta gönderimi istiyor. **Haftalık öğrenci özeti bu gece bilerek kapalı** —
reşit olmayan kullanıcıya ticari e-posta izni babadan gelecek cevaba bağlı. **Veli e-postası
farklı: veli yetişkin.** Ama davet maili öğrencinin verdiği bir adrese gidiyor, yani yine
öğrencinin verisi.

**Karar: altyapı kurulur, gönderim kapalı kalır**, aynı `digest` deseniyle. Cevap gelince tek
anahtar.

---

## 4. ⚠️ Kurucuya açık soru — hukuki, ve bu özelliğin kalbinde

**Reşit olmayan bir öğrencinin verisine velisinin erişmesi, öğrencinin kendi hesabından ayrı bir
rıza sorusu.** Babasına giden dosyadaki soru "küçük kendi başına bağlanabilir mi" idi. Bu yeni
soru: **"veli, çocuğunun kaydını görebilir mi, ve bunun için kimin onayı gerekir?"**

İki uç var ve ikisi de savunulabilir:
- Veli zaten yasal vasi, erişim doğal
- Öğrenci 17 yaşındaysa kendi verisi üzerinde söz hakkı var

**K3 (çift onay) bu belirsizliğe karşı en güvenli varsayılan** — ama nihai cevap hukukçudan
gelmeli. **Bu, LEGAL_REVIEW.md'ye §8 olarak girecek.**

---

## 5. Veri modeli (şerit sözleşmesi — herkes buna göre çalışır)

```
profiles.account_role   text not null default 'student'   -- 'student' | 'parent'

parent_links
  id              uuid pk
  parent_user_id  uuid  -> auth.users, not null
  student_user_id uuid  -> auth.users, not null
  status          text  not null  -- 'pending' | 'active' | 'revoked'
  invited_email   text            -- öğrencinin girdiği adres
  invited_at      timestamptz
  confirmed_at    timestamptz
  unique (parent_user_id, student_user_id)

profiles.parent_invite_email  text   -- öğrencinin kayıtta verdiği veli adresi
```

**Tier mirası:** veli için efektif tier = bağlı öğrencinin `plan_tier`'ı. Velinin kendi
`plan_tier` sütunu yazılmaz.

---

## 6. Şerit bölümü

| Şerit | Kapsam | Bağımlılık |
|---|---|---|
| **P1** | Migrasyon + RLS: `account_role`, `parent_links`, salt-okunur politikalar | yok — **önce bu** |
| **P2** | Ayrı giriş, `/parent` rota grubu, ana sayfada `Student sign in` | P1'in şemasına göre |
| **P3** | Veli paneli UI + kahverengi tema | P1 |
| **P4** | Davet akışı: kayıtta veli e-postası, davet maili, onay | P1 |
| **P5** | Haftalık AI yorumu (premium) + özet mekanizması | P1, mevcut digest altyapısı |
| **P6** | Ortak premium + iki taraflı ödeme yüzeyi | P1 |
| **P7** | Yükseltme pop-up'ları — veli tarafında, öğrenci özelliklerini de anlatan | P3 |

**P1 herkesin sözleşmesi.** Diğerleri paralel çalışabilir ama şemayı P1 belirler.

---

## 7. Değişmeyen kurallar

- **Canlı veritabanına yazma yok** — migrasyonu kurucu çalıştırır
- **Migrasyon numarasını CEO verir** — bu gece dört numara çakışması oldu
- **`git add -A` ile paylaşılan checkout'ta scratch dosya bırakma**
- **Paylaşılan tarayıcıda kurucunun oturumu var** — `127.0.0.1` + `/design-preview/*`

---

## 8. Şerit durumu — 4 Eylül 01:40 itibarıyla

Bu bölüm CEO tarafından güncellenir. Şeritler kendi satırını değiştirmez.

| Şerit | Durum | Nerede |
|---|---|---|
| **P1** — migrasyon + RLS | ✅ **birleşti** | `supabase/migrations/0116_parent_accounts.sql` — **uygulanmadı**, sabah paketinde |
| **P2** — ayrı giriş, `/parent`, `Student sign in` | ⏳ devam | 71 |
| **P3** — veli paneli + kahverengi tema | ⏳ devam | 11 |
| **P4** — davet akışı | ✅ **birleşti** | `lib/parent/`, `app/(parent-invite)/`, ayarlar bölümü |
| **P5** — haftalık AI yorumu | ⏸ **başlamadı** | — |
| **P6** — ortak premium | ✅ **birleşti** | `lib/tier/parent-tier.ts`, `parent-interest-action.ts` |
| **P7** — yükseltme pop-up'ları | ✅ **birleşti** | `lib/parent/upgrade-prompt.ts` |

**Ana dal:** `14285d8f` — 396 dosya, 5.979 test, typecheck ve lint temiz.

### Uygulanana kadar geçerli olan durum

`parent_links` **canlıda yok.** Yazılan her şey bunu bilerek çalışıyor:
okuma yolları `isUndefinedTableError` / `isUndefinedFunctionError` ile
"kullanılamıyor" durumuna düşüyor, uydurma veri üretmiyor.

**Uçtan uca kontroller (B1–B12) çalıştırılmadı** — tablo olmadan çalıştırılamaz.
"Denendi, çalıştırılamadı" olarak raporlandı; yeşil gösterilmedi.

### K6'ya ek — gönderim hâlâ kapalı

Davet bağlantısı **gerçek ve kopyalanabilir** (ayarlar ekranında, "henüz mail
göndermiyoruz" uyarısıyla). **Mail gönderimi kapalı**, hukuki cevaba bağlı.

### Açık kalan

- **P5 hiç başlamadı** — veliye haftalık AI yorumu (G6, G11, G15)
- **§4'teki hukuki soru cevapsız** — reşit olmayanın verisine veli erişimi
- `LEGAL_REVIEW.md` §8 yazılmadı
