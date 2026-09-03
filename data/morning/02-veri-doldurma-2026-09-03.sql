-- ORYN — sabah paketi 2/2: bekleyen veri düzeltmeleri
-- Yeniden oluşturuldu: 2026-09-03 04:10.
--
-- ═══ SIRA KRİTİK ═══
-- Bu dosyalar birbirinden bağımsız yazıldı ve AYNI KAYITLARA dokunuyorlar. Ölçtüm:
-- 84 satırlık toplu doğrulamanın 83'ü, 190 satırlık kurum doldurmayla aynı kayıtta;
-- 59 satırlık dönem doğrulamasının 46'sı da öyle. Sıra yanlış olsaydı, sayfası tek tek
-- açılarak doğrulanmış bir kurum adı, JSONL'den gelen tahmini bir değerle EZİLİRDİ.
-- Aşağıdaki sıra bunu çözüyor: önce korumalı doldurma (yalnızca boşu doldurur), sonra
-- tek tek doğrulanmış dosyalar (korumasız, üstüne yazar). Kazanan her zaman birinin
-- gerçekten sayfasına baktığı değer oluyor.
--
-- ═══ İŞLEM KOMUTLARI ÇIKARILDI ═══
-- Kaynak dosyaların üçü kendi `begin;`/`commit;`'ini taşıyordu. Olduğu gibi bıraksaydım
-- İLK içerideki `commit;` aşağıdaki BEGIN'i kapatır, sonrasındaki her şey işlem dışında
-- çalışırdı — yani "biri patlarsa hiçbiri uygulanmaz" garantisi sessizce kaybolurdu.
-- Her biri yorum satırına çevrildi ve nerede olduğu yazıyor.
--
-- KORUMA: kurum doldurmanın her UPDATE'ine "AND (organization IS NULL OR btrim = '')"
-- eklendi; kaynak dosyalarda yoktu. İkinci çalıştırma 0 satır günceller — hata değil.
--
-- BURADA OLMAYAN: 35 satırlık açıklama temizliği (panelin önizle-uygula ekranından geçecek)
-- ve tek tek kayıt düzeltmeleri (03-firsat-kayit-duzeltmeleri).

BEGIN;


-- ══════════════════════════════════════════════════════════════════
-- 1) Kurum adı doldurma — 190 kayıt, KORUMALI
-- ══════════════════════════════════════════════════════════════════

-- kaynak: data/research/opportunities/organization_backfill_2026-09-02.sql
-- '67th London International Youth Science Forum (LIYSF) - 2026'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'London International Youth Science Forum' WHERE id = 'c7223aea-7bb9-4b29-b59d-a054d7bfa02c' AND (organization IS NULL OR btrim(organization) = '');
-- 'Acıbadem Üniversitesi Lise Yaz Programları'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'a4451907-20af-43d3-8498-25a3829254c1' AND (organization IS NULL OR btrim(organization) = '');
-- 'AI Scholars'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Carnegie Mellon University' WHERE id = '3f7170ba-9486-40b0-b450-42462471e88d' AND (organization IS NULL OR btrim(organization) = '');
-- 'Andover Summer at Phillips Academy 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Academy Andover' WHERE id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb' AND (organization IS NULL OR btrim(organization) = '');
-- 'AwesomeMath Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'AwesomeMath' WHERE id = 'cfe42a66-3688-43aa-8e7e-61ffca68adb8' AND (organization IS NULL OR btrim(organization) = '');
-- 'Bahçeşehir Üniversitesi Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bahçeşehir Üniversitesi (BAU)' WHERE id = 'de7ab9aa-74a5-43d1-b02f-2730b2aed80f' AND (organization IS NULL OR btrim(organization) = '');
-- 'Bentley University Pre-College Programs'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bentley University' WHERE id = '9e601648-0d30-462e-b9f0-8d069392f29f' AND (organization IS NULL OR btrim(organization) = '');
-- 'BETA Camp'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Prequel' WHERE id = 'd70e5392-9f0d-4191-8c8d-4921dbaa3651' AND (organization IS NULL OR btrim(organization) = '');
-- 'Boğaziçi Uni Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '19248dee-8118-47ee-9f5b-866b0d754be8' AND (organization IS NULL OR btrim(organization) = '');
-- 'BRAND-ED'  (source: data/research/opportunities/s5a_batch3_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'BRAND-ED' WHERE id = '72b66f92-1356-4827-9139-530db7c52c74' AND (organization IS NULL OR btrim(organization) = '');
-- 'Brown University (RI, USA)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Brown University Pre-College Programs' WHERE id = 'c2444f7f-e137-411d-9a14-c1ba8052e217' AND (organization IS NULL OR btrim(organization) = '');
-- 'Cambridge Future Scholars Programme'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Cambridge Scholars'' Programme Ltd (independent company)' WHERE id = '70519f22-f165-44cf-b954-a3ab864077e0' AND (organization IS NULL OR btrim(organization) = '');
-- 'Carnegie Mellon University (PA, USA)'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Carnegie Mellon University' WHERE id = 'b4091e25-c8ca-4042-9976-ee41ae4031d5' AND (organization IS NULL OR btrim(organization) = '');
-- 'Civic Leadership Institute (Grades 9-12)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '8a302e54-e237-49f7-9757-9b5262ae592b' AND (organization IS NULL OR btrim(organization) = '');
-- 'Clark Scholars Program'  (source: data/research/opportunities/dlopp_sp_batch5.jsonl)
UPDATE opportunities SET organization = 'Texas Tech University' WHERE id = '676bc788-9ce0-4bf8-873a-d5e897a24ccf' AND (organization IS NULL OR btrim(organization) = '');
-- 'College Edge Summer'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = '40ef389f-b58f-447d-87b4-b7deb3effe2a' AND (organization IS NULL OR btrim(organization) = '');
-- 'Columbia Spring Immersion Program'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = 'f912de6d-7da6-4e21-811b-1da09b10c86c' AND (organization IS NULL OR btrim(organization) = '');
-- 'Columbia University: New York, NY'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = '17d177de-6ca7-4754-ab15-3a9dd93f4893' AND (organization IS NULL OR btrim(organization) = '');
-- 'Coriell Institute for Medical Research, NJ, USA'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Coriell Institute for Medical Research' WHERE id = 'eee7b96a-b38b-4944-a60c-69ae953c2ca0' AND (organization IS NULL OR btrim(organization) = '');
-- 'Cornell University'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Cornell University, School of Continuing Education' WHERE id = '9caff85d-6976-422e-8fa1-6893eaefa54c' AND (organization IS NULL OR btrim(organization) = '');
-- 'CTY: Intensive Studies for 7th Graders and Above'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = 'd224a324-b3c0-4a5f-a361-3805efc20a14' AND (organization IS NULL OR btrim(organization) = '');
-- 'DigiPen Academy Pre-College Summer Programs 2025'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'DigiPen Institute of Technology' WHERE id = '036f80e1-7ae5-46a9-8b68-6a890d50f8b8' AND (organization IS NULL OR btrim(organization) = '');
-- 'Downing College University of Cambridge - 2026'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Downing College, University of Cambridge -- International Programme (verify institutional affiliation; college-run, not necessarily university-wide)' WHERE id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220' AND (organization IS NULL OR btrim(organization) = '');
-- 'Durham University Global Futures Summer School 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Durham University' WHERE id = '5af50558-fcb5-4390-a8ff-5a6946e65862' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of Edinburgh Pre-University Summer School 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Edinburgh, Centre for Open Learning' WHERE id = 'dc762fce-b83a-4217-a610-290ac2f65f17' AND (organization IS NULL OR btrim(organization) = '');
-- 'Fordham University: New York, NY'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Fordham University' WHERE id = '76a53c74-ea3a-4951-84af-a3e108a62d2c' AND (organization IS NULL OR btrim(organization) = '');
-- 'Frontiers Overview'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Worcester Polytechnic Institute (WPI)' WHERE id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b' AND (organization IS NULL OR btrim(organization) = '');
-- 'Future Ready Summer Experience Program 2025 | Inspiring Global Citizens'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Renison University College, University of Waterloo' WHERE id = '053114c6-b049-4eab-b7e1-b081efe183c9' AND (organization IS NULL OR btrim(organization) = '');
-- 'Galatasaray University High School Summer Programs 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Galatasaray University' WHERE id = 'b3e40e31-a82d-4a34-bceb-b841f20d7296' AND (organization IS NULL OR btrim(organization) = '');
-- 'George Washington University: Washington, DC'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'George Washington University' WHERE id = 'aeeb130a-30f6-440f-867e-861cd723a6db' AND (organization IS NULL OR btrim(organization) = '');
-- 'Georgetown University HOYA Summer-High School Sessions'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Georgetown University School of Medicine' WHERE id = 'a78975de-a35f-4030-b4fd-88a724b653ae' AND (organization IS NULL OR btrim(organization) = '');
-- 'Global Issues at Princeton: Grades 10-12'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '4f668b96-af7e-4595-a097-7447a230004c' AND (organization IS NULL OR btrim(organization) = '');
-- 'HKUST I·ELITE Pre-University Scholars Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Hong Kong University of Science and Technology (HKUST)' WHERE id = 'f3cda419-64ae-4bac-bda9-3d1c6ccbbc37' AND (organization IS NULL OR btrim(organization) = '');
-- 'Horizon Inspires'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Horizon Inspires' WHERE id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8' AND (organization IS NULL OR btrim(organization) = '');
-- 'HSHSP (High School Honors Math, Science and Engineering Program)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Michigan State University College of Education' WHERE id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0' AND (organization IS NULL OR btrim(organization) = '');
-- 'iD Tech Camps'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'iD Tech' WHERE id = '1b636769-b88d-4c54-a270-79c3f68a044c' AND (organization IS NULL OR btrim(organization) = '');
-- 'IE JAB (Junior Advisory Board)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'IE University' WHERE id = '5eff8569-58f3-48fd-89ba-a320725b6321' AND (organization IS NULL OR btrim(organization) = '');
-- 'Illinois Institute of Technology: Chicago, IL'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Illinois Institute of Technology' WHERE id = 'f05643c5-88fa-477c-ac16-8de0b0b547bc' AND (organization IS NULL OR btrim(organization) = '');
-- 'Inspirit AI + Healthcare and Medicine'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Inspirit AI' WHERE id = 'f54d2f62-6335-4f19-a05f-f03c3e47bc40' AND (organization IS NULL OR btrim(organization) = '');
-- 'Institute for Advanced Critical and Cultural Studies, Carlisle, PA: Grades 10-12'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '4c7f5a9f-79d0-42df-8343-fc6a4983fe8d' AND (organization IS NULL OR btrim(organization) = '');
-- 'International Research Institute of North Carolina (IRI)'  (source: data/research/opportunities/s5b_batch2_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'International Research Institute of North Carolina' WHERE id = '09b42a46-cd61-4576-bc5a-565975c66d05' AND (organization IS NULL OR btrim(organization) = '');
-- 'International Summer School for Young Physicists (ISSYP)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Perimeter Institute for Theoretical Physics' WHERE id = '8980e51b-9889-4cb0-a6dc-e11a60a59e51' AND (organization IS NULL OR btrim(organization) = '');
-- 'International Summer Schools St Andrews, Cambridge and Yale Universities (ISSOS)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'ISSOS (organizing legal entity not independently confirmed this session)' WHERE id = 'f52db280-638a-49ec-a972-d1658b046234' AND (organization IS NULL OR btrim(organization) = '');
-- 'iStar Class Credit and Research Program'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'IPERC Academy' WHERE id = '83bbb28b-437b-4ab1-9a3d-45c23d061539' AND (organization IS NULL OR btrim(organization) = '');
-- 'John Locke Institute (JLI) Courses'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'John Locke Institute' WHERE id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2' AND (organization IS NULL OR btrim(organization) = '');
-- 'Johns Hopkins Engineering Innovation Pre-College Programs'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins University, Whiting School of Engineering' WHERE id = '6d3a439a-433e-4cce-b155-4dfd4cb53b48' AND (organization IS NULL OR btrim(organization) = '');
-- 'Kadir Has Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Kadir Has University, sponsored by Kadir Has Foundation' WHERE id = 'ee5d3870-77a8-43e5-8800-8738f6318d5f' AND (organization IS NULL OR btrim(organization) = '');
-- 'Kode With Klossy'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Kode With Klossy' WHERE id = '455e6fb3-7592-45d4-852a-602acd95bd81' AND (organization IS NULL OR btrim(organization) = '');
-- 'Leangap'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Leangap' WHERE id = 'b5d022aa-302a-4712-b960-a5f70386af17' AND (organization IS NULL OR btrim(organization) = '');
-- 'Lumiere Education'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'Lumiere Education' WHERE id = 'bc678344-c213-4ae8-a4f8-48af2856338f' AND (organization IS NULL OR btrim(organization) = '');
-- 'Mathworks (Honors Summer Math Camp)'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Texas State University, Mathworks' WHERE id = 'ccc1ff13-8673-4ba0-95fc-17050eee4306' AND (organization IS NULL OR btrim(organization) = '');
-- 'NEW! The Immerse Cambridge Experience: A one-week taster program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = 'dc0b92eb-5887-4163-8b71-1c3a4ab3bf80' AND (organization IS NULL OR btrim(organization) = '');
-- 'Northwestern University'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Northwestern University Center for Talent Development (CTD)' WHERE id = 'af30653c-94d1-4ce2-8781-b60e659d48ef' AND (organization IS NULL OR btrim(organization) = '');
-- 'NYU High School Law Institute'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'NYU School of Law (student-run organization)' WHERE id = '6d62d570-533a-49a4-9f86-aecf5e316b58' AND (organization IS NULL OR btrim(organization) = '');
-- 'NYU Tandon Machine Learning Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'NYU Tandon School of Engineering' WHERE id = '08ee973d-9dce-485e-b2f2-51deeb48c2ff' AND (organization IS NULL OR btrim(organization) = '');
-- 'Oxford Royale'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Oxford Programs Limited (independent company)' WHERE id = '6f80e90f-7d85-4c93-b833-f47cbbf6b0c3' AND (organization IS NULL OR btrim(organization) = '');
-- 'Oxford Royale Summer Schools'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Oxford Programs Limited (independent company)' WHERE id = '7cfc009f-d826-44d8-9d14-d33ef3c1475c' AND (organization IS NULL OR btrim(organization) = '');
-- 'Özyeğin University Summer School 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Özyeğin University' WHERE id = '78c7c178-d6dd-4d50-a76f-b44ebd603784' AND (organization IS NULL OR btrim(organization) = '');
-- 'PACT Program in Algorithmic and Combinatorial Thinking'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'PACT (affiliated with University of Pennsylvania / Princeton per historical hosting)' WHERE id = '9d4f568b-f14b-4925-bf79-753088583ffe' AND (organization IS NULL OR btrim(organization) = '');
-- 'Phillips Exeter Academy'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Exeter Academy' WHERE id = '7761f771-fd60-48d8-a51f-152349051747' AND (organization IS NULL OR btrim(organization) = '');
-- 'Phillips Exeter Academy - New Hampshire NH'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Exeter Academy' WHERE id = 'f069afec-005f-43a8-82f2-6869785ad6f1' AND (organization IS NULL OR btrim(organization) = '');
-- 'Polygence'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'Polygence' WHERE id = '0337369f-bb69-47e5-aa82-d4a0e92a674b' AND (organization IS NULL OR btrim(organization) = '');
-- 'Pre-Baccalaureate Program'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Wharton School, University of Pennsylvania (Wharton Global Youth Program)' WHERE id = 'bbb81017-3570-4a13-8e82-e4bf612b3436' AND (organization IS NULL OR btrim(organization) = '');
-- 'Pre-College Summer Programs (Immersion/Stones and Bones/Summer Bridge/Summer College)'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Chicago' WHERE id = '9f1b802e-cbc1-4af2-98f1-ffddfa06140b' AND (organization IS NULL OR btrim(organization) = '');
-- 'PreCollege at Ringling College of Art and Design'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Ringling College of Art and Design' WHERE id = 'fd51d7f8-1408-4d58-9558-47520758df3d' AND (organization IS NULL OR btrim(organization) = '');
-- 'PROMED Projects 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Premed Projects' WHERE id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801' AND (organization IS NULL OR btrim(organization) = '');
-- 'RISD Pre-College Rhode Island School of Design'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Rhode Island School of Design (RISD)' WHERE id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4' AND (organization IS NULL OR btrim(organization) = '');
-- 'RISE (Research in Science and Engineering) at BU'  (source: data/research/opportunities/wave1_2026-08-18_groupB.jsonl)
UPDATE opportunities SET organization = 'Boston University' WHERE id = '1e54b150-ceb2-4c22-92b9-a0d93fc34df6' AND (organization IS NULL OR btrim(organization) = '');
-- 'Robomaster High School Summer Camp (Shenzhen, China)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Southern University of Science and Technology and DJI' WHERE id = '69be38ed-9d26-46e3-aaf1-4819fa83f6ca' AND (organization IS NULL OR btrim(organization) = '');
-- 'Sabancı University Summer School 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Sabancı University' WHERE id = 'aaf5b259-4e72-4cba-85a9-43be675384aa' AND (organization IS NULL OR btrim(organization) = '');
-- 'Sevenoaks School Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Sevenoaks School' WHERE id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653' AND (organization IS NULL OR btrim(organization) = '');
-- 'SSTP'  (source: data/research/opportunities/dlopp_sp_batch6.jsonl)
UPDATE opportunities SET organization = 'University of Iowa (Belin-Blank Center)' WHERE id = '3533791e-62a7-49b7-a983-469a8a1c2514' AND (organization IS NULL OR btrim(organization) = '');
-- 'Stanford Institutes of Medicine Summer Program (SIMR)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Stanford School of Medicine' WHERE id = '8f0a8a3f-6c12-4277-91ca-7d120222b231' AND (organization IS NULL OR btrim(organization) = '');
-- 'Stanford Summer Humanities Institute'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Stanford Pre-Collegiate Studies' WHERE id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7' AND (organization IS NULL OR btrim(organization) = '');
-- 'Student Science Training Program'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Florida, Center for Precollegiate Education and Training (CPET)' WHERE id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55' AND (organization IS NULL OR btrim(organization) = '');
-- 'Summer High School Programs - at BU'  (source: data/research/opportunities/dlopp_sp_batch1.jsonl)
UPDATE opportunities SET organization = 'Boston University' WHERE id = 'e03e1172-cc32-4c92-8eff-668cd6ea6fe7' AND (organization IS NULL OR btrim(organization) = '');
-- 'Summer Science Research Program (SSRP) 2023'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'The Rockefeller University - RockEDU Science Outreach' WHERE id = 'a29d4ef0-735f-4281-b486-51c1450077eb' AND (organization IS NULL OR btrim(organization) = '');
-- 'Summer@Brown'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Brown University Pre-College Programs' WHERE id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Juilliard School - Juilliard Pre-College'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'The Juilliard School' WHERE id = '382cab93-7abd-4d0b-b7f8-d566395c056a' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Rockefeller University Summer Science Research Program (SSRP)'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'The Rockefeller University - RockEDU Science Outreach' WHERE id = '2bbea7da-09bb-4eca-b46b-c3b5363e3b92' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Summer School of the Polytechnic University of Milan (POLIMI) 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Politecnico di Milano' WHERE id = '8e5c10af-aebb-449c-9811-fed9dcc14039' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Wall Street 101 Summer Pre-College Program'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bentley University' WHERE id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514' AND (organization IS NULL OR btrim(organization) = '');
-- 'Tufts College Experience (For-credit 6 week program)'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Tufts University' WHERE id = '52a60b8e-7ac5-4258-b91f-09a34b9ad35d' AND (organization IS NULL OR btrim(organization) = '');
-- 'Tulane University Pre-College, New Orleans'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Tulane University' WHERE id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7' AND (organization IS NULL OR btrim(organization) = '');
-- 'UC Berkeley Business Academy for Youth'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC Berkeley Haas School of Business' WHERE id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c' AND (organization IS NULL OR btrim(organization) = '');
-- 'UC San Diego Futures Programs'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC San Diego Division of Extended Studies' WHERE id = '10a944b3-26de-4bcc-a408-baa5b57e6c81' AND (organization IS NULL OR btrim(organization) = '');
-- 'UCL The Bartlett Summer Schools 2025'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University College London (UCL), The Bartlett School of Architecture' WHERE id = 'eaabbbee-17f6-4142-b9b4-a49bfa87fa7b' AND (organization IS NULL OR btrim(organization) = '');
-- 'UCSB Research Mentorship Programs'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'UC Santa Barbara Summer Sessions' WHERE id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90' AND (organization IS NULL OR btrim(organization) = '');
-- 'UniHive Summer Programmes hosted at the University of Cambridge'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UniHive Education' WHERE id = 'f9b261e6-69fb-4c1e-b7f9-ec9870ba79ac' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of Applied Sciences and Arts of Western Switzerland'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'HEIA-FR (School of Engineering and Architecture of Fribourg), part of HES-SO' WHERE id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of Bath International Summer School'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Bath' WHERE id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of California, Santa Barbara, CA, USA'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC Santa Barbara' WHERE id = 'ce7d618b-debf-4508-87e1-f6905540bf8d' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of Chicago Chicago, IL'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Chicago' WHERE id = '16ab0b91-6ecd-463a-a0bf-85f9376c67a9' AND (organization IS NULL OR btrim(organization) = '');
-- 'USC Pre-College Summer Programs'  (source: data/research/opportunities/wave1_2026-08-18_groupD.jsonl)
UPDATE opportunities SET organization = 'University of Southern California' WHERE id = '4a54159a-58dd-4304-a139-2b76f2a9fe38' AND (organization IS NULL OR btrim(organization) = '');
-- 'University of the Arts London - The UAL International Summer School'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of the Arts London (UAL)' WHERE id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1' AND (organization IS NULL OR btrim(organization) = '');
-- 'UWC Türkiye (United World Colleges)'  (source: data/research/opportunities/s7_MASTER_consolidated.jsonl)
UPDATE opportunities SET organization = 'UWC International, via the UWC Türkiye National Committee (volunteer-run)' WHERE id = '97fa39ad-8c65-4603-a07d-c88fe22982ef' AND (organization IS NULL OR btrim(organization) = '');
-- 'Vesalius College: Brussels, Belgium Innovative Entrepreneurship Summer Programme'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Vesalius College (institutional successor unclear)' WHERE id = '53ae13de-cbc9-443f-b668-5b557d9a1290' AND (organization IS NULL OR btrim(organization) = '');
-- 'Warwick University Pre-University Summer Programme 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Warwick' WHERE id = 'ff5d9710-80d3-47ae-959a-b8b40406f003' AND (organization IS NULL OR btrim(organization) = '');
-- 'Wharton Global Youth Program'  (source: data/research/opportunities/batch1_2026-08-17.jsonl)
UPDATE opportunities SET organization = 'University of Pennsylvania - Wharton School' WHERE id = 'fad2bef3-80e8-4b7e-a4a5-f7021f34767f' AND (organization IS NULL OR btrim(organization) = '');
-- 'Winchester College - Discover Summer Program'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Discovery Summer (independent provider; Biltur is a Turkey-based enrollment agency, not the operator)' WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57' AND (organization IS NULL OR btrim(organization) = '');
-- 'XLAB International Science Camp, Germany'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'XLAB Göttingen' WHERE id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa' AND (organization IS NULL OR btrim(organization) = '');
-- 'York University Helix Summer Science Institute (ON, CANADA)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'York University Faculty of Science' WHERE id = '87f773f9-c7d2-4233-8061-7002e272df7c' AND (organization IS NULL OR btrim(organization) = '');
-- 'BmMT (online)'  (source: data/research/opportunities/counseling-list-verification_2026-08-21.jsonl)
UPDATE opportunities SET organization = 'Berkeley Math Tournament (UC Berkeley student-run)' WHERE id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98' AND (organization IS NULL OR btrim(organization) = '');
-- 'Horizon Academic Essay Prize'  (source: data/research/opportunities/cr1_commercial_tier.jsonl)
UPDATE opportunities SET organization = 'Horizon Inspires / Horizon Academic' WHERE id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40' AND (organization IS NULL OR btrim(organization) = '');
-- 'Immerse Education Essay Competition'  (source: data/research/opportunities/cr1_commercial_tier.jsonl)
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = 'ce680bf5-d52a-444e-a7de-ed1789cfc6aa' AND (organization IS NULL OR btrim(organization) = '');
-- 'Princeton University Ten-Minute Play Contest'  (source: data/research/opportunities/cr1_active_unverified_fixes.jsonl)
UPDATE opportunities SET organization = 'Lewis Center for the Arts, Princeton University' WHERE id = '0f182854-87b1-449b-b76e-292acbc2a482' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Diana Award'  (source: data/research/opportunities/wave5_2026-08-21_thin-categories.jsonl)
UPDATE opportunities SET organization = 'The Diana Award (UK charity)' WHERE id = 'b399d24d-3606-4d3d-bb59-2b94623c58b2' AND (organization IS NULL OR btrim(organization) = '');
-- 'The Harvard Crimson Global Essay Competition'  (source: data/research/opportunities/s7photo_corpus_batchB.jsonl)
UPDATE opportunities SET organization = 'The Harvard Crimson (verified this pass -- input record listed org as not recorded; see verification_method)' WHERE id = 'c582f1d9-ec28-4335-acd0-4140893dd23f' AND (organization IS NULL OR btrim(organization) = '');
-- 'RISE for the World'  (source: data/research/opportunities/wave1_2026-08-20_competitions-research-scholarships.jsonl)
UPDATE opportunities SET organization = 'Schmidt Futures and the Rhodes Trust' WHERE id = '6a932044-4fc8-483d-95df-9737262321f1' AND (organization IS NULL OR btrim(organization) = '');

-- kaynak: data/research/opportunities/organization_research_batch2_2026-09-02.sql
UPDATE opportunities SET organization = 'Bocconi University (Università Bocconi)' WHERE id = 'e6f4c6d8-3e1d-4762-a6be-dd299592ac0e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Columbia University School of Professional Studies (Pre-College Programs)' WHERE id = '3779b871-652b-4d56-bbd7-b1c451686852' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'USC Viterbi School of Engineering' WHERE id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = 'e9c4cd39-b514-4975-b010-1c627d7231c8' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Purdue University (Lyles School of Civil and Construction Engineering)' WHERE id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Stony Brook University (Garcia Research Scholars Program)' WHERE id = 'd83d7048-537b-4450-8dfa-69e709cdb48f' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Dana-Farber/Harvard Cancer Center (DF/HCC)' WHERE id = '9b93f1ce-9114-4a2e-96b7-2823f6145d21' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Hochschule Bremen (City University of Applied Sciences)' WHERE id = '8f6e438f-0465-4744-b09b-d4d8b3a82f97' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'İstanbul Teknik Üniversitesi (İTÜ)' WHERE id = '6672d211-71e1-4667-b2eb-b266d4abc7b3' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'c3a16d0e-55d1-4dd7-9c5e-d930a83b0460' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '2b09924c-c758-4375-b7b1-215009e50d8e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Maastricht Summer School' WHERE id = '991e6bda-56b9-4b48-9a51-16e9f0ec7c38' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '216c88aa-8950-4f45-aea9-62939682be0a' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'New York University (NYU)' WHERE id = '907e279d-bc2f-46b0-b970-9ed9c0abb261' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Chicago (UChicago Summer Session)' WHERE id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of California, Santa Barbara (UCSB Summer Sessions)' WHERE id = '8296f39c-93da-48ab-acc5-af023b14f347' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '2116709f-e222-43c7-95e0-f801053f8f2e' AND (organization IS NULL OR btrim(organization) = '');

-- kaynak: data/research/opportunities/organization_research_batch3_2026-09-02.sql
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = '07504254-9004-4983-b149-4f783a1c32b8' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Stanford University (Physics Department)' WHERE id = 'dc08474d-8363-4125-b94e-33460354903e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Stanford University (Summer Session)' WHERE id = 'ccd1cf71-219d-4ee2-b6c3-47903972f7cf' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Summer Discovery' WHERE id = '868d4a6f-855d-48c9-b55d-3dd831178135' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'U.S. Department of State (Bureau of Educational and Cultural Affairs) — TechGirls' WHERE id = '58d2e707-2c9b-45a2-860a-02acaa1f3c53' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Pioneer Academics' WHERE id = 'c581e99a-c65f-4de2-bece-bbb34819c9a4' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Miami (Division of Continuing and International Education)' WHERE id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Chicago (UChicago Summer Session)' WHERE id = '89117ca8-52f4-41fb-8674-dd23998e7281' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Universidad de Navarra' WHERE id = 'fd105724-26cf-448f-a595-15b3db2d7f8d' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Edinburgh (Centre for Open Learning)' WHERE id = '30436a92-26fd-4972-a8b3-dce8ad454943' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Miami (Division of Continuing and International Education)' WHERE id = '1228cff1-265d-4cc2-aa49-95b1f3408250' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Pennsylvania (Engineering Summer Academy at Penn)' WHERE id = '0009f66d-9231-4dbd-938f-9eb1c9319309' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Toronto' WHERE id = '018f5962-6e43-4941-af90-ead024ebf8f3' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of Southern California (USC Pre-College Programs)' WHERE id = '7dabbd20-f678-49a3-9cae-5d6e0eb5fbde' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'dc4343ec-4856-483f-a3b0-7e0de9e38a09' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Venture & Tech Summer Program (VTSP)' WHERE id = 'd1c24acc-a289-459f-a476-110a731e2eb8' AND (organization IS NULL OR btrim(organization) = '');

-- kaynak: data/research/opportunities/organization_research_batch4_2026-09-02.sql
UPDATE opportunities SET organization = 'University of Pennsylvania (Wharton Sports Analytics and Business Initiative)' WHERE id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Woodstock School' WHERE id = 'dfd08c03-75c6-4bc2-b087-70c58c64db2a' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Bennington College' WHERE id = '793f6cf1-5af8-413a-b15f-89e5f1f9e44f' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = '21368fde-a4f9-49f8-af64-7326b6c60e60' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Harvard Alumni for Global Women''s Empowerment' WHERE id = '75952d25-c434-491d-becb-c3e78bda5e12' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'International Academic Marathon' WHERE id = 'd4450b97-5d23-4ab1-acf7-8f3908117fd6' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'International Greenwich Olympiad' WHERE id = '1ba4bf99-d36e-45d8-8dda-510587e52b05' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Major League Hacking (MLH)' WHERE id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Microsoft (Imagine Cup)' WHERE id = 'a14a5d3f-089f-4bd8-b9ad-be6cd193915d' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'The New York Times (The Learning Network)' WHERE id = '031502eb-7a60-43cd-a8c1-8d1c44cac6da' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'The New York Times (The Learning Network)' WHERE id = 'd24e59bd-43b7-4e7e-83ab-aadb02e2a971' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Stockholm Water Foundation (SWF)' WHERE id = 'c8eb3d40-f8b8-461a-bd84-7afaf206ead4' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Institute of Competition Sciences (ICS)' WHERE id = 'f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'UniHive Education' WHERE id = '55dd21cd-859e-498a-a69d-56f45d777d8e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '4d866643-6a6d-481a-add3-e29b6a163592' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Association for Pre-College Program Directors' WHERE id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'InvestIN Education' WHERE id = 'd99d1a5c-2b77-4bc1-af84-e429410eef68' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Interlochen Arts Academy' WHERE id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Georgetown University' WHERE id = '948b2e5f-1ec8-4838-9a0a-01c928b02a8c' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'STEM Fellowship' WHERE id = 'b51bf24f-42c2-419f-a456-ca86dff0ad8e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Columbia Undergraduate Science Journal (CUSJ)' WHERE id = 'e0e1584c-5d96-41d6-a3a0-a62eaffa37d6' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Young Guru Academy (YGA)' WHERE id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'International Environmental Olympiad (IEnvO)' WHERE id = '2b0f2e8a-7bbc-48d5-b492-647972c42190' AND (organization IS NULL OR btrim(organization) = '');

-- kaynak: data/research/opportunities/organization_research_sample15_2026-09-02.sql
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '3900e10b-dc11-4d4d-ba69-7f9a630cf602' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Girls Who Code' WHERE id = '674f46f0-b71c-4d3a-bbff-20cfa9dcfdee' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Harvard Summer School' WHERE id = '66c76976-90e5-4637-8afe-6828992e838a' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '9c0e300e-0ebd-4444-a479-01a297473856' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Center for Excellence in Education (CEE)' WHERE id = 'b2246380-2d25-4712-8ee2-cf67cdd349ca' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Stanley Prep' WHERE id = 'c6b985f9-1a40-4e8a-a2fb-63408263e66e' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Young Founders Lab' WHERE id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'FIRST Robotics Competition Türkiye (FRC Türkiye)' WHERE id = 'dfb94075-d86e-4cba-ace2-a25953e2989b' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'iGEM Foundation' WHERE id = '931e7fc2-ee58-4904-958e-f2655c1b5c9d' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Veritas AI' WHERE id = 'c996443d-7360-4197-850a-339ef959d585' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = 'a18a12db-6e7d-4d1f-9243-de94ae621ed8' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Journal of Emerging Investigators (JEI)' WHERE id = '35f7475c-2567-4dde-ab61-c427059ff180' AND (organization IS NULL OR btrim(organization) = '');

-- kaynak: data/research/opportunities/organization_research_verified_leads_2026-09-02.sql
UPDATE opportunities SET organization = 'American University' WHERE id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Lehigh University (Academic Outreach)' WHERE id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Lehigh University (Academic Outreach)' WHERE id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Purdue University (Office of Summer and Winter Sessions)' WHERE id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Hong Kong Baptist University (HKBU)' WHERE id = '1d7aeeff-8ac6-417b-a257-46def5ec701f' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'The Hong Kong Polytechnic University (PolyU)' WHERE id = '255377bc-7564-452d-96e5-b25fb6902aa0' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Sabancı Üniversitesi Nanoteknoloji Araştırma ve Uygulama Merkezi (SUNUM)' WHERE id = '4db17042-5487-4090-9212-0d7243acaa26' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'IE University' WHERE id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'King''s College London' WHERE id = '1e907aad-2bd4-43e4-98c1-4d75b6413d7a' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'University of St Andrews' WHERE id = 'e0960bef-227f-4360-ad8f-d910e5e8dc2b' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'Trinity College Dublin' WHERE id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34' AND (organization IS NULL OR btrim(organization) = '');
UPDATE opportunities SET organization = 'National Geographic Society' WHERE id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41' AND (organization IS NULL OR btrim(organization) = '');

-- ══════════════════════════════════════════════════════════════════
-- 2) Resmî adres düzeltmesi — 2 kayıt
-- ══════════════════════════════════════════════════════════════════
-- Staged, NOT applied. The 3 rows oryn-d0 flagged as official_url provenance defects
-- (2 pointing at the same third-party directory, 1 at a Turkish resale agency two
-- removes from the source). Founder is applying this by hand tonight -- every value
-- below was opened directly this session, 2026-09-02. Only 2 of the 3 are a genuine
-- fix; the third is a disable recommendation, not forced into a fix it doesn't support.
-- Live current state confirmed immediately before writing this (organization was null
-- on all three, official_url exactly as noted per row).

-- 'University of Maastricht, Netherlands' (id 14db7109-25fd-4cd9-bb70-73797588bec8)
-- Stored URL was summerschoolsineurope.eu/destination/maastricht-summer-school/ -- a
-- third-party directory listing, not the university's own page. Real official page
-- found and opened directly: maastrichtuniversity.nl/education/courses/summer-programme-european-studies
-- -- "Summer Programme in European Studies," live, Summer 2027 dates already listed.
UPDATE opportunities SET
  organization = 'Maastricht University',
  official_url = 'https://www.maastrichtuniversity.nl/education/courses/summer-programme-european-studies'
WHERE id = '14db7109-25fd-4cd9-bb70-73797588bec8';

-- 'Winchester College - Discover Summer Program' (id 483c0af4-92e1-4599-a4e9-8ac6eec69a57)
-- Stored URL was biltur.com/programlar/discovery-summer-winchester-college/ -- a
-- Turkish agency reselling the programme, two removes from the source. Real official
-- page found and opened directly: winchestercollegesummerprogramme.com -- "Winchester
-- College Summer Programme," live, residential courses for ages 12-17. Note: the
-- programme's current course names are "CATALYST" and "English Language Coaching," not
-- "Discover" -- this row's title may be a dated or agency-specific name for the same
-- underlying programme; flagged, not corrected here, since this task is organization
-- and official_url, not title accuracy.
UPDATE opportunities SET
  organization = 'Winchester College',
  official_url = 'https://www.winchestercollegesummerprogramme.com'
WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57';

-- NOT FIXED, DISABLE RECOMMENDATION — 'Summer Programs in the Netherlands - 2025'
-- (id b10444c7-6c36-463c-b240-3b48025a74b6)
-- Checked directly against the "two real programmes sharing one URL" framing before
-- writing anything -- it doesn't hold for this row. Searched specifically for a single
-- program called "Summer Programs in the Netherlands": none exists. What exists instead
-- is a genuine plurality of unrelated real Dutch summer programs (The Hague Summer
-- School, HAN Summer School, University of Amsterdam Summer Programmes, Utrecht Summer
-- School, and others) -- exactly what the row's own title describes: a category, not a
-- program. Writing any single one of these in as "the" organization would be a wrong
-- resolution wearing a right one's shape, the same failure mode this whole thread's
-- rule exists to prevent. This is a genuine disable candidate, not a fix -- the row
-- doesn't describe one recoverable programme, it describes a search.


-- ══════════════════════════════════════════════════════════════════
-- 3) Doğrulanmamış -> doğrulanmış — 59 kayıt
-- ══════════════════════════════════════════════════════════════════
-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the
-- founder applies. 59 of 74 live 'cycle_status=unverified, status=active' rows promoted
-- individually verified against each program's own official page, 2026-09-03.
-- 0 rows confirmed dead. 14 unresolvable (untouched, still cycle_status='unverified').
-- 1 deferred (University of Maastricht, already on oryn-d0's queue).

-- [paket: 'begin;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- American University, Washington DC  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.american.edu/summer/precollege/' where id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a';

-- Hong Kong Baptist University (HKBU)  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://hs-summer.hkbu.edu.hk' where id = '1d7aeeff-8ac6-417b-a257-46def5ec701f';

-- Lehigh University  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://academicoutreach.lehigh.edu/pre-college-programs' where id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0';

-- Lehigh University: Bethlehem, PA  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://academicoutreach.lehigh.edu/pre-college-programs' where id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d';

-- Pre-College Program  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.ie.edu/ie-summer-school/pre-university/' where id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8';

-- Purdue University  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.purdue.edu/thinksummer/' where id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068';

-- Sabancı University Nanotechnology Winter School  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://sunum.sabanciuniv.edu/tr/egitim/kis-okulu-tr' where id = '4db17042-5487-4090-9212-0d7243acaa26';

-- The Hong Kong Polytechnic University (PolyU)  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.polyu.edu.hk/summerinstitute/' where id = '255377bc-7564-452d-96e5-b25fb6902aa0';

-- Trinity College London, Ireland  (was org=None)
--   TITLE NOTE (not applied -- founder's call): Trinity College Dublin, not London -- title conflates two real institutions
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.tcd.ie/study/other-courses/summer-schools/' where id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34';

-- Nat Geo Slingshot  (was org=None)
--   reused from org-research closeout
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://www.nationalgeographic.org/society/projects/slingshot' where id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41';

-- Sabancı University Summer School (Lise Yaz Okulu)  (was org='Sabancı Üniversitesi')
--   stored deadline 2026-08-01 already elapsed -- deadline gate already excludes this row regardless of cycle_status; closed is the honest match, not date_not_announced
update public.opportunities set cycle_status = 'closed', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c';

-- STEM Racing  (was org='STEM Racing')
--   global rolling competition circuit, active
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'STEM Racing Global' where id = 'c12ce265-c6c4-454b-97f5-680d366813ec';

-- 67th London International Youth Science Forum (LIYSF) - 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): 68th LIYSF (2027), not 67th (2026) -- 2026 cohort concluded
--   confirmed future cycle: 18-31 Jul 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'LIYSF CIC' where id = 'c7223aea-7bb9-4b29-b59d-a054d7bfa02c';

-- ACU BİLİM YAZ KAMPI PROGRAMI 2026  (was org='Acıbadem Mehmet Ali Aydınlar University (ACU)')
--   2026 cycle (29 Jun-10 Jul) concluded, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '900b0a32-298f-4956-b933-3211e25b438b';

-- Andover Summer at Phillips Academy 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): stale 2026 in title -- live cycle is Summer Session 2027
--   confirmed future cycle: 29 Jun-1 Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Academy' where id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb';

-- AwesomeMath Summer Program  (was org=None)
--   2026 cycle closed 26 May, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'AwesomeMath' where id = 'cfe42a66-3688-43aa-8e7e-61ffca68adb8';

-- Bocconi Summer School 2026  (was org=None)
--   2026 applications closed, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bocconi University' where id = 'e6f4c6d8-3e1d-4762-a6be-dd299592ac0e';

-- Dive Into Engineering!  (was org=None)
--   TITLE NOTE (not applied -- founder's call): "Dive Into Engineering!" is not an official program name -- real program at this URL is "Discover Engineering"
--   no specific date confirmed
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'USC Viterbi School of Engineering (USC Pre-College Programs)', official_url = 'https://precollege.usc.edu/summer-programs/discover-engineering/' where id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec';

-- Downing College University of Cambridge - 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): stale 2026 in title -- live cycle is 2027 (Programme B/C)
--   confirmed future cycle: Jul-Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Downing College, University of Cambridge' where id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220';

-- Early College Program (ECP) Courses for High School Students (Ages 14-18)  (was org=None)
--   rolling/open registration
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'School of the Art Institute of Chicago (SAIC)' where id = 'e9c4cd39-b514-4975-b010-1c627d7231c8';

-- Earn college credit that may transfer to any college you attend  (was org=None)
--   TITLE NOTE (not applied -- founder's call): marketing tagline as title, not a program name (catalog-quality note, not a verification issue)
--   2026 session (15-26 Jun) and payment deadline (1 May) both elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'SAIC -- Continuing Studies' where id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972';

-- For-Credit Fun-Sized Courses  (was org=None)
--   tentative 2026 dates elapsed, deadline lives on a separate portal not read
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Purdue University -- Lyles School of Civil and Construction Engineering' where id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e';

-- Garcia Summer Scholars  (was org=None)
--   stored URL was a stale 2018 news article; real program page has no explicit deadline
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stony Brook University -- Garcia Center for Polymers at Engineered Interfaces', official_url = 'https://www.stonybrook.edu/garcia/summer-program/' where id = 'd83d7048-537b-4450-8dfa-69e709cdb48f';

-- Harvard CURE Initiative to Eliminate Cancer Disparities  (was org=None)
--   TITLE NOTE (not applied -- founder's call): org corrected from bare "Harvard" -- DFHCC is a Harvard-affiliated consortium, not Harvard University itself
--   "Applications for 2027 will open in the Fall of 2026" -- season named, no exact date yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Dana-Farber/Harvard Cancer Center (DF/HCC)' where id = '9b93f1ce-9114-4a2e-96b7-2823f6145d21';

-- Inspirit AI + Healthcare and Medicine  (was org=None)
--   page explicitly self-discloses NOT an official Stanford program; rolling apply-now
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Inspirit AI' where id = 'f54d2f62-6335-4f19-a05f-f03c3e47bc40';

-- İTÜ Tasarım Atölyesi (itüTA)  (was org=None)
--   stored URL was a dead 2024 blog post (404); 2026 cycle (27 Jun start, 1 Jun deadline) already elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'İTÜ SEM, Istanbul Technical University -- Faculty of Architecture', official_url = 'https://itusem.itu.edu.tr/haber-detay/2026/04/20/i-t%C3%BC-tasar%C4%B1m-at%C3%B6lyesi---it%C3%BCta-lise-yaz-okulu' where id = '6672d211-71e1-4667-b2eb-b266d4abc7b3';

-- John Locke Institute (JLI) Courses  (was org=None)
--   "Apply Now for 2026" live, no fixed deadline shown
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'John Locke Institute' where id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2';

-- Kadir Has Kış Okulu  (was org='Kadir Has University')
--   dates (19-30 Jan 2026) already elapsed, no 2027 posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '6bcef34b-bb53-427b-9907-0955d1862754';

-- Leangap  (was org=None)
--   2026 cycle (both sessions) elapsed and sold out; capacity/timing, not existence
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Leangap Education, Inc.' where id = 'b5d022aa-302a-4712-b960-a5f70386af17';

-- Lumiere Education  (was org=None)
--   2026 cohorts elapsed; page references "further cohorts through Winter 2026-2027" but no exact date given for that window
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Lumiere Education' where id = 'bc678344-c213-4ae8-a4f8-48af2856338f';

-- NYU High School Law Institute  (was org=None)
--   orientation Sept 13 2026 is a real near-future date; classes run through March 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'New York University School of Law (student-run organization)' where id = '6d62d570-533a-49a4-9f86-aecf5e316b58';

-- Oxford Royale  (was org=None)
--   2027 sessions marketed now; early-bird cutoff 15 Sept 2026 is 12 days from today
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Oxford Royale / Oxford Programs Limited -- independent, NOT affiliated with University of Oxford' where id = '6f80e90f-7d85-4c93-b833-f47cbbf6b0c3';

-- Pre-College Summer Programs (Immersion/Stones and Bones/Summer Bridge/Summer College)  (was org=None)
--   TITLE NOTE (not applied -- founder's call): "Summer College" track name not independently re-confirmed as current -- suggest human spot-check
--   2026 applications closed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago (Summer Session)' where id = '9f1b802e-cbc1-4af2-98f1-ffddfa06140b';

-- Student Science Training Program  (was org=None)
--   rolling admission; 2026 cycle elapsed, no 2027 posted -- NOTE: row already carries verified_at=2026-08-23 despite cycle_status='unverified', an existing data inconsistency independent of this finding
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Florida (CPET)' where id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55';

-- The Summer School of the Polytechnic University of Milan (POLIMI) 2026  (was org=None)
--   2026 sessions full ("al completo"), closed on capacity not cancellation
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Politecnico di Milano (POLIMI)' where id = '8e5c10af-aebb-449c-9811-fed9dcc14039';

-- The Wall Street 101 Summer Pre-College Program  (was org=None)
--   page now markets "Summer 2027" directly
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bentley University' where id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514';

-- Two-week UM Academies (non-credit)  (was org=None)
--   2026 dates elapsed, no next cycle stated in fetched content
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Miami (Division of Continuing and International Education)' where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0';

-- UCSB Research Mentorship Programs  (was org=None)
--   page already posts 2027 cycle: dates + application window (Dec 2026-Mar 2027) both given
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of California, Santa Barbara (Summer Sessions)' where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90';

-- Universidad de Navarra - University of Navarra  (was org=None)
--   2026 deadlines elapsed, no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Navarra (School of Humanities and Social Sciences)' where id = 'fd105724-26cf-448f-a595-15b3db2d7f8d';

-- University of Applied Sciences and Arts of Western Switzerland  (was org=None)
--   TITLE NOTE (not applied -- founder's call): title names the parent system (HES-SO), not the operating school (HEIA-FR) -- soft org-mismatch, not wrong
--   2026 dates elapsed, first-come-first-served, no 2027 mentioned
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'HEIA-FR (School of Engineering and Architecture of Fribourg), part of HES-SO' where id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48';

-- University of California, Santa Barbara, CA, USA  (was org=None)
--   2026 window closed (Dec 2025-Mar 2026), next cycle not yet posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UC Santa Barbara (UCSB) Summer Sessions' where id = 'ce7d618b-debf-4508-87e1-f6905540bf8d';

-- University of Edinburgh International Summer School  (was org=None)
--   TITLE NOTE (not applied -- founder's call): likely should read "Pre-University Summer School," not "International Summer School" -- Edinburgh has no under-18 program by that literal name; SUISS is a separate real consortium program the title could also plausibly mean -- flagged, not silently picked
--   2026 dates elapsed (29 Jun-10 Jul, deadline 19 May), no 2027 posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Edinburgh (Centre for Open Learning)', official_url = 'https://study.ed.ac.uk/summer-school' where id = '30436a92-26fd-4972-a8b3-dce8ad454943';

-- University of the Arts London - The UAL International Summer School  (was org=None)
--   page says "Book now for Summer School 2026" as read on 2026-09-03, after the summer window -- plausibly a stale/unrefreshed page; flagged for a human sanity check rather than promoted to open/upcoming with false confidence
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of the Arts London (UAL)' where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1';

-- Venture & Tech Summer Program 2026  (was org=None)
--   TITLE NOTE (not applied -- founder's call): title's cycle year should bump to 2027
--   confirmed future cycles: Session I 8 Jun-16 Jul 2027, Session II 5 Jul-13 Aug 2027
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Venture & Tech Summer Program (VTSP) -- independent, no longer formally Harvard-affiliated' where id = 'd1c24acc-a289-459f-a476-110a731e2eb8';

-- Wharton Global Youth Program  (was org=None)
--   2026 closed; recurring cycle (opens Nov, priority Jan, final March) but no 2027 dates posted yet
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Wharton School, University of Pennsylvania' where id = 'fad2bef3-80e8-4b7e-a4a5-f7021f34767f';

-- Winchester College - Discover Summer Program  (was org=None)
--   2026 dates (3-31 Jul) elapsed, no 2027 mentioned
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Discovery Summer (NOT Winchester College -- Winchester is only the venue)', official_url = 'https://discoverysummer.com/winchester/' where id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57';

-- Major League Hacking  (was org=None)
--   live 2026-season schedule of hackathon events, ongoing roster -- org self-evident from title, no correction needed
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d';

-- The Institute of Competition Sciences (ICS)  (was org=None)
--   TITLE NOTE (not applied -- founder's call): row describes an umbrella org, not one dated opportunity
--   hosts Build the Moon Challenge Fall 2026 -- imminent given today's date
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Institute of Competition Sciences (ICS)' where id = 'f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9';

-- Pre-College Program Virtual Fairs  (was org=None)
--   only concrete date (20 Nov 2025 fair) already elapsed, no next date posted
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Association for Pre-College Program Directors (APCPD)' where id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16';

-- Interlochen Review  (was org=None)
--   page explicitly states "check back in January, 2027" -- confirmed future reopen
update public.opportunities set cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Interlochen Arts Academy' where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- Georgia Tech Summer PEAKS (High School Programs)  (was org='Georgia Institute of Technology (CEISMC)')
--   page states "registration open" for Summer 2026 as read on 2026-09-03 -- odd timing (post-summer) but taken from the agent's direct page read rather than second-guessed; org already correct in DB
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '51701db6-f571-4ee9-9387-045eed7bb7d4';

-- Caltech Summer Research Connection (SRC)  (was org='California Institute of Technology')
--   rolling ("spots usually filled by early spring"); org already correct -- SEPARATE eligibility defect: eligible_countries=["United States"] is materially overbroad, program is Pasadena Unified School District (PUSD) students only. Flagging, not fixing here -- different field, different owner.
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '9b6aefb3-a33e-45a1-af06-5a770a92c45a';

-- Genesys Works  (was org='Genesys Works')
--   rolling, school-partner-based application; org already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0';

-- Partners for the Future  (was org='Cold Spring Harbor Laboratory')
--   nomination-based, current cycle closed, no specific reopen date; org already correct
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '6005b354-84d0-486f-b9bf-9bc7dcc2ea6c';

-- CU Boulder Precollegiate Development Program (PCDP)  (was org='University of Colorado Boulder, Office of Precollege Outreach and Engagement')
--   no dates/deadlines anywhere -- continuous outreach program, no cycle structure; org already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = '995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a';

-- Vanderbilt Programs for Talented Youth (PTY) - Summer Institutes & Summer Academy  (was org='Vanderbilt University, Peabody College (Programs for Talented Youth)')
--   multiple concurrent rolling program windows (e.g. Fall 2026 Mini Immersion opening Sept 2); org/Peabody affiliation already correct
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'b23c2cf0-3c44-40f8-8b0b-67315a066c9f';

-- Washington University in St. Louis College Prep Program (CPP)  (was org='Washington University in St. Louis')
--   official_url correct and current; SEPARATE defect -- stored application_url (pathway.wustl.edu) redirects to a generic admissions page with zero CPP content, should be re-pointed/re-verified independently of this cycle_status change
update public.opportunities set cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'd38255f3-6ce2-440c-b302-c39ee6b17cde';

-- Emerging Engineers @ UVA  (was org='University of Virginia School of Engineering and Applied Science')
--   2026 cycle (27-31 Jul, deadline 15 Apr) elapsed, no 2027 posted; org already correct
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z' where id = 'adce9d5e-c138-49ed-b7ff-370c3828f80e';

-- Aggie STEM Overnight Camp  (was org='Texas A&M University (Aggie STEM)')
--   2026 cycle (31 May-27 Jun, reg closed 25 Apr) elapsed, no 2027 posted; org already correct; URL suggestion points to the specific overnight-camp subpage rather than the generic homepage
update public.opportunities set cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', official_url = 'https://aggiestem.tamu.edu/overnight-camp/' where id = '43c0c707-3447-4863-8d0d-64c7354c113f';

-- [paket: 'commit;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- Deliberately NOT touched (still cycle_status='unverified', no change):
-- UNRESOLVABLE -- tool/domain access blocked (11 of 14) -- absence of evidence, not evidence of a problem:
--   c83420f7-8d0d-48b4-9eee-3659fc39706e  iGEM High School Competition  -- igem.org/competition.igem.org/old.igem.org all empty/403; browser denied
--   570ba029-5c57-41e2-aaef-486777f4d8ea  Harvard-MIT Mathematics Tournament (HMMT)  -- hmmt.org 403 on homepage and /rg/info, connection reset on beta.hmmt.org
--   d224a324-b3c0-4a5f-a361-3805efc20a14  CTY: Intensive Studies for 7th Graders and Above  -- cty.jhu.edu 403 on stored page, grades7-12 index, and root
--   216c88aa-8950-4f45-aea9-62939682be0a  Nanoteknoloji ve Biyoteknoloji Lise Kış Kampı  -- ku.edu.tr 403 on all 5 attempted paths
--   2116709f-e222-43c7-95e0-f801053f8f2e  Research Program KUSRP 2026  -- ku.edu.tr 403, same domain-wide block
--   fd51d7f8-1408-4d58-9558-47520758df3d  PreCollege at Ringling College of Art and Design  -- ringling.edu 403 on stored URL and bare root
--   af30653c-94d1-4ce2-8781-b60e659d48ef  Northwestern University  -- my.ctd.northwestern.edu cert-verification error then socket hang-up (parent domain ctd.northwestern.edu loaded fine)
--   031502eb-7a60-43cd-a8c1-8d1c44cac6da  New York Times Audio Stories Podcast Contest  -- nytimes.com refused WebFetch and browser navigation by policy; web.archive.org snapshot also blocked
--   0f182854-87b1-449b-b76e-292acbc2a482  Princeton University Ten-Minute Play Contest  -- arts.princeton.edu 403 on stored URL and a more specific subpage; web.archive.org blocked too
--   aeeb130a-30f6-440f-867e-861cd723a6db  George Washington University: Washington, DC  -- summer.gwu.edu 403 on stored URL, root, and /apply-pre-college; browser navigation denied by the site itself
--   4f668b96-af7e-4595-a097-7447a230004c  Global Issues at Princeton: Grades 10-12  -- cty.jhu.edu 403 again (2nd row hitting this domain); browser denied too -- strong org-mismatch candidate (real operator looks like JHU CTY, not Princeton) but never confirmed on the page itself
-- UNRESOLVABLE -- genuine content-level ambiguity (3 of 14) -- page loaded, verdict still unclear:
--   d780bc55-41e0-444b-8bcc-3f927b28c4b7  Istanbul Bilgi University High School Summer School (Lise Yaz Okulu)  -- org and program both confirmed real and live, but the only dates found anywhere (site or web search) are from 2025 -- no 2026 cycle referenced despite it now being Sept 2026. Genuinely can't tell if unrefreshed, paused, or ran quietly.
--   f912de6d-7da6-4e21-811b-1da09b10c86c  Columbia Spring Immersion Program  -- stored URL resolves to a different real Columbia program ("Academic Year Weekend"), not the stored title ("Spring Immersion Program"). A plausible intended match ("Academic Year Immersion," Spring 2027 session) exists but a follow-up fetch to confirm it failed.
--   8f6e438f-0465-4744-b09b-d4d8b3a82f97  Hochschule Bremen (HSB) City University of Applied Sciences, Germany  -- stored URL loads fine (200) but describes a Master's degree requiring a completed bachelor's -- structurally wrong for a 14-18 audience. No HS-appropriate HSB program found anywhere in search. Distinct from the other 13: not absence of evidence, but confirmed evidence this specific link doesn't fit -- closer to 'wrong for purpose' than genuine 'couldn't tell.'
-- DEFERRED (not this task's to resolve):
--   14db7109-25fd-4cd9-bb70-73797588bec8  University of Maastricht, Netherlands  -- already on oryn-d0's queue as a confirmed official_url provenance defect, flagged for a founder call -- not re-touched here

-- ══════════════════════════════════════════════════════════════════
-- 4) İncelemedeki 3 kayıt (UK Mathematics Trust)
-- ══════════════════════════════════════════════════════════════════
-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the founder
-- applies. 3 of the 5 remaining "direct fetch" under_review rows, individually verified
-- against each program's own official page today. Dry-run validated live (begin/rollback
-- via the Supabase connector) before this file was written -- all 3 matched and applied
-- cleanly, confirmed rolled back after.
--
-- The other 2 of the 5 (Team Maths Challenge (Junior); Athena Summer Innovation Institute)
-- are deliberately NOT included -- genuinely unresolvable, see
-- docs/under-review-pool-audit-2026-09-03.md section 4. Left untouched, still
-- status='under_review'.
--
-- The remaining ~107 rows (the bulk 2026-08-18 Drive-corpus import) are NOT included --
-- confirmed only characterized and traced to origin, not individually re-verified. See
-- that same doc's section 7.

-- [paket: 'begin;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- BMO Round 1 (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- checked https://ukmt.org.uk/senior-challenges/british-maths-olympiad-round-1, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z', deadline = '2026-11-19'
where id = 'f6dbce16-a6cb-4e8c-9ebd-01a57489879f';

-- BMO Round 2 (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- checked https://ukmt.org.uk/senior-challenges/british-maths-olympiad-round-2, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z', deadline = '2027-01-21'
where id = 'e5a8555d-7e5b-4fd4-8406-812efbe1de91';

-- Senior Team Mathematical Challenge (UK Mathematics Trust) -- live 2026-27 cycle confirmed
-- registration opens 10 Sept 2026, regional finals Nov 2026, national final Feb 2027 --
-- no single clean deadline date to store, left null rather than guessed
-- checked https://ukmt.org.uk/team-challenges/senior-team-mathematical-challenge, 2026-09-03
update public.opportunities
set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current',
    verified_at = '2026-09-03T00:00:00Z'
where id = '1cd3d046-3101-4314-b068-4d946286512e';

-- [paket: 'commit;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]


-- ══════════════════════════════════════════════════════════════════
-- 5) Toplu doğrulama — 84 kayıt. KORUMASIZ, bilerek SON: 83'ü (1)'le çakışıyor
-- ══════════════════════════════════════════════════════════════════
-- Prepared, NOT applied. Read-only investigation per CEO brief (2026-09-03), the founder
-- applies. 84 of the 107-row bulk under_review population, individually verified against
-- each program's own official page today. 7 confirmed dead. 16 unresolvable (untouched,
-- still status='under_review') -- 13 of the 16 are known/newly-found tool-access blocks,
-- not content ambiguity; see docs/under-review-bulk-verification-2026-09-03.md section 3.
-- Dry-run validated live (begin/rollback via the Supabase connector) before this file was
-- written -- all 84 statements matched and applied cleanly, confirmed rolled back after.

-- [paket: 'begin;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- Acıbadem Üniversitesi Lise Yaz Programları
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem Üniversitesi (ASEGEM)' where id = 'a4451907-20af-43d3-8498-25a3829254c1';

-- BETA Camp
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Prequel, Inc. (formerly "BETA Camp")', official_url = 'https://www.joinprequel.com/' where id = 'd70e5392-9f0d-4191-8c8d-4921dbaa3651';

-- BRAND-ED
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Edconic (formerly BrandEd/"BRAND-ED"), owned by Cambridge Information Group', official_url = 'https://edconic.com/pre-college-programs/' where id = '72b66f92-1356-4827-9139-530db7c52c74';

-- Bahçeşehir Üniversitesi Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bahçeşehir Üniversitesi (BAU)' where id = 'de7ab9aa-74a5-43d1-b02f-2730b2aed80f';

-- Bennington College Young Writers
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bennington College', deadline = '2026-11-01' where id = '793f6cf1-5af8-413a-b15f-89e5f1f9e44f';

-- Bentley University Pre-College Programs
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Bentley University' where id = '9e601648-0d30-462e-b9f0-8d069392f29f';

-- BmMT (online)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Berkeley Math Tournament (UC Berkeley student org, independent of the university)' where id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98';

-- Boğaziçi Uni Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Boğaziçi Üniversitesi (BÜYEM)' where id = '19248dee-8118-47ee-9f5b-866b0d754be8';

-- Brown University (RI, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Brown University' where id = 'c2444f7f-e137-411d-9a14-c1ba8052e217';

-- Cambridge Future Scholars Programme
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Cambridge Scholars'' Programme Ltd (private; not University of Cambridge)' where id = '70519f22-f165-44cf-b954-a3ab864077e0';

-- College Edge Summer
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia University School of Professional Studies (Pre-College Programs)' where id = '40ef389f-b58f-447d-87b4-b7deb3effe2a';

-- Columbia Junior Science Journal (CJSJ)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia Undergraduate Science Journal (CUSJ) — a Columbia student publication, not the institution', deadline = '2026-09-30', official_url = 'https://columbiajuniorsciencejournal.org/' where id = 'e0e1584c-5d96-41d6-a3a0-a62eaffa37d6';

-- Columbia University: New York, NY
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Columbia University School of Professional Studies (Pre-College Programs)', deadline = '2027-03-01' where id = '17d177de-6ca7-4754-ab15-3a9dd93f4893';

-- Cornell University
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Cornell University (School of Continuing Education)' where id = '9caff85d-6976-422e-8fa1-6893eaefa54c';

-- DigiPen Academy Pre-College Summer Programs 2025
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'DigiPen Academy (a division of DigiPen Institute of Technology)' where id = '036f80e1-7ae5-46a9-8b68-6a890d50f8b8';

-- Frontiers Overview
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Worcester Polytechnic Institute (WPI), Pre-Collegiate Outreach' where id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b';

-- Future Innovators Scholarship Competition
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Immerse Education', deadline = '2027-03-28' where id = '21368fde-a4f9-49f8-af64-7326b6c60e60';

-- Future Ready Summer Experience Program 2025 | Inspiring Global Citizens
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Renison International Programs, Renison University College, University of Waterloo', official_url = 'https://uwaterloo.ca/renison-international-programs/future-ready/dates-fees-and-application-process-future-ready' where id = '053114c6-b049-4eab-b7e1-b081efe183c9';

-- Galatasaray University High School Summer Programs 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Galatasaray University (GSÜSEM — Lifelong Learning/Continuing Education Center)', official_url = 'https://liseyazokulu.gsu.edu.tr' where id = 'b3e40e31-a82d-4a34-bceb-b841f20d7296';

-- Georgetown Pre-College Online Program (Medicine / Journalism & Media)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Prelum (Kaplan, Inc., a Graham Holdings subsidiary), in partnership with Georgetown University' where id = '948b2e5f-1ec8-4838-9a0a-01c928b02a8c';

-- Georgetown University HOYA Summer-High School Sessions
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Georgetown University School of Continuing Studies' where id = 'a78975de-a35f-4030-b4fd-88a724b653ae';

-- HKUST I·ELITE Pre-University Scholars Program
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Hong Kong University of Science and Technology (HKUST)', deadline = '2026-11-20' where id = 'f3cda419-64ae-4bac-bda9-3d1c6ccbbc37';

-- HSHSP (High School Honors Math, Science and Engineering Program)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Michigan State University, College of Education' where id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0';

-- Harvard University (MA, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Harvard Division of Continuing Education (Harvard Summer School)' where id = '66c76976-90e5-4637-8afe-6828992e838a';

-- Horizon Academic Essay Prize
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Horizon Academic Research Program LLC' where id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40';

-- Horizon Inspires
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Horizon Academic Research Program LLC (private; not university-run)' where id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8';

-- IE JAB (Junior Advisory Board)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'IE University' where id = '5eff8569-58f3-48fd-89ba-a320725b6321';

-- Illinois Institute of Technology: Chicago, IL
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Illinois Institute of Technology (Illinois Tech) — Elevate College Prep' where id = 'f05643c5-88fa-477c-ac16-8de0b0b547bc';

-- Immerse Education Essay Competition
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Immerse Education', deadline = '2026-10-25' where id = 'ce680bf5-d52a-444e-a7de-ed1789cfc6aa';

-- International Academic Marathon
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'International Academic Marathon (self-operated, no parent institution)' where id = 'd4450b97-5d23-4ab1-acf7-8f3908117fd6';

-- International Greenwich Olympiad
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'North London Grammar School', deadline = '2027-03-01' where id = '1ba4bf99-d36e-45d8-8dda-510587e52b05';

-- International Research Institute of North Carolina (IRI)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'International Research Institute of North Carolina (IRI-NC)' where id = '09b42a46-cd61-4576-bc5a-565975c66d05';

-- International Summer Schools St Andrews, Cambridge and Yale Universities (ISSOS)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'ISSOS International Limited (private UK company; not St Andrews/Cambridge/Yale)' where id = 'f52db280-638a-49ec-a972-d1658b046234';

-- InvestIN Young Lawyer / Young Political Leader Summer Experience (London)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'InvestIN Education' where id = 'd99d1a5c-2b77-4bc1-af84-e429410eef68';

-- Johns Hopkins Engineering Innovation Pre-College Programs
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Johns Hopkins University — Engineering Innovation (Whiting School of Engineering)' where id = '6d3a439a-433e-4cce-b155-4dfd4cb53b48';

-- Journal of Emerging Investigators (JEI)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Journal of Emerging Investigators (JEI)' where id = '35f7475c-2567-4dde-ab61-c427059ff180';

-- Kadir Has Yaz Okulu
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Kadir Has University, sponsored by Kadir Has Foundation' where id = 'ee5d3870-77a8-43e5-8800-8738f6318d5f';

-- Kode With Klossy
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Kode With Klossy Inc. (501(c)(3) nonprofit)' where id = '455e6fb3-7592-45d4-852a-602acd95bd81';

-- Kış Bilim Kampı
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem University, via ASEGEM' where id = 'c3a16d0e-55d1-4dd7-9c5e-d930a83b0460';

-- Maastricht Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Maastricht University — Maastricht Summer School' where id = '991e6bda-56b9-4b48-9a51-16e9f0ec7c38';

-- Mathworks (Honors Summer Math Camp)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Texas State University (Mathworks Honors Summer Math Camp, Dept. of Mathematics)' where id = 'ccc1ff13-8673-4ba0-95fc-17050eee4306';

-- NYU Tandon Machine Learning Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'New York University Tandon School of Engineering (K-12 STEM Education Programs)' where id = '08ee973d-9dce-485e-b2f2-51deeb48c2ff';

-- PACT Program in Algorithmic and Combinatorial Thinking
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'PACT (independently run; 2026 in-person component on UPenn campus; no single named parent — contact summertcs@gmail.com)' where id = '9d4f568b-f14b-4925-bf79-753088583ffe';

-- PROMED Projects 2026
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Premed Projects Ltd.' where id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801';

-- Phillips Exeter Academy
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Exeter Academy (Exeter Summer program)' where id = '7761f771-fd60-48d8-a51f-152349051747';

-- Phillips Exeter Academy - New Hampshire NH
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Phillips Exeter Academy (Exeter Summer program)' where id = 'f069afec-005f-43a8-82f2-6869785ad6f1';

-- Polygence
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Polygence, Inc.', deadline = '2026-09-15' where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b';

-- Pre-Baccalaureate Program
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Wharton School, University of Pennsylvania (Wharton Global Youth Program)', deadline = '2026-09-09' where id = 'bbb81017-3570-4a13-8e82-e4bf612b3436';

-- RISD Pre-College Rhode Island School of Design
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Rhode Island School of Design (RISD)' where id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4';

-- RISE for the World
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Schmidt Futures / Eric and Wendy Schmidt Fund for Strategic Innovation, with Rhodes Trust' where id = '6a932044-4fc8-483d-95df-9737262321f1';

-- Research in Biological Sciences (RIBS)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago (Summer Session)' where id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8';

-- SPINWIP
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford Physics Department / Kavli Institute for Particle Astrophysics and Cosmology (KIPAC)' where id = 'dc08474d-8363-4125-b94e-33460354903e';

-- Sabancı University Summer School 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Sabancı University' where id = 'aaf5b259-4e72-4cba-85a9-43be675384aa';

-- Sevenoaks School Summer Program
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Sevenoaks School' where id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653';

-- Singularity AI Essay Contest
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Veritas AI (a program of Lumiere Education)' where id = 'c996443d-7360-4197-850a-339ef959d585';

-- Stanford Institutes of Medicine Summer Program (SIMR)
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford University School of Medicine (SIMR)' where id = '8f0a8a3f-6c12-4277-91ca-7d120222b231';

-- Stanford Summer Humanities Institute
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanford Pre-Collegiate Studies (Stanford University)' where id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7';

-- Stanley Prep for Educational Excellence
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Stanley Prep (private company; UNAT run w/ WFUNA — not an official UN program)' where id = 'c6b985f9-1a40-4e8a-a2fb-63408263e66e';

-- Summer Discovery
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Musiker Discovery Programs, Inc.' where id = '868d4a6f-855d-48c9-b55d-3dd831178135';

-- Summer@Brown
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Brown University Pre-College Programs' where id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20';

-- The Diana Award
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'The Diana Award' where id = 'b399d24d-3606-4d3d-bb59-2b94623c58b2';

-- Tulane University Pre-College, New Orleans
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Tulane University (Pre-College Programs)' where id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7';

-- UC Berkeley Business Academy for Youth
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Haas School of Business, UC Berkeley (Institute for Business & Social Impact)' where id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c';

-- UC San Diego Futures Programs
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UC San Diego Division of Extended Studies' where id = '10a944b3-26de-4bcc-a408-baa5b57e6c81';

-- UChicago College Pathway Program in Economics (Immersion)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago Summer Session' where id = '89117ca8-52f4-41fb-8674-dd23998e7281';

-- UniHive Research Proposal Competition
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UniHive Education' where id = '55dd21cd-859e-498a-a69d-56f45d777d8e';

-- UniHive Summer Programmes hosted at the University of Cambridge
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'UniHive Education (private; not formally affiliated with University of Cambridge)' where id = 'f9b261e6-69fb-4c1e-b7f9-ec9870ba79ac';

-- University of Bath International Summer School
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Bath' where id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f';

-- University of Chicago Chicago, IL
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Chicago Summer Session' where id = '16ab0b91-6ecd-463a-a0bf-85f9376c67a9';

-- University of Miami
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Miami, Division of Continuing and International Education (DCIE)' where id = '1228cff1-265d-4cc2-aa49-95b1f3408250';

-- University of Pennsylvania (PA, USA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Pennsylvania, School of Engineering and Applied Science (ESAP)' where id = '0009f66d-9231-4dbd-938f-9eb1c9319309';

-- University of Toronto (Toronto, CANADA) - 2025
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Toronto' where id = '018f5962-6e43-4941-af90-ead024ebf8f3';

-- Upenn Wharton Hack-AI-thon
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Wharton AI & Analytics Initiative, University of Pennsylvania', deadline = '2027-04-01' where id = '724a375c-fa54-439c-b8d2-c86869fed88d';

-- Uygulamalı Moleküler Biyoloji ve Genetik Kampı
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Acıbadem University (ASEGEM)' where id = 'dc4343ec-4856-483f-a3b0-7e0de9e38a09';

-- Warwick University Pre-University Summer Programme 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'University of Warwick' where id = 'ff5d9710-80d3-47ae-959a-b8b40406f003';

-- Wharton Sports Analytics and Business Initiative
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Wharton Sports Analytics and Business Initiative / Wharton Global Youth, University of Pennsylvania' where id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e';

-- Woodstock School: Mussoorie, India
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Woodstock School' where id = 'dfd08c03-75c6-4bc2-b087-70c58c64db2a';

-- XLAB International Science Camp, Germany
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'XLAB Göttingen (central facility of University of Göttingen)' where id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa';

-- York University Helix Summer Science Institute (ON, CANADA)
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'York University, Science Engagement Programs (Faculty of Science)' where id = '87f773f9-c7d2-4233-8061-7002e272df7c';

-- Young Founders Lab (YFL)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Young Founders Lab (independent, not university-affiliated)', official_url = 'https://www.youngfounderslab.org/' where id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6';

-- Young Guru Academy (YGA)
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Young Guru Academy (YGA)' where id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50';

-- iD Tech Camps
update public.opportunities set status = 'active', cycle_status = 'upcoming', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'iD Tech (private; not affiliated with host campuses)' where id = '1b636769-b88d-4c54-a270-79c3f68a044c';

-- iStar Class Credit and Research Program
update public.opportunities set status = 'active', cycle_status = 'open', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'IPERC (operating "iStar Class")' where id = '83bbb28b-437b-4ab1-9a3d-45c23d061539';

-- Özyeğin University Summer School 2026
update public.opportunities set status = 'active', cycle_status = 'date_not_announced', verification_state = 'verified_current', verified_at = '2026-09-03T00:00:00Z', organization = 'Özyeğin University' where id = '78c7c178-d6dd-4d50-a76f-b44ebd603784';

-- [paket: 'commit;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- Confirmed DEAD (7) -- recommend disabling (status='disabled'), founder's call, NOT
-- included above since disabling is a distinct, separate judgment from promoting:
--   3779b871-652b-4d56-bbd7-b1c451686852  Columbia Writing Academy
--   0ad4ccae-77db-450f-9768-064086e2fdd2  Duke University Talent Identification Program 2024
--   75952d25-c434-491d-becb-c3e78bda5e12  Harvard Alumni for Global Women's Empowerment Essay Contest
--   a14a5d3f-089f-4bd8-b9ad-be6cd193915d  Microsoft Imagine Cup Junior
--   dc0b92eb-5887-4163-8b71-1c3a4ab3bf80  NEW! The Immerse Cambridge Experience: A one-week taster program
--   69be38ed-9d26-46e3-aaf1-4819fa83f6ca  Robomaster High School Summer Camp (Shenzhen, China)
--   53ae13de-cbc9-443f-b668-5b557d9a1290  Vesalius College: Brussels, Belgium Innovative Entrepreneurship Summer Programme

-- UNRESOLVABLE (16) -- untouched, still status='under_review'. See the findings doc for
-- the full per-row reasoning and the tool-block vs content-ambiguity breakdown.
--   4d866643-6a6d-481a-add3-e29b6a163592  Bogazici University BOUN 101 Online Kış Okulu
--   3900e10b-dc11-4d4d-ba69-7f9a630cf602  Boğaziçi Üniversitesi Lise BOUN 101
--   a18a12db-6e7d-4d1f-9243-de94ae621ed8  CTY (Center for Talented Youth) Online Programs Courses
--   8a302e54-e237-49f7-9757-9b5262ae592b  Civic Leadership Institute (Grades 9-12)
--   5af50558-fcb5-4390-a8ff-5a6946e65862  Durham University Global Futures Summer School 2026
--   76a53c74-ea3a-4951-84af-a3e108a62d2c  Fordham University: New York, NY
--   1da5f8df-9ea0-4a85-90ac-fa1539986611  Google Computer Science Institute
--   4c7f5a9f-79d0-42df-8343-fc6a4983fe8d  Institute for Advanced Critical and Cultural Studies, Carlisle, PA: Grades 10-12
--   931e7fc2-ee58-4904-958e-f2655c1b5c9d  International Genetically Engineered Machine Competition (iGEM)
--   8980e51b-9889-4cb0-a6dc-e11a60a59e51  International Summer School for Young Physicists (ISSYP)
--   9c0e300e-0ebd-4444-a479-01a297473856  Koç University Research Program KUSRP
--   2b09924c-c758-4375-b7b1-215009e50d8e  Lise Kış Tıp Okulu
--   d24e59bd-43b7-4e7e-83ab-aadb02e2a971  New York Times Student Editorial & Essay Contests
--   382cab93-7abd-4d0b-b7f8-d566395c056a  The Juilliard School - Juilliard Pre-College
--   52a60b8e-7ac5-4258-b91f-09a34b9ad35d  Tufts College Experience (For-credit 6 week program)
--   9b013735-8ae8-4175-8861-6022b3aaf9ce  University of Exeter, United Kingdom

-- ══════════════════════════════════════════════════════════════════
-- 6) Açıklamasına başka kurumun metni karışmış — 4 kayıt
-- ══════════════════════════════════════════════════════════════════
-- Description/organization mismatch sweep — staged cleanup
-- 2026-09-03, oryn-bd, branch docs/description-org-mismatch-sweep-2026-09-03
--
-- STAGED ONLY. Not applied. Founder review required before running against the live DB
-- (qtcvcflzxbuagvvwahhu) — every write to this data is founder-gated per standing rule,
-- same as data/research/opportunities/description_contamination_cleanup_2026-09-02.sql.
--
-- ============================================================================================
-- BRIEF THIS ANSWERS
-- ============================================================================================
-- CEO (oryn-a7) assigned this after 6e's organization-fill pass found ~1-in-5 of 84 records
-- had a prestige-brand-vs-real-operator mismatch in the structured `organization` field
-- (ISSOS marketed under St Andrews/Cambridge/Yale but privately run; "Greenwich Olympiad"
-- with no Greenwich involvement; "UNAT" not the UN). Split: 6e owns `organization` and
-- `cycle_status`; this pass owns `description` — sweep prose for the SAME class of defect
-- (a description naming an organization that contradicts the record's real identity), fix
-- what's in-lane, flag what isn't.
--
-- ============================================================================================
-- METHOD
-- ============================================================================================
-- 216 of 282 active opportunities have organization filled. A word-boundary regex sweep for
-- ~35 well-known university/UN/Turkish-institution names, checked against organization NOT
-- containing that same name, returned ~24 hits -- almost all false positives on inspection
-- (same-entity abbreviations like "Caltech" vs "California Institute of Technology"; city/
-- neighborhood name collisions like "Cambridge, MA" and "Greenwich Village"; and legitimate,
-- already-accurate venue/partner mentions like Immerse Education's "held at Cambridge, Oxford
-- and London" -- true, since Immerse is the real operator and never claims otherwise). Zero
-- of those 24 were real description-side contradictions against a correctly-filled
-- organization. One (Marshall Society, flagged below, not fixed here) turned out to be the
-- INVERSE: description already correct, organization field is the one that's wrong.
--
-- A second, narrower sweep for the literal cross-institution-splice shape -- unrelated
-- program text concatenated into one description, the "student reads the sentence" case the
-- CEO's brief specifically warned about -- targeted the 35 active records whose description
-- still has the old raw pipe-delimited scrape format (regex '\|.*\|.*\|', never rewritten
-- into prose). That is where the real, fixable finds were: 4 records below.
--
-- All 4 were cross-checked against the existing 2026-09-02 organization-research files
-- first, since three of the four had already been independently identified and correctly
-- resolved there -- this pass only had to close the gap those files explicitly left open
-- (organization fixed or staged; description contamination never addressed by anyone).
--
-- Each UPDATE is guarded by the row's exact current `description` value, not a prefix, since
-- these are medium-length fields and a full match leaves zero ambiguity about what's being
-- overwritten. A CORRECT run prints `UPDATE 1` four times. `UPDATE 0` on any statement means
-- that row's description changed since 2026-09-03 -- stop, don't force it, re-derive fresh.
--
-- ============================================================================================

-- [paket: 'BEGIN;' kaldırıldı — işlem dıştaki BEGIN/COMMIT tarafından yönetiliyor]

-- 1. 'Pre-College Program' (id 3c4cbeb7-b625-45d0-a0b9-f34df979a3d8)
-- official_url is events.ie.edu -- IE University's own Madrid/Segovia pre-college page.
-- organization_research_verified_leads_2026-09-02.sql already confirmed this and staged
-- organization = 'IE University' (not yet applied). But nobody touched description: it ends
-- with a verbatim fragment from an unrelated Koç University program ("Pre-College Program |
-- Koç University | Finansal Muhasebe, İnsan Hakları, Siyaset Bilimine Giriş" -- Financial
-- Accounting, Human Rights, Intro to Political Science). Koç does run its own genuine research
-- program elsewhere in the catalog (id 2116709f, KUSRP) -- this fragment isn't that record's
-- own content going missing, just contamination that leaked into this one. Once organization
-- lands as 'IE University', an unfixed description naming Koç University would be exactly the
-- "right field, wrong sentence" case the brief warned is worse than a null. Truncated to the
-- IE-only content; nothing added, nothing about IE's own program touched.
UPDATE opportunities
SET description = 'Pre-College Summer Program | Applications open in November 2025 | Global Humanities and Critical Thinking | Good Design is Good Business | Innovation and Technology | International Finance | Marketing and Communication | International Business Law | World Politics and International Development | Entrepreneurship | Age group: 16-17 year-olds | The tuition fee of 4800€ covers the academic agenda and full-board accommodation. | Location: Madrid and Segovia | Dates: 1.intake: June 23rd - July 5th, 2.intake: June 30th - July 12th, 3.intake July 14th - July 26th 2026 | Please check the website for dates and info.'
WHERE id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8'
  AND description = 'Pre-College Summer Program | Applications open in November 2025 | Global Humanities and Critical Thinking | Good Design is Good Business | Innovation and Technology | International Finance | Marketing and Communication | International Business Law | World Politics and International Development | Entrepreneurship | Age group: 16-17 year-olds | The tuition fee of 4800€ covers the academic agenda and full-board accommodation. | Location: Madrid and Segovia | Dates: 1.intake: June 23rd - July 5th, 2.intake: June 30th - July 12th, 3.intake July 14th - July 26th 2026 | Please check the website for dates and info. | Pre-College Program | Koç University | Finansal Muhasebe, İnsan Hakları, Siyaset Bilimine Giriş';

-- 2. 'Trinity College London, Ireland' (id f8fc69c2-e48f-48d1-9a5f-6323a7c10e34)
-- official_url is tcd.ie -- Trinity College Dublin. organization_research_verified_leads_
-- 2026-09-02.sql already confirmed this and staged organization = 'Trinity College Dublin'
-- (not yet applied), and its own note already flagged the title's "London" as wrong ("the
-- title itself may be worth a separate correction, outside this task's organization-only
-- scope") -- that title fix still hasn't landed anywhere as of this pass and isn't staged
-- here either (title is neither this task's lane nor 6e's; flagged in the companion doc so
-- it doesn't fall through a second time). What WAS in this task's lane: description splices
-- in a full paragraph of unrelated University of Amsterdam / UvA Summer School content after
-- the genuine Trinity Walton Club STEM-club text. Truncated to the Trinity-only content.
UPDATE opportunities
SET description = 'Trinity Walton Club Saturday STEM: July | For more information: | *Please see the websites for detailed information and requirements.'
WHERE id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34'
  AND description = 'Trinity Walton Club Saturday STEM: July | For more information: | *Please see the websites for detailed information and requirements. | University of Amsterdam: Amsterdam, Netherlands | UvA Summer School | Many of this year’s Summer School programmes offer students the unique chance to get to know Amsterdam from an academic perspective. International and local students can follow high-quality summer programmes that investigate thematic topics within the context of Amsterdam’s society, culture, architecture and infrastructure. More than 600 students from all over the world take part in our 27 English-taught summer courses each year. The courses take place from June to August and are between 1 and 4 weeks long. | Pre-University Honor programmes: | -Busi…';

-- 3. 'The Summer School of the Polytechnic University of Milan (POLIMI) 2026'
-- (id 8e5c10af-aebb-449c-9811-fed9dcc14039)
-- official_url is techcamp.polimi.it. organization_backfill_2026-09-02.sql already staged
-- organization = 'Politecnico di Milano' (not yet applied). Description's tail names two
-- unrelated institutions -- Modul University Vienna and the University of Sussex -- that
-- have nothing to do with POLIMI's own TECHCAMP; reads as scrape contamination from other
-- programs' pages, same shape as the IE/Trinity cases above. Truncated to the POLIMI-only
-- content (kept "Program details: (including Race car dynamics and cybersecurity and
-- hacking)" since that reads as elaborating POLIMI's own STEM course list, not a splice).
UPDATE opportunities
SET description = 'Aimed at students in their second year of high school (or their first year in four-year programs) | Plan your summer in the classrooms of Italy''s largest science-technological university | Discover the TECHCAMP courses and test yourself with the technology of tomorrow. | Dates: 15-19 June 2026, or, 22-26 June 2026 | 500 available places | 11 STEM courses on future themes: Coding | Robotics | Mobility | Cybersecurity | Green Energy | AI | Sport Engineering | Architecture | Design | Mathematics | Where: Campus Città Studi, Campus Bovisa, Campus Lecco | Program details: (including Race car dynamics and cybersecurity and hacking)'
WHERE id = '8e5c10af-aebb-449c-9811-fed9dcc14039'
  AND description = 'Aimed at students in their second year of high school (or their first year in four-year programs) | Plan your summer in the classrooms of Italy''s largest science-technological university | Discover the TECHCAMP courses and test yourself with the technology of tomorrow. | Dates: 15-19 June 2026, or, 22-26 June 2026 | 500 available places | 11 STEM courses on future themes: Coding | Robotics | Mobility | Cybersecurity | Green Energy | AI | Sport Engineering | Architecture | Design | Mathematics | Where: Campus Città Studi, Campus Bovisa, Campus Lecco | Program details: | (including Race car dynamics and cybersecurity and hacking) | Modul University, Vienna, Austria | 1 week long introductory program. | University of Sussex (Su…';

-- 4. 'Winchester College - Discover Summer Program' (id 483c0af4-92e1-4599-a4e9-8ac6eec69a57)
-- Different shape from the other three: not a splice of a DIFFERENT institution, but the
-- record's own content duplicated verbatim (the ingest scrape ran twice into one field), with
-- the second copy cut off mid-word. Organization is unresolved and contested between two
-- 2026-09-02 files, not this pass's call: official_url_provenance_fixes_2026-09-02.sql staged
-- organization = 'Winchester College' + a winchestercollegesummerprogramme.com URL, while
-- organization_backfill_2026-09-02.sql staged organization = 'Discovery Summer (independent
-- provider; Biltur is a Turkey-based enrollment agency, not the operator)' for the SAME row —
-- flagged for 6e/CEO in the companion doc, not resolved here. What's fixed here is purely the
-- description-side duplication: kept one copy, dropped the repeat and a stray orphaned "US"
-- token sitting right at the seam (undecipherable out of context -- not guessed at, just cut
-- along with the duplicate it introduces).
UPDATE opportunities
SET description = 'Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, GenAI, IELTS Listening and Speaking, STEM, Politics/Model UN, Philosophy | July-August 2024: 2-3-4 weeks options'
WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57'
  AND description = 'Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, GenAI, IELTS Listening and Speaking, STEM, Politics/Model UN, Philosophy | July-August 2024: 2-3-4 weeks options | US | Winchester College - Discover Summer Program | Pre-College Program (15-17 years) | Core subjects:Economics and Business, Filmmaking, International Relations, Advanced STEM, IELTS/Academic English, Technology and AI, | Additional subjects: Business Studies, Cultural English, Debate, Digital Photography, Filmmaking, G…';

-- Review the four UPDATE 1 / UPDATE 0 results above, then:
-- COMMIT;
-- or, if any statement printed UPDATE 0:
-- ROLLBACK;


-- ══════════════════════════════════════════════════════════════════
-- 7) Son tarih bulunanlar — 5 kayıt
-- ══════════════════════════════════════════════════════════════════
-- Deadline-coverage promotions, 2026-09-03
--
-- 5 rows out of a 112-row population (active + under_review opportunities with deadline IS NULL,
-- excluding the 3 non-actionable cycle_status values and everything already individually verified
-- in the two prior under_review verification tasks) were found to carry a real, specific, currently
-- correct deadline on their own official page today. Each UPDATE below sets deadline, plus a
-- cycle_status correction ONLY where the live source directly and explicitly contradicted the stored
-- value (never inferred), plus organization ONLY where it was null and the same source named the
-- operator unambiguously. verification_state/verified_at are refreshed for all 5 since all 5 were
-- personally checked against a live official source today, 2026-09-03.
--
-- A 6th candidate (Columbia Spring Immersion Program, id f912de6d-7da6-4e21-811b-1da09b10c86c) was
-- found tonight with an apparent deadline (2026-12-21) but is DELIBERATELY NOT staged here -- see
-- docs/opportunity-deadline-coverage-2026-09-03.md for why: an earlier task tonight already flagged
-- this exact row's official_url as resolving to a different, unconfirmed Columbia program, and
-- tonight's deadline finding doesn't resolve that ambiguity, just extracts a date from the same
-- questionable page.
--
-- Also NOT included: BMO Round 1 (f6dbce16-a6cb-4e8c-9ebd-01a57489879f), BMO Round 2
-- (e5a8555d-7e5b-4fd4-8406-812efbe1de91), and Senior Team Mathematical Challenge
-- (1cd3d046-3101-4314-b068-4d946286512e) -- all 3 already have deadline/cycle_status staged by
-- data/research/opportunities/under_review_promotions_2026-09-03.sql from earlier tonight, checked
-- against the same official pages; nothing new to add.
--
-- Dry-run validated live via begin/rollback before this file was written -- all 5 statements matched
-- expected values, confirmed rolled back after (deadline NULL again for all 5 post-rollback).
--
-- See docs/opportunity-deadline-coverage-2026-09-03.md for full findings, sourcing, and the 107 rows
-- that did NOT yield a stageable deadline.

-- Baltic Sea Philosophy Essay Event (BSPEE)
-- id 7d573141-bca6-459d-a206-43aebae178c4
-- Source: https://bspee.wordpress.com/2026/09/02/invitation-letter-2026/ (checked 2026-09-03)
-- Letter dated the day before this check: schools request essay topics from FETO by Sept 24;
-- submit selected papers by Oct 17. cycle_status was 'date_not_announced' -- stale by about a day;
-- the letter confirms an open, currently-running cycle.
update opportunities
set deadline = '2026-09-24',
    cycle_status = 'open',
    verification_state = 'verified_current',
    verified_at = now()
where id = '7d573141-bca6-459d-a206-43aebae178c4';

-- JAX Summer Student Program
-- id eb956520-51c2-43d1-a57b-ec29dd664315
-- Source: https://www.jax.org/education-and-learning/high-school-students-and-undergraduates/learn-earn-and-explore/admission (checked 2026-09-03)
-- Page states the 2027-cycle deadline explicitly: "January 25, 2027 at 5:00 p.m. ET." Application
-- portal itself doesn't open until November 2026. cycle_status was 'date_not_announced' -- stale,
-- since a specific date has in fact been announced even though the portal isn't open yet;
-- 'upcoming' fits this state better than either the old value or 'open'.
update opportunities
set deadline = '2027-01-25',
    cycle_status = 'upcoming',
    verification_state = 'verified_current',
    verified_at = now()
where id = 'eb956520-51c2-43d1-a57b-ec29dd664315';

-- Ron Brown Scholar Program
-- id abe62a46-56f4-449a-b008-d072b1be5dc4
-- Source: https://ronbrown.org/ron-brown-scholarship/ (checked 2026-09-03)
-- Page states verbatim "December 1: Final application submission deadline" alongside "APPLY NOW --
-- 2027 Application is now open!" -- the 2026-27 senior-year window just opened. Year inferred from
-- the page's own cycle-naming convention ("2027 Application" = entering college fall 2027), not
-- printed as a bare "December 1, 2026" string. cycle_status was 'date_not_announced' -- stale, since
-- the cycle is explicitly open now with a published deadline.
update opportunities
set deadline = '2026-12-01',
    cycle_status = 'open',
    verification_state = 'verified_current',
    verified_at = now()
where id = 'abe62a46-56f4-449a-b008-d072b1be5dc4';

-- NYC Commuter Summer -- Columbia University Pre-College Programs
-- id 3318dba7-e099-4de2-83db-f27d6697f1be
-- Source: https://precollege.sps.columbia.edu/admissions/dates-and-deadlines (checked 2026-09-03)
-- "General Application Deadline: April 1, 2027" for NYC Commuter Summer (all sessions). cycle_status
-- ('upcoming') and organization ('Columbia University') were already correct -- deadline only.
-- Unlike the Spring Immersion Program row above, this row's own official_url and title are
-- consistent with each other and with the dates-and-deadlines page reached -- no identity ambiguity.
update opportunities
set deadline = '2027-04-01',
    verification_state = 'verified_current',
    verified_at = now()
where id = '3318dba7-e099-4de2-83db-f27d6697f1be';

-- Columbia University Pre-College Online Summer
-- id 79117533-f7d0-4319-8636-16cbe9864673
-- Source: https://precollege.sps.columbia.edu/admissions/dates-and-deadlines (checked 2026-09-03)
-- Same shared source page, "Online Summer (all sessions)": "General Application Deadline: April 1,
-- 2027." cycle_status ('upcoming') and organization ('Columbia University') were already correct --
-- deadline only. Same identity-consistency note as the row above.
update opportunities
set deadline = '2027-04-01',
    verification_state = 'verified_current',
    verified_at = now()
where id = '79117533-f7d0-4319-8636-16cbe9864673';


COMMIT;

-- ── DOĞRULAMA — uyguladıktan sonra çalıştır ──────────────────────────
select count(*) as kayit,
       count(*) filter (where organization is null or btrim(organization)='') as kurum_bos,
       count(*) filter (where cycle_status = 'unverified') as dogrulanmamis,
       count(*) filter (where deadline is null) as tarih_bos
from public.opportunities where status in ('active','under_review');
-- Öncesi (2026-09-03 04:00): 394 kayıt · 172 kurum boş · 181 doğrulanmamış · 314 tarih boş
