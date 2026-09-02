# Üç katman kararı — yarın sabah konuşulacak

**Durum: KARAR DEĞİL.** Founder'ın 2026-09-03 gecesi ilettiği fikir, sabah görüşülmek üzere
not edildi. Kendi ifadesiyle: *"belki araya max planı ekleriz, sadece token artar ve uzun
cevap gelir, ultra da opus kullanır — ama kesin karar değil, yarın sabah sor konuşuruz.
Belki ultra 800 lira olur aylık, max 400, emin değilim."*

## Fikir

| Katman | Model | Ne değişir | Fiyat fikri |
|---|---|---|---|
| **Standart** | Haiku / Sonnet | Bugünkü hâli | ücretsiz |
| **Max** *(yeni)* | Haiku / Sonnet — **aynı** | Daha çok token + daha uzun cevap | ~400 TL? |
| **Ultra** | **Opus** | Model yükselir | ~800 TL? |

## Ölçülmüş maliyet — gerçek ortalama mesajla (3.628 girdi / 1.095 çıktı)

| Model | Mesaj başına | Orana göre |
|---|---|---|
| `claude-haiku-4-5` | $0,009103 | 1x |
| `claude-sonnet-5` | $0,027309 | 3x |
| `claude-opus-5` | $0,045515 | **5x Haiku, 1,67x Sonnet** |

## Katman başına aylık tavan maliyeti

| Katman | Kullanım | Maliyet |
|---|---|---|
| Standart (bugün) | 18 Sonnet + 55 Haiku | **$0,99** |
| Max (2x token) | 18 Sonnet + 165 Haiku | **$1,99** |
| Ultra — 50 mesaj tamamen Opus | 236.150 token | **$2,28** |
| Ultra — 100 mesaj tamamen Opus | 472.300 token | **$4,55** |

## 5x marj için gereken fiyat

| Katman | Maliyet | 5x |
|---|---|---|
| Standart | $0,99 | $4,95 |
| Max | $2,00 | $10,00 |
| Ultra (50 msg Opus) | $2,28 | $11,38 |
| Ultra (100 msg Opus) | $4,55 | $22,76 |

**Founder'ın fikri olan 400/800 TL, bu maliyetlerin çok üstünde marj bırakıyor** — yani
maliyet tarafı bu fiyatları rahatlıkla kaldırır. Asıl soru pazar tarafı, ve orayı founder
benden iyi bilir.

## Karara bağlanması gerekenler

1. **Ultra'nın Opus alması, tek başına yeterli bir fark mı?** Opus, Sonnet'in 1,67 katı —
   gerçek ama görünmez bir fark. Öğrenci bunu hissedecek mi, yoksa sadece faturada mı görünür?
2. **Max ile Ultra arasındaki fark yeterince belirgin mi?** Max "daha çok + daha uzun",
   Ultra "daha akıllı". İkisi de soyut. Öğrenciye somut ne söylenecek?
3. **Üç katman, iki katmandan iyi mi?** Karşılaştırma sayfası şu an dört satır ve ikisi
   "bunu bilerek eşit tuttuk". Üçüncü katman o sayfayı zenginleştirir mi, karıştırır mı?
4. **Görsel tema ne olacak?** Ultra'nın alevi var. Max'in ayrı bir kimliği olacak mı, yoksa
   Standart'ın mı görünecek? Bu, bu gece kurulan `[data-tier]` mimarisini genişletmek demek.
5. **`plan_tier`'ın check kısıtı `('standard','ultra')`** — üçüncü değer bir migration.
   Yaklaşık 20 dosya `PlanTier`'ı okuyor.

## Bu hesabın dışında kalanlar

Ödeme komisyonu, vergi, destek maliyeti, USD/TRY kuru (**bilinmiyor, uydurulmadı**).
Detay: `docs/maliyet-ve-fiyatlandirma-2026-09-02.md`.
