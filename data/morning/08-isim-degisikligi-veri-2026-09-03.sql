-- ORYN — sabah paketi 8: isim değişikliği, veritabanındaki öğrenciye görünen metin
-- Oluşturulma: 2026-09-03, canlı veritabanına (oryn-qa-scratch, qtcvcflzxbuagvvwahhu) okuma
-- yaparak.
--
-- BAĞLAM: docs/rename-inventory-proxola-2026-09-03.md — kod tabanının tamamı tarandı, ama bu
-- dosyanın kendi konusu kodun GÖREMEYECEĞİ yarısı: geçmişte AI tarafından üretilip veritabanına
-- yazılmış, "Oryn" kelimesini zaten içeren, öğrencinin gerçekten okuyacağı metin. Prompt'u
-- değiştirmek bu satırları geriye dönük düzeltmiyor — onlar zaten yazıldı.
--
-- KAPSAM, oryn-45'in doğrudan talimatıyla dar tutuldu — SADECE öğrenciye görünen 6 kategori:
--   student_requirement_evaluations.reasoning (112 satır, tek bir kalıp cümle)
--   weekly_actions.reason (6), notifications.body (2), weekly_plans.summary (2),
--   ai_recommendations.reason (2), opportunities.description (4 — SADECE marka adı geçen kısım)
--
-- BİLEREK DIŞARIDA BIRAKILAN (aşağıda da ayrıca anlatılıyor): ~750 satırlık araştırma-
-- doğrulama provenance metni (verification_status_input, çeşitli notes, evidence_summary),
-- ORYN-PRG-NNNN kayıt numarası şeması, oryn_global_id (canlı bir kolon/kısıt/view alanı —
-- şema değişikliği, bu dosyanın işi değil), oryn_public (henüz uygulanmamış bir migration'daki
-- enum etiketi), test/QA sabit verileri (oryn.qa.a, "Oryn Test High School" vb.).
--
-- YÖNTEM: replace(), tam metni yeniden yazmak değil — aynı ifade zaten "Proxola" olmuş bir
-- satırda WHERE koşulu artık eşleşmez, yani bu dosya YANLIŞLIKLA İKİ KEZ çalıştırılırsa ikinci
-- çalıştırma hiçbir şey yapmaz (satırı bozmaz, "ProxolaProxola" gibi bir şey üretmez). Bu,
-- oryn-45'in özellikle istediği disiplin.
--
-- KONTROL EDİLDİ, VARSAYILMADI: her tablo için gerçek satır sayısı bu dosya yazılmadan hemen
-- önce yeniden sorgulandı (aşağıdaki sayılarla birebir eşleşiyor). opportunities.description
-- için İKİ ayrı büyük/küçük harf biçimi var — 3 satır "Oryn" (baş harf büyük), 1 satır "ORYN"
-- (hepsi büyük, first.global kaydı) — ikisi de aşağıda ayrı ayrı replace() ile karşılanıyor,
-- tek bir case-insensitive değişim yerine, çünkü bu tablodaki hiçbir gerçek marka geçişi
-- küçük harfle ("oryn") yazılmamış; case-sensitive tutmak, açıklama içinde tesadüfen geçebilecek
-- alakasız bir "oryn" alt dizisini (örn. bir URL parçası) yanlışlıkla değiştirme riskini de
-- ortadan kaldırıyor.
--
-- AYRICA ÇALIŞTIRIP DOĞRULADIM: bu dosyadaki 6 UPDATE'in birebir aynısını canlıda
-- BEGIN/ROLLBACK içinde gerçekten çalıştırdım (kalıcı hiçbir şey yazılmadı) — 5 tablo ilk
-- denemede beklenen sayıyla eşleşti, ama opportunities'de ilk doğrulama sorgum "3" gördü, "4"
-- beklerken. Sebep UPDATE'de değil, benim doğrulama sorgumdaydı: sadece "Proxola" (baş harf
-- büyük) arıyordum, ama 4 satırdan biri (ORYN, hepsi büyük) doğru şekilde "PROXOLA" (hepsi
-- büyük) oldu — sadece o biçimi de aramadığım için görünmüyordu. UPDATE'in kendisi ilk
-- denemede doğruydu; aşağıdaki doğrulama sorgusu bu yüzden hem "Proxola" hem "PROXOLA" arıyor.
--
-- HANGİSİ KENDİLİĞİNDEN DÜZELİR, HANGİSİ BU DOSYA OLMADAN DÜZELMEZ — açıkça:
--   student_requirement_evaluations.reasoning ve opportunities.description'ın DOĞAL BİR
--   YENİLENME DÖNGÜSÜ YOK — ilki bir gereksinim yeniden değerlendirilmedikçe, ikincisi bir
--   fırsat yeniden araştırılmadıkça hep aynı kalır. Bu dosya çalışmazsa, "Oryn" bu satırlarda
--   SÜRESİZ kalır.
--   weekly_actions.reason / weekly_plans.summary / notifications.body / ai_recommendations.reason
--   ise haftalık plan üretiminin (spec Phase 9, düzenli tekrarlanan bir süreç) ÇIKTISI — aktif
--   bir öğrenci için, prompt kod tarafında düzeltildikten sonra üretilecek BİR SONRAKİ haftalık
--   plan zaten "Proxola" diyecek ve bu satırların yerini alacak. Yani "bekle, kendiliğinden
--   düzelir" burada GERÇEKTEN DÜRÜST bir seçenek — pencere birkaç gün, süresiz değil. Satır
--   sayıları (2-6) o kadar küçük ki dahil etmenin maliyeti sıfıra yakın, o yüzden yine de bu
--   dosyaya kondu — ama istersen bu dört tabloyu atlayıp haftanın kendiliğinden dönmesini
--   bekleyebilirsin, o da yanlış olmaz.
--
-- TEK İŞLEM: önceki dosyalarla aynı disiplin. Sonunda doğrulama sorgusu var.

BEGIN;

-- ══════════════════════════════════════════════════════════════════
-- 1. student_requirement_evaluations.reasoning — 112 satır, tek kalıp cümle
-- ══════════════════════════════════════════════════════════════════
-- Requirement Check ekranında (spec Phase 69) doğrudan öğrenciye gösteriliyor. Doğal yenilenme
-- yok — bu dosya çalışmazsa süresiz "Oryn" kalır.
update public.student_requirement_evaluations
set reasoning = replace(reasoning, 'Oryn', 'Proxola')
where reasoning like '%Oryn%';

-- ══════════════════════════════════════════════════════════════════
-- 2. weekly_actions.reason — 6 satır
-- ══════════════════════════════════════════════════════════════════
-- Haftalık planın parçası. Doğal yenilenme VAR (Phase 9) — bir sonraki üretimde kendiliğinden
-- düzelir, ama satır sayısı küçük olduğu için yine de burada.
update public.weekly_actions
set reason = replace(reason, 'Oryn', 'Proxola')
where reason like '%Oryn%';

-- ══════════════════════════════════════════════════════════════════
-- 3. notifications.body — 2 satır
-- ══════════════════════════════════════════════════════════════════
-- Doğal yenilenme VAR (aynı haftalık üretim döngüsünün bildirim tarafı).
update public.notifications
set body = replace(body, 'Oryn', 'Proxola')
where body like '%Oryn%';

-- ══════════════════════════════════════════════════════════════════
-- 4. weekly_plans.summary — 2 satır
-- ══════════════════════════════════════════════════════════════════
-- Doğal yenilenme VAR — weekly_actions.reason ile aynı üretim olayının özet alanı.
update public.weekly_plans
set summary = replace(summary, 'Oryn', 'Proxola')
where summary like '%Oryn%';

-- ══════════════════════════════════════════════════════════════════
-- 5. ai_recommendations.reason — 2 satır
-- ══════════════════════════════════════════════════════════════════
-- Doğal yenilenme bu tablo için genel bir garanti değil (öneri türüne göre değişir) —
-- güvenli tarafta kalmak için burada.
update public.ai_recommendations
set reason = replace(reason, 'Oryn', 'Proxola')
where reason like '%Oryn%';

-- ══════════════════════════════════════════════════════════════════
-- 6. opportunities.description — 4 satır, SADECE marka adı
-- ══════════════════════════════════════════════════════════════════
-- Bu 4 satırın açıklaması, öğrenciye görünen fırsat metniyle aynı alanda analist notları da
-- taşıyor (docs/rename-inventory-proxola-2026-09-03.md'de ayrıca anlatıldı) — o karışıklığı
-- BUGÜN düzeltmiyoruz, oryn-45'in açık talimatı: "renaming is not the moment to also start
-- editing descriptions." Sadece "Oryn"/"ORYN" alt dizisi değişiyor, başka hiçbir kelime
-- dokunulmuyor. Doğal yenilenme YOK (bir fırsat yeniden araştırılmadıkça hep aynı kalır).
update public.opportunities
set description = replace(replace(description, 'ORYN', 'PROXOLA'), 'Oryn', 'Proxola')
where description like '%Oryn%' or description like '%ORYN%';

-- ══════════════════════════════════════════════════════════════════
-- Doğrulama
-- ══════════════════════════════════════════════════════════════════
select 'student_requirement_evaluations' as tablo, count(*) as kalan_oryn_satiri
from public.student_requirement_evaluations where reasoning like '%Oryn%'
union all
select 'weekly_actions', count(*) from public.weekly_actions where reason like '%Oryn%'
union all
select 'notifications', count(*) from public.notifications where body like '%Oryn%'
union all
select 'weekly_plans', count(*) from public.weekly_plans where summary like '%Oryn%'
union all
select 'ai_recommendations', count(*) from public.ai_recommendations where reason like '%Oryn%'
union all
select 'opportunities', count(*) from public.opportunities where description like '%Oryn%' or description like '%ORYN%';
-- Beklenen: her satırda kalan_oryn_satiri = 0. Başka bir sayı çıkarsa COMMIT'ten önce dur.

select 'student_requirement_evaluations' as tablo, count(*) as yeni_proxola_satiri
from public.student_requirement_evaluations where reasoning like '%Proxola%'
union all
select 'weekly_actions', count(*) from public.weekly_actions where reason like '%Proxola%'
union all
select 'notifications', count(*) from public.notifications where body like '%Proxola%'
union all
select 'weekly_plans', count(*) from public.weekly_plans where summary like '%Proxola%'
union all
select 'ai_recommendations', count(*) from public.ai_recommendations where reason like '%Proxola%'
union all
select 'opportunities', count(*) from public.opportunities where description like '%Proxola%' or description like '%PROXOLA%';
-- Beklenen: 112, 6, 2, 2, 2, 4 — bu dosyanın en üstündeki sayılarla birebir aynı.
-- opportunities için İKİ biçim aranıyor (Proxola VE PROXOLA) çünkü 4 satırdan 1'i (first.global,
-- daha önce hepsi büyük harf "ORYN" idi) artık hepsi büyük harf "PROXOLA" olacak — sadece
-- "Proxola" arasaydık bu satırı kaçırır, UPDATE doğru çalıştığı hâlde "3 çıktı, 4 bekleniyordu"
-- diye yanlış alarm verirdik. Bu dosya BEGIN/ROLLBACK ile canlıda gerçekten test edildi (hiçbir
-- şey kalıcı yazılmadı) ve UPDATE'in kendisi ilk denemede doğruydu — yanlış olan ilk taslağın
-- doğrulama sorgusuydu, burada düzeltildi.

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Buraya bilerek konulmayan
-- ══════════════════════════════════════════════════════════════════
--
-- ~750 satırlık araştırma-doğrulama provenance metni (verification_status_input,
-- current_university_student_counts/global_university_discovery_queue/university_programs/
-- university_profile_metrics'in notes kolonları, entity_evidence.evidence_summary) — "ORYN
-- 4 mevcut kaydı ile karşılaştırıldı" türünden, bir veri noktasının NASIL doğrulandığını
-- kaydeden iç metin. Bunlar docs/ altındaki tarihli bir audit dosyasının veritabanı karşılığı —
-- geriye dönük değiştirmek, o audit'i yeniden yazmakla aynı hata. Öğrenci hiçbir zaman görmüyor.
--
-- ORYN-PRG-NNNN (program_research_queue.research_program_id, ~221 satır, artı aynı şemayı
-- kullanan kardeş tabloların notes alanları) — başka tablolarla eşleşme anahtarı olarak
-- kullanılıp kullanılmadığı doğrulanmadı. Doğrulanmamış olan dokunulmaz.
--
-- oryn_global_id — university_profile_verification_queue'de canlı bir kolon, bir unique kısıt,
-- universities.external_ids üzerinde bir JSONB anahtar kuralı, ve
-- current_university_student_counts view'ının bir çıktı alanı. Şema değişikliği gerektirir
-- (ALTER TABLE ... RENAME COLUMN + view + JSONB anahtarını okuyan her yer) — bu dosyanın kapsamı
-- değil, ayrı bir migration kararı.
--
-- oryn_public — post_visibility enum'ının bir etiketi, iki RLS policy'sinde kullanılıyor
-- (supabase/migrations/0058_social_posts.sql). O migration HENÜZ CANLIYA UYGULANMADI — yani bu
-- etiket bugün gerçek bir şema nesnesi değil, sadece dosyada. Uygulandığı gün ayrıca ele
-- alınmalı, bugün değil.
--
-- Test/QA sabit verileri ("Oryn Test High School" — canonical_entities/entity_aliases/
-- entity_verification_queue; profiles.display_name'de oryn.qa.a / oryn.qa.b / "Oryn QA Sweep";
-- contact_info.email'de test@oryn.dev; evidence_files.file_path'te ORYN_QA_Test_Evidence...) —
-- gerçek bir isim değişikliği sorusu değil, kendi başına bir temizlik konusu. Dokunulmadı.
--
-- admin_action_log.admin_label'daki "oryn-d0" gibi filo oturum kod adları — ürün markası değil,
-- bu gece çalışan ajan oturumlarının kendi adlandırma kuralı. Dokunulmadı.
