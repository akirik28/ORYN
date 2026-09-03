-- ORYN — sabah paketi 5: üniversite-değişikliği bildirim kaydını arka doldurma
-- Oluşturulma: 2026-09-03, canlı veritabanına (qtcvcflzxbuagvvwahhu) okuma yaparak.
--
-- UYGULAMADAN ÖNCE OKU, BU ÖNEMLİ: notify-university-changes işi vercel.json'da
-- kurulu (0 7 * * *) — ilk deploy'dan sonra ilk çalıştığında, ŞU AN İTİBARİYLE üç gerçek
-- öğrenciye "bilgiler güncellendi" bildirimi gönderir, ve üçü de YANLIŞ: hiçbiri gerçek bir
-- dış değişikliği yansıtmıyor, üçü de bu projenin kendi katalog araştırma çalışmasının
-- (son iki hafta) izini taşıyor. Kanıt: bir öğrencinin Erasmus University Rotterdam
-- isabetleri, 2026-08-21 19:39:49 ile 19:42:41 arası (üç dakika, alt-saniye aralıklarla,
-- bir düzine farklı program sayfası) eklenmiş ~87 university_requirements satırından
-- geliyor — bu toplu bir ekleme, Erasmus'un üç dakikada bir düzine gereksinim yayınlaması
-- değil. Tam analiz: docs/job-dry-run-audit-2026-09-03.md.
--
-- Bu dosya deploy'dan ÖNCE çalıştırılmalı. Çalıştırmadan deploy edersen üç öğrenci yanlış
-- bildirim alır — bu geri alınamaz (bildirim zaten gönderilmiş olur), sadece bu dosyanın
-- kendisi geri alınabilir (aşağıya bak).
--
-- NE YAPIYOR: university_notification_log'a (migration 0078/0080), işin kendi kodunun
-- (lib/universities/data-change-scan.ts) hesapladığı AYNI dört kaynağı (university,
-- requirement, deadline, statistics) aynı mantıkla hesaplayıp, ŞU AN VAR OLAN her isabeti
-- önceden "bildirildi" olarak işaretliyor — hiçbir bildirim göndermeden. Sonuç: iş ilk
-- çalıştığında bu isabetleri zaten-bildirilmiş görüp atlayacak, ve dedupe'un anlamı "bu
-- özellik canlıya çıktığından beri" olacak, "öğrenci ne zaman takip etmeye başladıysa o
-- zamandan beri" değil — ki ikincisi zaten yanlış ölçü, çünkü çoğu takip kaydı katalog
-- henüz tamamlanmadan oluşturuldu.
--
-- canonicalUniversityId/supersession haritası burada bilerek atlandı, iş kodunun aksine —
-- kontrol edildi, canlıda 9 superseded üniversite kaydı var ama şu an aktif hiçbir
-- target_universities satırı bunlardan birine işaret etmiyor (0/19), yani haritayı
-- uygulamak bugün hiçbir satırı değiştirmezdi. Gelecekte bir target superseded bir
-- üniversiteye işaret ederse bu basitleştirme artık doğru olmaz — o zaman bu dosya değil,
-- işin kendi canlı çalışması geçerli olur (aşağıdaki INSERT tek seferlik, deploy öncesi).
--
-- TEK İŞLEM: önceki dosyalarla aynı disiplin. Sonunda doğrulama sorgusu var.

BEGIN;

-- ══════════════════════════════════════════════════════════════════
-- Dört kaynağı işin kendi mantığıyla hesapla, üstüne yaz
-- ══════════════════════════════════════════════════════════════════
--
-- targets: aktif takip kayıtları (exploring/target/applying) — job'ın kendi
-- ACTIVE_TARGET_STATUSES'ıyla birebir aynı.
-- uni_hits: 'university' kaynağı — universities.last_changed_at, takip başlangıcından sonra.
-- req_hits/dl_hits: 'requirement'/'deadline' kaynağı — "yeni satır belirdi", en yeni
-- created_at, takip başlangıcından sonra (job'ın newestTimestampByUniversity'siyle aynı
-- "bir üniversite = bir haber" mantığı).
-- stat_hits: 'statistics' kaynağı — university_statistics.last_changed_at, en yenisi.
insert into public.university_notification_log (user_id, university_id, source, last_changed_at)
with targets as (
  select user_id, university_id, created_at
  from public.target_universities
  where status in ('exploring', 'target', 'applying')
),
uni_hits as (
  select t.user_id, t.university_id, 'university' as source, u.last_changed_at as ts
  from targets t
  join public.universities u on u.id = t.university_id
  where u.last_changed_at is not null and u.last_changed_at > t.created_at
),
req_hits as (
  select t.user_id, t.university_id, 'requirement' as source, max(r.created_at) as ts
  from targets t
  join public.university_requirements r on r.university_id = t.university_id
  where r.created_at > t.created_at
  group by t.user_id, t.university_id
),
dl_hits as (
  select t.user_id, t.university_id, 'deadline' as source, max(d.created_at) as ts
  from targets t
  join public.university_deadlines d on d.university_id = t.university_id
  where d.created_at > t.created_at
  group by t.user_id, t.university_id
),
stat_hits as (
  select t.user_id, t.university_id, 'statistics' as source, max(s.last_changed_at) as ts
  from targets t
  join public.university_statistics s on s.university_id = t.university_id
  where s.last_changed_at is not null and s.last_changed_at > t.created_at
  group by t.user_id, t.university_id
),
all_hits as (
  select * from uni_hits
  union all select * from req_hits
  union all select * from dl_hits
  union all select * from stat_hits
)
select user_id, university_id, source, ts
from all_hits
-- Aynı unique index'i kullanıyor (university_notification_log_dedupe_idx,
-- (user_id, university_id, source, last_changed_at)) — job'ın kendi upsert'inin
-- onConflict hedefiyle birebir aynı. Bu dosya iki kez çalıştırılırsa ikinci çalıştırma
-- hiçbir şey eklemez (satırlar zaten var), hata da vermez.
on conflict (user_id, university_id, source, last_changed_at) do nothing;

-- ══════════════════════════════════════════════════════════════════
-- Doğrulama
-- ══════════════════════════════════════════════════════════════════
select count(*) as toplam_arka_doldurulan_satir from public.university_notification_log;
-- Beklenen: 10 (2026-09-03 06:xx canlı ölçümü — 5 requirement + 5 deadline, 0
-- university/statistics; docs/job-dry-run-audit-2026-09-03.md'deki sayıyla eşleşmeli).
-- Eşleşmiyorsa COMMIT'ten önce dur — kataloga bu dosya yazıldıktan sonra yeni satır
-- eklenmiş olabilir, o zaman sayı değişir ve bu beklenen bir şey, ama görüp onaylaman
-- gerekir.

select user_id, university_id, source, last_changed_at
from public.university_notification_log
order by user_id, source;
-- Gözden geçir: her satır gerçek bir öğrenci + gerçek bir üniversite + dört kaynaktan
-- biri olmalı. Hiçbiri gelecekte olmamalı (last_changed_at bugünden sonra bir tarih).

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Bundan sonra ne olur
-- ══════════════════════════════════════════════════════════════════
--
-- notify-university-changes ilk çalıştığında (deploy sonrası, ilk 07:00) bu on satırı
-- zaten-bildirilmiş görüp atlayacak — kimseye bildirim gitmeyecek bu isabetler için.
-- Bundan sonra GERÇEKTEN yeni bir şey olursa (bir üniversite gerçekten last_changed_at'ini
-- güncellerse, ya da yeni bir requirement/deadline satırı gerçekten bugünden sonra
-- eklenirse) iş normal çalışır ve doğru şekilde bildirir — bu dosya mekanizmayı
-- değiştirmiyor, sadece bugüne kadarki geçmiş katalog çalışmasını "haber" olarak
-- saymaktan çıkarıyor.
--
-- Geri alma: bu satırları user_id/university_id/source/last_changed_at ile tek tek
-- silmek mümkün (id sütunu her satır için ayrı, gen_random_uuid()), ama normalde gerek
-- yok — dedupe kaydı, gerçek veriyi hiç değiştirmiyor.
