# 190 fırsat: üç uygunluk boyutunda da veri yok — 5 Eylül

CEO'nun canlı sorgusundan, `id` sırasına göre numaralı. **Filtre, aynen:**

```sql
where status = 'active'
  and cycle_status not in ('closed','historical','discontinued')
  and (deadline is null or deadline::date >= current_date)
  and (minimum_age is null and maximum_age is null)
  and cardinality(eligible_grades) = 0
  and cardinality(eligible_countries) = 0
```

**Toplam 190.** Öğrencinin görebileceği 289 fırsatın **%66'sı** — yani ürün bunlar
hakkında **yaş, sınıf ve ülke boyutlarının üçünde de hiçbir şey bilmiyor.**
Karşılaştırma: üç boyutta da veri olan **3 fırsat** var.

## Dilim sınırı — iki şerit, çakışmasın

| dilim | satır | ilk id | son id |
|---|---|---|---|
| **A** (hukuki çerçeve şeridi) | **1–95** | `0009f66d-…9309` | `900b0a32-…b438b` |
| **B** (production deployment şeridi) | **96–190** | `903962c1-…9271` | `ff5d9710-…f003` |

**Sınır satırları, tam:**
- A'nın sonu → **95. ACU BİLİM YAZ KAMPI PROGRAMI 2026** (`900b0a32-298f-4956-b933-3211e25b438b`)
- B'nin başı → **96. Girl Up Club** (`903962c1-dca6-45c2-9c19-593d3b1e7271`)

Kendi dilimini `id` sırasına göre doğrula; şüphedeysen **CEO'ya sor**, kendin karar verme.

## Bilinen engeller (dün fırsat dolgusundan)

Bu üçü **erişilemiyor**, "kaynak susuyor" değil — 403 / engelli alan adı:
Girl Up (96) · New York Times Podcast (4) · STEM Fellowship Journal.
Bunlara dokunma, `medium` bile işaretleme — **erişemedim** yaz.

## Kural

Resmî kaynak · `source_url` + tarih · **bulunamayan boş bırakılır** ·
**"yazmıyor" ≠ "yok"** · **"erişemedim" ≠ "kaynak susuyor"** ·
aracın özetine değil **alıntının kendisine** bak · SQL hazırlanır, **CEO paketler** ·
canlıya yazma.
