-- ORYN — sabah paketi 3/3: yedi kayıttan ikisinin gerçek düzeltmesi
-- Oluşturulma: 2026-09-03, canlı veritabanına (qtcvcflzxbuagvvwahhu) okuma yaparak.
--
-- Bağlam: docs/yedi-kapsanmayan-kayit-2026-09-03.md, 00-OKU-BENI.md'nin "Bekleyen veriyi
-- doldur" bölümü. O analiz bilerek SQL hazırlamamıştı — dördü de kurum adı doldurmakla
-- çözülemeyecek türden sorunlardı. oryn-a7 sonradan üçünü bana bıraktı: "Fix what's
-- fixable, propose disabling what isn't, and leave the Duke TIP rename for the founder."
-- Bu dosya o üçün SONUCU, dördüncüsü (Duke TIP) hâlâ dokunulmadı ve aşağıda AYRICA
-- açıklanıyor, çünkü kimliğini değiştirmek senin kararın.
--
-- ÖNEMLİ FARK, doc'un kendi varsayımından: doc "Exeter'in doğru adresi kaydın kendi
-- açıklamasında yazılı" diyordu — bu, kaydın NE DEDİĞİ hakkında doğru bir gözlemdi, ama
-- ben o adresi gerçekten fetch edip canlı olup olmadığını kontrol ettim ve HER İKİ aday
-- adres de (kaydın kendi açıklamasındaki NEIU CSSI-Extension sayfası VE Exeter'in kendi
-- preunisummerschool sayfası) şu an 404 veriyor. Google CSSI için gerçek, canlı, doğrulanmış
-- bir resmî sayfa buldum (Google'ın kendi g.co/cssi kısa linki oraya yönleniyor) — o yüzden
-- aşağıda SADECE Google CSSI'nin adres düzeltmesi var. Exeter'i buraya SQL olarak koymadım;
-- kendi bölümünde ayrıca anlatılıyor, çünkü "kaydın kendi açıklaması yanlıştı" farklı bir
-- karar gerektiriyor, "adresi düzelt" değil.
--
-- TEK İŞLEM: BEGIN/COMMIT arasında, önceki iki dosyayla aynı disiplin. Sonunda doğrulama
-- sorgusu var.

BEGIN;

-- ══════════════════════════════════════════════════════════════════
-- 1. Google Computer Science Institute (1da5f8df) — adres düzeltmesi
-- ══════════════════════════════════════════════════════════════════
--
-- Mevcut official_url (neiu.edu/academics/programs/computer-science-bs) NEIU'nun genel
-- lisans CS programı sayfası — Google CSSI ile ilgisi yok, doc'un kendi bulgusu buydu.
-- Kaydın AÇIKLAMASI da kendi adresini içeriyordu
-- (neiu.edu/.../google-computer-science-summer-institute-extension-cssi-extension), ama
-- bunu canlı kontrol ettim ve 404 döndü — hem bu tam yol hem de arama sonuçlarında çıkan
-- kısaltılmış varyantı (neiu.edu/academics/google-computer-science-summer-institute-...)
-- hem de neiu.edu/node/84511 hepsi 404.
--
-- Kaydın BAŞLIĞI "Google Computer Science Institute" — NEIU'ya özgü bir isim değil, Google'ın
-- kendi programının genel adı. Açıklama metni de Google'ın resmî sayfasındaki tanımla
-- neredeyse birebir aynı ("an online, four-week introduction to computer science... especially
-- students who identify with groups that have been historically marginalized"). NEIU adresi
-- muhtemelen kayıt toplanırken kullanılan belirli bir başvuru kanalıydı, kaydın asıl kimliği
-- değil — Duke TIP'ten farkı bu: kaydın başlığı zaten Google'ın kendi programını doğru
-- adlandırıyor, değişmesi gereken bir marka yok.
--
-- Yeni adres canlı doğrulandı 2026-09-03: g.co/cssi (Google'ın kendi kısa linki, sadece
-- Google oluşturabilir) buraya 302 ile yönleniyor:
update public.opportunities
set official_url = 'https://buildyourfuture.withgoogle.com/programs/computer-science-summer-institute/'
where id = '1da5f8df-9ea0-4a85-90ac-fa1539986611'
  and official_url = 'https://www.neiu.edu/academics/programs/computer-science-bs';

-- ══════════════════════════════════════════════════════════════════
-- 2. University of Maastricht, Netherlands (14db7109) — kapatma
-- ══════════════════════════════════════════════════════════════════
--
-- Şu an status=active, yani tarama listesinde görünüyor — 7'nin en acili. Başlık bir
-- kurum-ülke ifadesi ("University of Maastricht, Netherlands"), fırsat adı değil. Açıklama
-- bir ders izlencesi parçası ("Introduction to Data Science | Prerequisites: ..."),
-- official_url Maastricht'in kendi sayfasına değil summerschoolsineurope.eu adlı üçüncü
-- taraf bir dizine gidiyor. Google CSSI'den farkı: orada "asıl kimlik neydi" sorusunun net
-- bir cevabı vardı (Google'ın kendi programı); burada yok — hangi gerçek Maastricht
-- programına ait olduğunu gösteren hiçbir iz yok, sadece bir kurum adı ve alakasız bir
-- ders açıklaması. Zaten kapatılmış 3 örnekle (7aa517a3, b10444c7, 910ec94d) aynı şekil:
-- kaynağı yanlış temsil eden bir kayıt, doldurulabilir bir alan değil.
--
-- admin_action_log'a da yazıyor — panelin kendi disable_opportunity eyleminin izlediği
-- şekil (app/(app)/admin/actions.ts), elle çalıştırıldığı için admin_id burada seninkine
-- ayarlandı (sen çalıştırıyorsun), admin_label bunu açıkça not ediyor.
update public.opportunities
set status = 'disabled'
where id = '14db7109-25fd-4cd9-bb70-73797588bec8'
  and status = 'active';

insert into public.admin_action_log (admin_id, admin_label, action, target_label, detail)
select 'ccf2161e-4992-49ce-88b4-a76293f1dc1d', 'Ada Sarp KIRIK (sabah paketi, oryn-d0 hazırladı)', 'disable_opportunity',
       'University of Maastricht, Netherlands',
       jsonb_build_object(
         'from', 'active', 'to', 'disabled',
         'opportunityId', '14db7109-25fd-4cd9-bb70-73797588bec8',
         'reason', 'Kayıt geçerli bir fırsat değil: başlık kurum-ülke ifadesi, açıklama alakasız bir ders izlencesi parçası, official_url üçüncü taraf bir dizine gidiyor. docs/yedi-kapsanmayan-kayit-2026-09-03.md.'
       )
where exists (select 1 from public.opportunities where id = '14db7109-25fd-4cd9-bb70-73797588bec8' and status = 'disabled');

-- ══════════════════════════════════════════════════════════════════
-- Doğrulama
-- ══════════════════════════════════════════════════════════════════
select id, status, official_url from public.opportunities
where id in ('1da5f8df-9ea0-4a85-90ac-fa1539986611', '14db7109-25fd-4cd9-bb70-73797588bec8');
-- Beklenen: 1da5f8df -> official_url buildyourfuture.withgoogle.com ile bitmeli.
--           14db7109 -> status 'disabled' olmalı.

select action, target_label, detail from public.admin_action_log
where target_label = 'University of Maastricht, Netherlands' order by created_at desc limit 1;
-- Beklenen: bir satır, action='disable_opportunity'.

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- Buraya bilerek konulmayanlar
-- ══════════════════════════════════════════════════════════════════
--
-- 9b013735 (University of Exeter) — SQL YOK, bilerek. Kaydın kendi açıklamasındaki adres
-- (exeter.ac.uk/preunisummerschool) canlı 404 veriyor. Aynı bölümün başka sayfalarını
-- (apply/form, / ile) da denedim, hepsi 404 — Exeter'in "Business, Management & Economics,
-- Medicine & Healthcare, Law" odaklı, 15-18 yaş, pre-university programının o adı taşıyan
-- hiçbir güncel sayfası bulamadım. En yakın canlı sayfalar (exeter.ac.uk/study/
-- internationalsummerschool/ — üniversite öğrencileri için, lise değil; exeterisc.com —
-- ayrı bir marka, sadece Fen bilimi odaklı, farklı bir program) EŞLEŞMİYOR. Bu, doc'un
-- kendi varsayımını değiştiren yeni bir bulgu: "adres kaydın açıklamasında yazılıydı"
-- doğruydu ama "o yüzden basit bir düzeltme" yanlış çıktı. Önerim Maastricht'le aynı
-- muamele (kapatma) ama bu benim kendi araştırma kararım, senin ya da oryn-a7'nin daha
-- önce onayladığı bir şey değildi — bu yüzden SQL'e koymadım, sana bırakıyorum. İstersen:
--
--   update public.opportunities set status = 'disabled'
--   where id = '9b013735-8ae8-4175-8861-6022b3aaf9ce' and status = 'under_review';
--
-- 0ad4ccae (Duke TIP) — dokunulmadı, oryn-a7'nin açık talimatı. tip.duke.edu artık
-- provost.duke.edu'daki "Duke Pre-College Programs" sayfasına yönleniyor (canlı doğrulandı,
-- doc'ta da var) — program ölmedi, markası değişti. Bir kaydın kimliğini değiştirmek alan
-- düzeltmesi değil, o yüzden bu founder kararı.
--
-- 7aa517a3, b10444c7, 910ec94d — zaten status=disabled, doğru durumda, dokunulmadı.
