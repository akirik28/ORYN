# Oryn — maliyet ve fiyatlandırma modeli

**Tarih:** 2026-09-02 · **Durum:** hesaplandı, karar bekliyor

Bu dosyadaki sayıların **hangisinin ölçüm, hangisinin varsayım** olduğu her bölümde
açıkça yazılıdır. Ölçülenler koddan ve canlı `ai_usage` verisinden gelir; varsayımlar
işaretlidir ve değiştirilebilir.

---

## 1. Yapay zekâ maliyeti — ÖLÇÜM

Gerçek ortalama mesaj boyutu (canlı `ai_usage` tablosundan, bu gece ölçüldü):
**3.628 girdi / 1.095 çıktı token.**

Fiyatlar `lib/ai/pricing.ts`'ten, milyon token başına USD:

| Model | Girdi | Çıktı | **Mesaj başına** |
|---|---|---|---|
| `claude-sonnet-5` (tavan model) | $3 | $15 | **$0,027309** |
| `claude-haiku-4-5` (degrade modeli) | $1 | $5 | **$0,009103** |

Çıktı, girdinin **5 katı** pahalı. Bu yüzden maliyeti mesaj *sayısı* değil, cevap
*uzunluğu* belirliyor — ve ürünün "kısa ve net cevap ver" ilkesi aynı zamanda bir
maliyet kontrolü.

## 2. Kullanıcı başına aylık tavan — ÖLÇÜM + TASARIM

`lib/ai/limits/budget.ts`'te iki sabit var:

- `MONTHLY_BUDGET_TARGET_USD = 0.50` → bu noktada model Haiku'ya düşer (degrade)
- `MONTHLY_BUDGET_CEILING_USD = 1.00` → sert tavan

Bunun pratikte anlamı:

| Aşama | Mesaj | Maliyet |
|---|---|---|
| Degrade öncesi (Sonnet) | 18 | $0,49 |
| Degrade sonrası (Haiku) | 55 | $0,50 |
| **Toplam / kullanıcı / ay** | **73** | **$0,99** |

Görünen kota **236.150 token** (`MONTHLY_AI_TOKEN_LIMIT`). Yani **en aktif kullanıcı
bile aylık ~$1'ı geçemez** — bu bir tahmin değil, kodda uygulanan sert sınır.

> **Kritik nokta:** Kullanıcıların çoğu bu tavana ulaşmaz. $0,99 **en kötü hâl**,
> ortalama değil. Aşağıdaki senaryolar bu yüzden "aktif kullanıcı oranı" ile hesaplanır.

## 3. Sabit altyapı — VARSAYIM (liste fiyatları, doğrulanmalı)

| Kalem | Aylık | Not |
|---|---|---|
| Supabase Pro | $25 | Ücretsiz katman başlangıç için yeter; ticari kullanımda Pro |
| Vercel Pro | $20 | Hobby ticari kullanıma kapalı |
| Alan adı | $1 | ~$12/yıl |
| `opportunity_extraction` işi | $25 | **Sistem geneli**, kullanıcı başına değil |
| `requirement_extraction` işi | $15 | **Sistem geneli** |
| **TOPLAM SABİT** | **$86/ay** | |

Ücretsiz ve maliyeti sıfır: College Scorecard, OpenAlex, YÖK Atlas.
Tavily ücretsiz katmanda 1.000 arama/ay — aşılırsa **+$30/ay** eklenir.

**Bu iki iş bütçesi ($40) ölçekle büyümez.** Katalog herkes için ortaktır; 100
kullanıcıda da 10.000 kullanıcıda da aynı fırsatlar taranır. Ölçek büyüdükçe
kullanıcı başına düşen payı hızla erir.

## 4. Ölçeğe göre kullanıcı başı maliyet — HESAP

| Kullanıcı | %30 aktif | %60 aktif |
|---|---|---|
| 100 | **$1,16** | **$1,46** |
| 500 | $0,47 | $0,77 |
| 1.000 | $0,38 | $0,68 |
| 5.000 | $0,31 | $0,61 |
| 10.000 | **$0,31** | **$0,60** |

**Marjinal maliyet ~$0,30–0,60'ta sabitleniyor.** 100 kullanıcıda pahalı görünmesinin
tek sebebi $86 sabit giderin az kişiye bölünmesi. **500 kullanıcıdan sonra ekonomi
çalışıyor.**

## 5. Para birimi — BİLMİYORUM, GİRİLMELİ

**USD/TRY kurunu bilmiyorum ve uydurmayacağım.** Bilgi kesme tarihim bu hesabın
yapıldığı günden önce, ve yanlış bir kur bütün tabloyu sessizce bozar.

Kuru şuraya gir ve tabloyu yeniden çarp:

```
KUR = ____ TL/USD
```

Kur 40 varsayılırsa (yalnızca örnek): kullanıcı başına maliyet **12–24 TL/ay**
aralığına denk gelir.

## 6. Fiyat önerisi

Maliyet en kötü hâlde $0,60, gerçekçi olarak $0,30–0,45.

| Marj | Fiyat (USD) | Değerlendirme |
|---|---|---|
| 3x | $1,80 | Çok düşük — destek ve iade payı yok |
| **5x** | **$3,00** | **Önerilen** — sağlıklı marj, öğrenci için ulaşılabilir |
| 8x | $4,80 | Savunulabilir ama pazara göre yüksek |

**Önerim: 5x, yani ~$3/ay karşılığı TL.** Sebepleri:

1. Hedef kitle **14–18 yaş**. Ödemeyi çoğunlukla veli yapar ve fiyat "bir kahve"
   çerçevesinde kalmalı.
2. Marj, **kullanımın tavana dayandığı en kötü senaryoda bile** korunur — çünkü tavan
   koda gömülü, tahmine bağlı değil.
3. İlk hafta bedava denemenin maliyeti kullanıcı başına en fazla **$0,25** (bir haftalık
   pay). 100 denemede $25. Katlanılabilir.

## 7. Bu modelin dayandığı sınırlar

Fiyat, bu sınırlar **kodda durduğu sürece** geçerlidir. Biri gevşetilirse model bozulur:

- `MONTHLY_BUDGET_TARGET_USD = 0.50` — degrade noktası
- `MONTHLY_BUDGET_CEILING_USD = 1.00` — sert tavan
- `MONTHLY_AI_TOKEN_LIMIT = 236.150` — görünen kota
- `JOB_BUDGET_USD` — sistem işleri, $40/ay toplam

**Ultra'ya "daha büyük havuz" verilecekse, bu dosya yeniden hesaplanmalı.** Havuzu iki
katına çıkarmak marjinal maliyeti iki katına çıkarır ve 5x marjı ~2,5x'e düşürür.

## 8. Bu hesaba DAHİL OLMAYANLAR

Dürüstlük için açıkça yazıyorum — bunlar gerçek ve buraya girmedi:

- **Ödeme sağlayıcı komisyonu** (tipik ~%3 + sabit ücret). Entegrasyon henüz yok.
- **Vergi** (KDV / stopaj).
- **Destek maliyeti** — insan zamanı.
- **Depolama büyümesi** — CV ve kanıt dosyaları. Supabase Pro 100GB içerir; kullanıcı
  başına 5MB varsayımıyla ~20.000 kullanıcıya kadar sorun yok.
- **Aşırı kullanım / kötüye kullanım** — sert tavan bunu sınırlar ama sıfırlamaz.
- **Tavily ücretli katmana geçerse** +$30/ay.

## 9. Doğrulanması gerekenler

- [ ] USD/TRY kuru
- [ ] Supabase ve Vercel'in **güncel** fiyatları (liste fiyatı varsaydım)
- [ ] Gerçek aktif kullanıcı oranı — %30/%60 varsayım, ölçüm değil
- [ ] Ödeme sağlayıcı komisyonu
