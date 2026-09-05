# Ne çalıştırılacak, hangi sırayla — 5 Eylül

> **Bu dosya tek amaçla var: kurucunun ne yapacağını sırayla söylemek.**
> Her adımın **neyi açtığı** yazılı. Sıra keyfi değil — bağımlılıklar gerçek.
> Hiçbiri canlıya uygulanmadı; hepsi bekliyor.

---

## Neden sıra önemli

**Bu sabah bir paket elinizde patladı** çünkü üç migration ayrı ayrı doğrulanmıştı ve
**sıra hiç test edilmemişti.** Sıra testi sonradan üç hata buldu — biri ilk pakette.

Bugün aynı hatayı tekrarlamadık: **8 güvenlik migration'ı ardışık, iki geçişte test
edildi** (`docs/migration-sequence-135-142-2026-09-05.md`). Bir hata çıktı (`0142`
ikinci geçişte patlıyordu), düzeltildi.

---

## ADIM 1 — Sabah paketleri (14 → 15 → 16)

`data/morning/14-toplu-paket-2026-09-04.sql` → `15-...` → `16-...`

**Sıra testi yapıldı** (`scripts/check-morning-packages-14-15-16-sequence.sql`), iki
koşu, temiz. Her paketin kendi **SHA sağlaması** var — kaynak dosya doğrulandıktan
sonra değiştiyse paket durur.

**Ne açar:** paketlerin içindeki 7 migration (`0124`/`0126`/`0127`/`0129`/`0130`/
`0132`/`0133`) canlıya iner. **Bunlar olmadan aşağıdaki dolguların çoğu çalışamaz.**

**Ve asıl kazanç:** `checked_not_stated` sütunları canlıya iner. Bugün 27 fırsatın
dolgusu + rozetin dört-durum ayrımı **ancak bundan sonra görünür olur** —
**22'sinde öğrencinin gördüğü uyarı değişir.**

---

## ADIM 2 — Sekiz güvenlik migration'ı (0135 → 0142)

Sırayla, `supabase/migrations/` altından. **Ardışık test edildi, iki geçiş temiz.**

| # | ne kapatıyor |
|---|---|
| `0135` | kullanıcı kendi bildiriminin metnini değiştiremez |
| `0136` | öğrenci kabul görünümünü uyduramaz — **bu değer veliye gidiyor** |
| `0137` | öğrenci kendi başarısını "doğrulandı" işaretleyemez (10 tabloda) |
| `0138` | mesaj içeriği ve göndericisi değiştirilemez |
| `0139` | bağlantı sahipliği değiştirilemez |
| `0140` | öğrenci, öğretmeninin yazdığı tavsiyeyi değiştiremez |
| `0141` | danışman eşzamanlılık kilidi etrafından dolanılamaz (**maliyet koruması**) |
| `0142` | doğum yılı geçmişi veri dışa aktarmada artık boş dönmez |

**Sekizi de gerçek bir Postgres'te kanıtlandı** — saldırı önce başarılı, koruma sonrası
engelleniyor, **ve koruma kaldırılınca saldırı yine başarılı** (kanıtın kendisinin
çalıştığının kanıtı).

**`0123` (ödeme) ayrı ve isteğe bağlı** — ödeme sağlayıcısı seçilmeden işe yaramaz.

---

## ADIM 3 — Cron'ları açmadan önce oku

**Haftalık plan işindeki sessiz hata düzeltildi** — açılabilir.

**Ama iki şey bilinmeli:**

1. **Üniversite bildirimi işi açılırsa**, öğrencilere gidecek *"üniversite bilgisi
   güncellendi"* bildirimleri **gerçek bir dış değişiklikten değil, bu filonun kendi
   dolgusundan** kaynaklanacak.
2. **Bildirim gönderimi** şu an *"kullanıcı bu kategoriyi kapatmış"* ile *"yazma
   başarısız oldu"* durumlarını **aynı sonuca** indiriyor, ve iki iş bunu *"sıfır hata"*
   diye raporluyor. **Düzeltiliyor** — cron'lardan önce bitmeli.

---

## ADIM 4 — Veri dolguları (migration'lardan SONRA)

**Bağımsız olanlar** (migration gerektirmez):
`docs/slice-a-additions-2026-09-05.sql` + `-part2` · `docs/d2-visible-fill-additions-2026-09-05.sql`
· `docs/d2-amc-aime-url-correction-2026-09-04.sql` · `docs/opportunity-past-deadline-cycle-status-fix-2026-09-05.sql`
(6 fırsat yanlış "açık" işaretli) · `docs/catalog-age-mismatch-2026-09-05.sql`
(1 yüksek lisans programı katalogdan çıkıyor — silme değil, devre dışı)

**`0126`/`0129`/`0133` gerektirenler** — Adım 1'den sonra:
`docs/slice-a-requires-...` + `-part2` · `docs/d2-visible-fill-requires-...` ·
`docs/d2-checked-not-stated-requires-0129-...` · `docs/d2-country-checked-not-stated-requires-0133-...`

**Üniversite dolguları:** `docs/d1-qs-top100-fill-2026-09-05.md` (23 kurum) ·
`docs/d1-qs-101-150-fill-2026-09-05.md` (29 kurum) — SQL dokümanların içinde.

---

## Sende karar bekleyen tek soru

**`ORYN_ENABLE_MESSAGING` ve `ORYN_ENABLE_CONNECTIONS` canlıda gerçekten ayarlanmamış mı?**

Öğrenciler arası mesajlaşma **kurulu ve çalışır durumda** — sizin 15 Ağustos'ta
onayladığınız kapsam değişikliği, kayıtlı. **Kod varsayılanı kapalı, üç doküman
"ayarlanmamış" diyor, ama canlı değer doğrulanmadı.** Üç dolaylı kanıt, sıfır doğrudan
ölçüm — ve konu **reşit olmayan kullanıcılar arasında mesajlaşma.**

**Ekrandan teyit yeterli.**
