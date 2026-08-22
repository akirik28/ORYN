# ORYN — Yayına Çıkış Stratejisi

**22 Ağustos 2026 · ORYN-CEO tarafından, founder ile birlikte belirlenmek üzere**

Bu belge `MASTER-EXECUTION-STRATEGY.md`'nin yerine geçmez. Onun *nasıl uygulanacağını* ve
buradan yayına kadar her adımı tarif eder. Sayıların hepsi canlı Supabase'den ve `origin/main`
üzerinden bugün ölçüldü.

---

## 0. Tek cümlelik durum

ORYN'in veri omurgası çalışıyor ve ürün iskeleti neredeyse tamam — **ama ORYN'in *ne olduğu*,
yani AI danışman, bugüne kadar canlı bir modele karşı bir kez bile çalışmadı.**

```
weekly_plans      0
advisor_messages  0
```

Bunun sebebi bir mimari eksiklik değil:

```
ANTHROPIC_API_KEY=        ← satır var, değer boş
```

**Yayına giden yoldaki her şey bu tek satırın arkasında.** Counselor'ı test edemeden hangi
verinin eksik olduğunu bilemeyiz; bilmeden veri toplamak kör toplamaktır.

---

## 1. Bugün nerede olduğumuz — ölçülmüş

| | değer | anlamı |
|---|---:|---|
| canonical üniversite | 1.010 | kimlik omurgası **güçlü** |
| program | 17.046 | hacim iyi… |
| …ama programı olan üniversite | **150 / 1.010 (%15)** | …**kapsam dar** |
| requirement'ı olan üniversite | **85 (%8)** | counselor'ın en çok ihtiyacı olan alan |
| deadline'ı olan üniversite | **65 (%6)** | aksiyon üretmenin ön şartı |
| aktif fırsat | 271 | |
| aktif **+ doğrulanmış-güncel** fırsat | **187** | gerçekten önerilebilir olan |
| doğrulanmamış fırsat | **202** | %52'si |
| profil | 7 | |
| **weekly_plans** | **0** | ← ürünün kalbi hiç atmadı |
| **advisor_messages** | **0** | ← |

**Kritik ayrım:** 17.046 satır etkileyici; 150 üniversite dar. Bundan sonraki veri KPI'ı satır
sayısı değil, **bir kurumda program + requirement + deadline'ın birlikte tam olması** olmalı.
Counselor "bu öğrenci ne yapmalı?" sorusunu ancak üçü aynı kurumda varsa hedefe özel
cevaplayabilir.

---

## 2. Strateji: Veriyi counselor'a yönettirmek

Bugüne kadar veri, counselor'ı beslemek için toplandı. **Bundan sonra counselor, veri
yol haritasını belirlemeli.**

```
Güvenlik kapat → Counselor'ı çalıştır → Nerede tökezlediğini ölç
      → Sadece o boşlukları doldur → Tekrar ölç → Pilot
```

Bunun alternatifi — "önce tüm veriyi topla" — artık işlemez, çünkü **verinin biteceği bir nokta
yok.** Programlar, deadline'lar, eligibility sürekli değişiyor. Hedef *tam veritabanı* değil,
**karar için yeterli kapsam + sürekli tazelik.**

---

## 3. Yayına kadar altı aşama

### Aşama 0 — Founder, ~20 dakika, BU AKŞAM

Her şey buna bağlı. Üçü de sizin, hiçbiri delege edilemez.

| # | iş | süre | neden bloke |
|---|---|---|---|
| 1 | `.env.local`'e `ANTHROPIC_API_KEY` değerini yaz | 1 dk | counselor hiç çalışmadı |
| 2 | Supabase SQL Editor → `0062` çalıştır | 5 dk | her öğrenci kendini admin yapabiliyor |
| 3 | Supabase SQL Editor → `0061` çalıştır | 5 dk | anonim kullanıcılar profil okuyabiliyor |

**Bunlar veritabanı izin açıkları.** Uygulama kodundaki düzeltmeleri bugün yayına girdi ama
açıklar veritabanı seviyesinde; migration uygulanana kadar **doğrudan Supabase API'sine istek
atan biri için hâlâ açık.**

`0063`/`0064`/`0065` aynı taramadan, acil değil — 0062/0061'den sonra sırayla.

### Aşama 1 — Counselor gerçekten çalışıyor mu? (Gün 1)

Anahtar girdikten sonra ilk soru "iyi mi?" değil, **"hiç çalışıyor mu?"**

- MVP 16 maddelik listeyi baştan sona tekrar yürü → hedef **16/16**
- İlk gerçek `weekly_plan` üretilsin, gerçek `advisor_message` gelsin
- AI çağrısının maliyetini ölç (`ai_usage` tablosu zaten var)

**Çıktı:** counselor'ın çalıştığının kanıtı, ve ilk gerçek öneri metni.

### Aşama 2 — Counselor değerlendirme sistemi (Gün 2–3) ★ EN ÖNEMLİ YENİ YETENEK

Bu, bugün sahip olmadığımız ve her şeyi değiştirecek olan şey.

Sektör pratiği net: **golden set + rubrik + otomatik değerlendirme, her PR'da çalışır.** Manuel
"bakalım iyi mi" değil, repo'da yaşayan bir test.

**Kabul edilemez cevaplar listesi** (her biri otomatik başarısızlık):
- Öğrencinin uygun olmadığı bir fırsatı önermek
- Geçmiş deadline'ı gelecekmiş gibi sunmak
- Doğrulanmamış bir bilgiyi doğrulanmış gibi söylemek
- Hedef programın şartını uydurmak
- Öğrencinin haftalık zaman bütçesini aşmak
- Kabul olasılığını sahte kesinlikle ifade etmek

**Her öneri şu sözleşmeye uymalı:** gözlenen açık · neden önemli · neden şimdi · somut aksiyon ·
kanıt · uygunluk · süre · deadline · beklenen sonuç · neden alternatiflerden iyi.

**Profil sayısı hakkında:** ChatGPT'nin raporu 20 sentetik profil öneriyor. **Katılmıyorum.**
20 profil uydurmak, kendi uydurduğumuz bir dağılıma karşı test etmektir. **3–5 gerçek hedef
öğrenci profiliyle derine inelim** — sizin tanıdığınız, gerçek hedefleri olan öğrenciler.
Kabul-edilemez listesi 3 profille de tüm kritik hataları yakalar. 20'ye sonra çıkarız.

### Aşama 3 — Counselor'ın ortaya çıkardığı veri boşlukları (Hafta 1)

Burada **yeni geniş tarama yok.** Sadece counselor'ın gerçekten tökezlediği yerler.

Beklediğim sıralama (ölçüm değiştirebilir):
1. **Requirements derinliği** — 85 üniversite çok az; hedefe özel tavsiyenin ön şartı
2. **Deadline semantiği** — tek tarih varsayımı yanlış. Her aktif fırsat şunlardan biri olmalı:
   sabit tarih · rolling · henüz açıklanmadı · deadline yok · geçmiş cycle · bilinmiyor
3. **Fırsat doğrulaması** — 202 doğrulanmamış kayıt; hedef aktif korpusun **≥%90'ı
   doğrulanmış-güncel**
4. **Öncelikli üniversite listesi** — bu **sizin kararınız**: hangi 100 kurum? Sizin hedef
   pazarınız (ABD · İngiltere · Avrupa · Türkiye · uluslararası) bunu belirler ve **her şeyi
   kilitler.** Bunu siz seçmeden veri ekibi doğru sırayı bilemez.

### Aşama 4 — UI ve akış (Hafta 2)

Bugün hazır bekleyen: `docs/ui-audit-2026-08-22.md` — altı güvenli düzeltme, sizin zevkinizi
gerektiren bulgular, ve fiyatlandırılmış üç kademe öneri.

Açık kalan kararınız: **açık mı koyu tema.** Bilerek çözülmedi.

Ayrıca kapatılmamış tek erişilebilirlik bulgusu: **dialoglar odağı hapsetmiyor** — klavye veya
ekran okuyucu kullanan biri dialogdan sekip arkadaki sayfayla etkileşebiliyor.

### Aşama 5 — Hukuk ve gizlilik kapısı (Hafta 3) ⚠️ PİLOT ÖNCESİ ZORUNLU

Kullanıcılarınız 14–18 yaş. Araştırmadan çıkan somut kapılar:

- **COPPA** 13 yaş altı içindir — hedefiniz 14+ olduğu için doğrudan kapsam dışı. **Ama** yaş
  doğrulaması yoksa 13 altı kayıt olabilir, bu da sizi kapsama sokar.
- **GDPR (Avrupa)** asıl kapı: 16 yaş altı için **veli onayı** gerekiyor, üye ülkeye göre eşik
  13'e kadar inebiliyor. **Avrupa hedef pazarınız, yani 14–15 yaş için veli onayı akışı
  gerekecek.**
- **COPPA'nın 2025 değişikliklerinin uyum tarihi 22 Nisan 2026'ydı — geçti.** Yazılı bilgi
  güvenliği programı ve yazılı veri saklama/silme politikası artık gereklilik.

**Bu bir avukat işi, benim işim değil.** Yapabileceğim: gereken teknik yapıyı (yaş kapısı, veli
onayı akışı, veri saklama politikası, silme) hazırlamak. **Gerçek öğrenciyle pilot, bu kapı
kapanmadan açılmamalı.**

### Aşama 6 — Kontrollü pilot (Hafta 4)

Sıra: **2 iç QA hesabı → ~10 öğrenci → düzelt → ~50 öğrenci.**

Pilot ön şartları: 16/16 MVP · kritik öneri hatası = 0 · `0061`–`0065` uygulanmış · hukuk kapısı
kapalı · geri alma planı var.

---

## 4. Claude'u nasıl kullanmalıyız — 20x kapasitenin tasarımı

### Bugün ne oldu, dürüstçe

13 oturum çalıştı. **122 PR birleşti.** Ama:

- Token'ın büyük kısmı ürün çıktısına değil **koordinasyona ve hata düzeltmeye** gitti
- Bir hayalet hata üç lane'i boşuna koşturdu
- Disk doldu, üç lane durdu
- Bir gün içinde **17 yeni operasyonel kural** yazdım

**O son madde bir semptom.** Her koordinasyon hatası yeni bir "hatırlanması gereken kural"la
çözülüyorsa, sistem fazla karmaşıktır.

### Bugünün asıl dersi

**Paralellik denetimde işe yaradı, yazmada yaramadı.**

- Üç bağımsız denetim (MVP · güvenlik · uygunluk) aynı anda **üç farklı şey buldu** — hiçbiri
  diğerini bulamazdı
- İki yazma lane'i ise sürekli çakıştı: aynı hesaba yazdılar, aynı dosyada rebase savaşı verdiler

Sektör pratiği de bunu söylüyor: **eşzamanlı ajan için tatlı nokta 3–5**, karmaşık işte 3–8.
13 fazlaydı.

### Önerilen yapı — 6–8 oturum

```
FOUNDER
   │
ORYN-CEO  (koordinasyon · öncelik · merge · WIP)
   │
   ├── YAZAN 2 kişi — sıralı, asla çakışmaz
   │     ├── DATA OWNER      tek yazar: ingestion, kapsam, tazelik
   │     └── PRODUCT OWNER   tek yazar: counselor, öneri, UI
   │
   ├── OKUYAN 3–4 kişi — paralel, salt-okunur, çakışamaz
   │     ├── RESEARCHER ×2   araştırır, canlı DB'ye asla yazmaz
   │     ├── VERIFIER        kaynak ve şema doğrulaması
   │     └── QA / EVAL       counselor benchmark + güvenlik regresyonu
   │
   └── CFO                   bağımsız denetçi, founder'a raporlar
```

**Temel ilke: yazmayı sırala, doğrulamayı paralelleştir.** Okuyan lane'ler birbirini bozamaz,
o yüzden kaç tane olduğu önemli değil. Yazan lane sayısı 2'yi geçmemeli.

### Hatırlanacak kural yerine mekanik limit

Bugünün 17 kuralının çoğu otomatikleştirilebilir:

| limit | tetiklenince |
|---|---|
| Yazar başına **1 aktif paket** | ikincisi başlamaz |
| **Doğrulanmış ama aktarılmamış** paket ≥ 2 | yeni araştırma başlamaz |
| Merge kuyruğu ≥ 3 | yeni kod paketi başlamaz |
| Açık kritik güvenlik var | özellik işi otomatik ikinci öncelik |
| Aktif worktree > 8 | yeni worktree açılmadan temizlik |

Bugün araştırma kapasitesi aktarım kapasitesinden fazlaydı ve **doğrulanmış iş boşta bekledi.**
Bir üretim hattında darboğazdan önceye kapasite eklemek hızlandırmaz — **sadece kuyruğu büyütür.**

### Değerlendirme sistemini kural yerine koymak

En büyük yapısal iyileştirme: **17 kural yazmak yerine kontrolleri CI'a koymak.** Counselor
benchmark'ı repo'da yaşayan bir test olursa, "geçmiş deadline önerme" bir kural değil,
**başarısız olan bir test** haline gelir.

### Anti-KPI — bunlar başarı sayılmaz

`toplam PR` · `toplam branch` · `üretilen araştırma kaydı` · `program satırı` · `yazılan belge`
· `tüm alanlar dolu`

### Gerçek KPI

**Kuzey yıldızı:** *Test edilen öğrenci profillerinin yüzde kaçında ORYN, kanıtlı ve uygunluğu
doğru 3 aksiyon üretiyor?*

**Sıfır olması gerekenler:** uygunluk yanlış-pozitifi · geçmiş deadline'ın aktif gösterilmesi ·
desteklenmeyen kabul iddiası · açık kritik güvenlik açığı

---

## 5. İlk 72 saat — en fazla 5 paket

| # | paket | sahip | ön şart |
|---|---|---|---|
| **0** | **Anahtar + `0062` + `0061`** | **FOUNDER** | — |
| 1 | MVP 16/16 doğrulaması, gerçek AI yolundan | QA/EVAL | 0 |
| 2 | Counselor benchmark v0: 3–5 profil, kabul-edilemez listesi, CI'da çalışan harness | PRODUCT | 1 |
| 3 | Deadline semantiği modeli + aktif fırsat doğrulama turu | DATA | — |
| 4 | Bekleyen doğrulanmış işi aktar (`opportunities` bölgesini açın) + `0063`–`0065` | DATA | founder |
| 5 | Dialog odak hapsi + kalan erişilebilirlik | PRODUCT | — |

**Yeni geniş veri taraması yok.** Aşama 3'e kadar bekler.

---

## 6. Sizden gereken kararlar

1. **`ANTHROPIC_API_KEY` değerini girin** — her şeyin ön şartı
2. **`0062` ve `0061`'i uygulayın** — açıklar şu an canlı
3. **Hangi RES-I2'yi durdurdunuz?** — tek cümle, `opportunities` bölgesini açar
4. **Öncelikli 100 üniversite kim?** — veri sırasını bu belirler
5. **Açık mı koyu tema** — UI işini bu kilitliyor
6. **Hukuk danışmanı** — Avrupa'da 14–15 yaş için veli onayı gerekecek, pilot öncesi

---

## 7. Bir hafta sonra görmek istediğim

- MVP **16/16**, gerçek AI yolundan
- Counselor benchmark 3–5 profilde çalışıyor, **kritik hata = 0**
- `0061`–`0065` uygulanmış, regresyon testi var
- Öncelikli üniversite kapsam matrisi çıkmış
- Aktif yazar sayısı **2**, aktif worktree **< 8**
- Bekleyen doğrulanmış iş **0**

---

## Son söz

Veri yatırımı boşa gitmedi — tam tersine, artık ürünün gerçek farkını test edecek kadar büyük.
Bundan sonraki en iyi ilerleme formülü:

> **Güven → Counselor döngüsü → Ölçülen boşluklar → Hedefli veri → Daha iyi counselor → Pilot**

Bu döngü kurulursa veri büyüdükçe ORYN güçlenir. Kurulmazsa veri büyüdükçe sistem sadece
daha karmaşık hale gelir.
