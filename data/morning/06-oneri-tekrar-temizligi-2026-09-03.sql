-- ORYN — sabah paketi 6: senin hesabındaki tekrar eden "avoid_for_now" önerilerini temizleme
-- Oluşturulma: 2026-09-03, canlı veritabanına (qtcvcflzxbuagvvwahhu) okuma yaparak.
--
-- BAĞLAM: docs/core-loop-trace-2026-09-03.md, "hâlâ açık" bulgusu. 2026-08-30'da, aynı 38
-- dakikalık pencerede ("Regenerate" butonuna art arda basıldığı için — o günün kendi
-- düzeltmesi: docs/reflection-loop-audit'in de bahsettiği migration'sız tekrar-üretim
-- kusuru), ai_recommendations tablosuna "Oxbridge Academic Programs" başlıklı AYNI öneri
-- 99 KEZ eklendi. Yazma tarafındaki düzeltme (lib/plan/persist.ts, oryn/plan-regen-
-- preserve-completed-2026-09-02) zaten canlıda ve zaten bu şekli bir daha üretmiyor —
-- BUGÜN sorun bu değil, GEÇMİŞTE oluşmuş 98 fazla satırın hâlâ orada durması.
--
-- SONUÇ, KENDİ TERİMLERİNLE: lib/ai/student-context.ts, senin hesabın için haftalık plan
-- üretilirken "bunu önerme" listesini (avoid_for_now) en yeni 15 satırla dolduruyor. Şu an
-- o 15 satırın neredeyse tamamı aynı 99 kopyadan geliyor — yani bugün bir plan üretilirse,
-- danışman "tekrar önerme" sinyalini senin gerçek geçmişinden değil, aynı iki başlığın
-- gürültüsünden alacak. Bu dosya çalışmadan deploy edilirse, göreceğin ilk plan bu
-- gürültüyle şekillenmiş olur.
--
-- KONTROL EDİLDİ, VARSAYILMADI (üç ayrı kontrol):
-- 1. Hangi satırların GERÇEKTEN aynı olduğu — sadece başlığa değil, TÜM alanlara bakarak.
--    99 "Oxbridge Academic Programs" satırının category, related_dimension, reason,
--    user_response, feedback, completed_at alanları BİREBİR AYNI (tek reason metni, hepsi
--    null user_response/feedback/completed_at). Aşağıdaki DELETE bu tam eşleşmeyi kendi
--    WHERE koşuluna yazıyor — sadece "başlık aynıysa 1 tanesini tut" değil, ne kadar
--    dikkatli olunursa olunsun gerçek bir farkı olan satırı asla silmeyecek şekilde.
-- 2. Bu tablo başka hiçbir yerden foreign key ile referans almıyor (pg_constraint'te
--    confrelid = ai_recommendations olan sıfır satır) ve kod tabanında (app/(app)/
--    dashboard/page.tsx, lib/ai/student-context.ts, lib/export/tables.ts) hiçbir yer belirli
--    bir satırın id'sini tek tek tutmuyor — hepsi user_id/recommendation_class'a göre toplu
--    okuyor. Silinen 98 satırın id'si hiçbir yerde beklenmiyor.
-- 3. AYNI ŞEKLİN başka bir hesapta da olup olmadığına bakıldı — evet, ama farklı bir
--    şekilde: e9eba798-195d-4859-960c-4b8968df7819 hesabında aynı başlıkla ("Starting a new
--    project...") 2 satır var, ama reason metinleri BİRBİRİNDEN FARKLI (biri "sixth shallow
--    thing" diyor, diğeri "MIT checklist ve YYGS deadline" diyor) — yani bu ikisi gerçek,
--    ayrı ayrı üretilmiş iki öneri, aynı başlığı paylaşan bir tesadüf, kopya değil. BU
--    DOSYAYA BİLEREK KONMADI — silinirse gerçek bir öneri kaybolur. Sadece senin hesabın
--    (ccf2161e), sadece gerçekten birebir aynı olan 99 satır.
--
-- NEDEN SİLME, İŞARETLEME DEĞİL: ai_recommendations tablosunda opportunities.status gibi bir
-- "disabled" alanı yok (information_schema'dan doğrulandı — sadece id, user_id, title,
-- reason, recommendation_class, category, related_dimension, shown_at, user_response,
-- completed_at, feedback, created_at var). Yeni bir sütun eklemek bu paketin işi değil, ayrı
-- bir migration kararı olurdu. Tablo işaretlemeyi desteklemediği için, dar kapsamlı ve üç
-- kez doğrulanmış bir silme burada doğru yol.
--
-- DENEME ÇALIŞTIRILDI (aşağıdaki CTE, DELETE yerine SELECT olarak, 2026-09-03): sonuç
-- would_keep=1, would_delete=98, tutulan satırın shown_at'i 2026-08-30 21:01:11 — en
-- erken gösterilen, gerçek öneri. Aşağıdaki DELETE bu aynı CTE'nin birebir aynısı.
--
-- TEK İŞLEM: önceki dosyalarla aynı disiplin. Sonunda doğrulama sorgusu var.

BEGIN;

-- ══════════════════════════════════════════════════════════════════
-- 99 kopyadan 98'ini sil, en eskisini (ilk gösterilen, gerçek öneriyi) tut
-- ══════════════════════════════════════════════════════════════════
with duplicate_group as (
  select id,
    row_number() over (
      partition by user_id, recommendation_class, title, category,
                   coalesce(related_dimension::text, ''), reason
      order by shown_at asc
    ) as rn
  from ai_recommendations
  where user_id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d'
    and recommendation_class = 'avoid_for_now'
    and title = 'Oxbridge Academic Programs'
    -- Güvenlik koşulu burada da tekrarlanıyor, sadece yukarıdaki WHERE'e güvenmek yerine:
    -- gerçek bir user_response/feedback/completed_at taşıyan bir satır hangi rn'e denk
    -- gelirse gelsin, aşağıdaki DELETE'in WHERE'i onu zaten hariç tutuyor.
    and user_response is null
    and feedback is null
    and completed_at is null
)
delete from ai_recommendations
where id in (select id from duplicate_group where rn > 1)
  and user_response is null
  and feedback is null
  and completed_at is null;

-- ══════════════════════════════════════════════════════════════════
-- Doğrulama
-- ══════════════════════════════════════════════════════════════════
select recommendation_class, title, count(*) as kalan_satir
from ai_recommendations
where user_id = 'ccf2161e-4992-49ce-88b4-a76293f1dc1d' and recommendation_class = 'avoid_for_now'
group by recommendation_class, title
order by title;
-- Beklenen: iki satır —
--   "Oxbridge Academic Programs" | 1   (99 -> 1)
--   "The Concord Review - Emerson Prize" | 1   (zaten tekildi, dokunulmadı)
-- Başka bir sayı çıkarsa COMMIT'ten önce dur.

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Buraya bilerek konulmayan
-- ══════════════════════════════════════════════════════════════════
--
-- e9eba798-195d-4859-960c-4b8968df7819 hesabındaki 2 "Starting a new project..." satırı —
-- yukarıda anlatıldığı gibi, reason metinleri farklı olduğu için gerçek iki ayrı öneri.
-- Silinmedi, dokunulmadı.
