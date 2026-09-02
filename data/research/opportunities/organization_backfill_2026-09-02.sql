-- Staged, NOT applied. Backfills organization on 109 opportunities rows null since the
-- 2026-08-18 Drive-corpus import, using organization values already committed in
-- data/research/opportunities/*.jsonl (source_file column below, for review).
-- Run manually (with a real UPDATE against these ids) only after a human review pass.
-- See docs/null-organization-dedup-defect-2026-09-02.md for the full diagnosis.

-- '67th London International Youth Science Forum (LIYSF) - 2026'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'London International Youth Science Forum' WHERE id = 'c7223aea-7bb9-4b29-b59d-a054d7bfa02c';
-- 'Acıbadem Üniversitesi Lise Yaz Programları'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'a4451907-20af-43d3-8498-25a3829254c1';
-- 'AI Scholars'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Carnegie Mellon University' WHERE id = '3f7170ba-9486-40b0-b450-42462471e88d';
-- 'Andover Summer at Phillips Academy 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Academy Andover' WHERE id = 'c14ee166-0d7a-4c6c-8b78-f92b501dccbb';
-- 'AwesomeMath Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'AwesomeMath' WHERE id = 'cfe42a66-3688-43aa-8e7e-61ffca68adb8';
-- 'Bahçeşehir Üniversitesi Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bahçeşehir Üniversitesi (BAU)' WHERE id = 'de7ab9aa-74a5-43d1-b02f-2730b2aed80f';
-- 'Bentley University Pre-College Programs'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bentley University' WHERE id = '9e601648-0d30-462e-b9f0-8d069392f29f';
-- 'BETA Camp'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Prequel' WHERE id = 'd70e5392-9f0d-4191-8c8d-4921dbaa3651';
-- 'Boğaziçi Uni Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '19248dee-8118-47ee-9f5b-866b0d754be8';
-- 'BRAND-ED'  (source: data/research/opportunities/s5a_batch3_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'BRAND-ED' WHERE id = '72b66f92-1356-4827-9139-530db7c52c74';
-- 'Brown University (RI, USA)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Brown University Pre-College Programs' WHERE id = 'c2444f7f-e137-411d-9a14-c1ba8052e217';
-- 'Cambridge Future Scholars Programme'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Cambridge Scholars'' Programme Ltd (independent company)' WHERE id = '70519f22-f165-44cf-b954-a3ab864077e0';
-- 'Carnegie Mellon University (PA, USA)'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Carnegie Mellon University' WHERE id = 'b4091e25-c8ca-4042-9976-ee41ae4031d5';
-- 'Civic Leadership Institute (Grades 9-12)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '8a302e54-e237-49f7-9757-9b5262ae592b';
-- 'Clark Scholars Program'  (source: data/research/opportunities/dlopp_sp_batch5.jsonl)
UPDATE opportunities SET organization = 'Texas Tech University' WHERE id = '676bc788-9ce0-4bf8-873a-d5e897a24ccf';
-- 'College Edge Summer'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = '40ef389f-b58f-447d-87b4-b7deb3effe2a';
-- 'Columbia Spring Immersion Program'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = 'f912de6d-7da6-4e21-811b-1da09b10c86c';
-- 'Columbia University: New York, NY'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Columbia University, School of Professional Studies' WHERE id = '17d177de-6ca7-4754-ab15-3a9dd93f4893';
-- 'Coriell Institute for Medical Research, NJ, USA'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Coriell Institute for Medical Research' WHERE id = 'eee7b96a-b38b-4944-a60c-69ae953c2ca0';
-- 'Cornell University'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Cornell University, School of Continuing Education' WHERE id = '9caff85d-6976-422e-8fa1-6893eaefa54c';
-- 'CTY: Intensive Studies for 7th Graders and Above'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = 'd224a324-b3c0-4a5f-a361-3805efc20a14';
-- 'DigiPen Academy Pre-College Summer Programs 2025'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'DigiPen Institute of Technology' WHERE id = '036f80e1-7ae5-46a9-8b68-6a890d50f8b8';
-- 'Downing College University of Cambridge - 2026'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Downing College, University of Cambridge -- International Programme (verify institutional affiliation; college-run, not necessarily university-wide)' WHERE id = 'a5cf4328-7bc1-4ad7-9de5-8bc8b7df9220';
-- 'Durham University Global Futures Summer School 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Durham University' WHERE id = '5af50558-fcb5-4390-a8ff-5a6946e65862';
-- 'University of Edinburgh Pre-University Summer School 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Edinburgh, Centre for Open Learning' WHERE id = 'dc762fce-b83a-4217-a610-290ac2f65f17';
-- 'Fordham University: New York, NY'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Fordham University' WHERE id = '76a53c74-ea3a-4951-84af-a3e108a62d2c';
-- 'Frontiers Overview'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Worcester Polytechnic Institute (WPI)' WHERE id = '9f0bb452-86ff-4f7b-93fd-9e23298c2d3b';
-- 'Future Ready Summer Experience Program 2025 | Inspiring Global Citizens'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Renison University College, University of Waterloo' WHERE id = '053114c6-b049-4eab-b7e1-b081efe183c9';
-- 'Galatasaray University High School Summer Programs 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Galatasaray University' WHERE id = 'b3e40e31-a82d-4a34-bceb-b841f20d7296';
-- 'George Washington University: Washington, DC'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'George Washington University' WHERE id = 'aeeb130a-30f6-440f-867e-861cd723a6db';
-- 'Georgetown University HOYA Summer-High School Sessions'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Georgetown University School of Medicine' WHERE id = 'a78975de-a35f-4030-b4fd-88a724b653ae';
-- 'Global Issues at Princeton: Grades 10-12'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '4f668b96-af7e-4595-a097-7447a230004c';
-- 'HKUST I·ELITE Pre-University Scholars Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Hong Kong University of Science and Technology (HKUST)' WHERE id = 'f3cda419-64ae-4bac-bda9-3d1c6ccbbc37';
-- 'Horizon Inspires'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Horizon Inspires' WHERE id = '74bf3eb7-6f04-4dbb-9b71-9175287ed4b8';
-- 'HSHSP (High School Honors Math, Science and Engineering Program)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Michigan State University College of Education' WHERE id = '7b6ebabf-dd0a-4da5-9155-381674f6d7f0';
-- 'iD Tech Camps'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'iD Tech' WHERE id = '1b636769-b88d-4c54-a270-79c3f68a044c';
-- 'IE JAB (Junior Advisory Board)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'IE University' WHERE id = '5eff8569-58f3-48fd-89ba-a320725b6321';
-- 'Illinois Institute of Technology: Chicago, IL'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Illinois Institute of Technology' WHERE id = 'f05643c5-88fa-477c-ac16-8de0b0b547bc';
-- 'Inspirit AI + Healthcare and Medicine'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Inspirit AI' WHERE id = 'f54d2f62-6335-4f19-a05f-f03c3e47bc40';
-- 'Institute for Advanced Critical and Cultural Studies, Carlisle, PA: Grades 10-12'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = '4c7f5a9f-79d0-42df-8343-fc6a4983fe8d';
-- 'International Research Institute of North Carolina (IRI)'  (source: data/research/opportunities/s5b_batch2_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'International Research Institute of North Carolina' WHERE id = '09b42a46-cd61-4576-bc5a-565975c66d05';
-- 'International Summer School for Young Physicists (ISSYP)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Perimeter Institute for Theoretical Physics' WHERE id = '8980e51b-9889-4cb0-a6dc-e11a60a59e51';
-- 'International Summer Schools St Andrews, Cambridge and Yale Universities (ISSOS)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'ISSOS (organizing legal entity not independently confirmed this session)' WHERE id = 'f52db280-638a-49ec-a972-d1658b046234';
-- 'iStar Class Credit and Research Program'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'IPERC Academy' WHERE id = '83bbb28b-437b-4ab1-9a3d-45c23d061539';
-- 'John Locke Institute (JLI) Courses'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'John Locke Institute' WHERE id = 'cf169cf4-a589-4743-a70f-e1efd28fbcd2';
-- 'Johns Hopkins Engineering Innovation Pre-College Programs'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Johns Hopkins University, Whiting School of Engineering' WHERE id = '6d3a439a-433e-4cce-b155-4dfd4cb53b48';
-- 'Kadir Has Yaz Okulu'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Kadir Has University, sponsored by Kadir Has Foundation' WHERE id = 'ee5d3870-77a8-43e5-8800-8738f6318d5f';
-- 'Kode With Klossy'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Kode With Klossy' WHERE id = '455e6fb3-7592-45d4-852a-602acd95bd81';
-- 'Leangap'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Leangap' WHERE id = 'b5d022aa-302a-4712-b960-a5f70386af17';
-- 'Lumiere Education'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'Lumiere Education' WHERE id = 'bc678344-c213-4ae8-a4f8-48af2856338f';
-- 'Mathworks (Honors Summer Math Camp)'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Texas State University, Mathworks' WHERE id = 'ccc1ff13-8673-4ba0-95fc-17050eee4306';
-- 'NEW! The Immerse Cambridge Experience: A one-week taster program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = 'dc0b92eb-5887-4163-8b71-1c3a4ab3bf80';
-- 'Northwestern University'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Northwestern University Center for Talent Development (CTD)' WHERE id = 'af30653c-94d1-4ce2-8781-b60e659d48ef';
-- 'NYU High School Law Institute'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'NYU School of Law (student-run organization)' WHERE id = '6d62d570-533a-49a4-9f86-aecf5e316b58';
-- 'NYU Tandon Machine Learning Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'NYU Tandon School of Engineering' WHERE id = '08ee973d-9dce-485e-b2f2-51deeb48c2ff';
-- 'Oxford Royale'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Oxford Programs Limited (independent company)' WHERE id = '6f80e90f-7d85-4c93-b833-f47cbbf6b0c3';
-- 'Oxford Royale Summer Schools'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Oxford Programs Limited (independent company)' WHERE id = '7cfc009f-d826-44d8-9d14-d33ef3c1475c';
-- 'Özyeğin University Summer School 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Özyeğin University' WHERE id = '78c7c178-d6dd-4d50-a76f-b44ebd603784';
-- 'PACT Program in Algorithmic and Combinatorial Thinking'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'PACT (affiliated with University of Pennsylvania / Princeton per historical hosting)' WHERE id = '9d4f568b-f14b-4925-bf79-753088583ffe';
-- 'Phillips Exeter Academy'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Exeter Academy' WHERE id = '7761f771-fd60-48d8-a51f-152349051747';
-- 'Phillips Exeter Academy - New Hampshire NH'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Phillips Exeter Academy' WHERE id = 'f069afec-005f-43a8-82f2-6869785ad6f1';
-- 'Polygence'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'Polygence' WHERE id = '0337369f-bb69-47e5-aa82-d4a0e92a674b';
-- 'Pre-Baccalaureate Program'  (source: data/research/opportunities/s5a_batch15_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Wharton School, University of Pennsylvania (Wharton Global Youth Program)' WHERE id = 'bbb81017-3570-4a13-8e82-e4bf612b3436';
-- 'Pre-College Summer Programs (Immersion/Stones and Bones/Summer Bridge/Summer College)'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Chicago' WHERE id = '9f1b802e-cbc1-4af2-98f1-ffddfa06140b';
-- 'PreCollege at Ringling College of Art and Design'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Ringling College of Art and Design' WHERE id = 'fd51d7f8-1408-4d58-9558-47520758df3d';
-- 'PROMED Projects 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Premed Projects' WHERE id = '1e0f59bd-2a96-4744-b5fd-90a9c0ba5801';
-- 'RISD Pre-College Rhode Island School of Design'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Rhode Island School of Design (RISD)' WHERE id = '0cb2bd7c-9a36-44c5-9bbf-ecb9cbe586f4';
-- 'RISE (Research in Science and Engineering) at BU'  (source: data/research/opportunities/wave1_2026-08-18_groupB.jsonl)
UPDATE opportunities SET organization = 'Boston University' WHERE id = '1e54b150-ceb2-4c22-92b9-a0d93fc34df6';
-- 'Robomaster High School Summer Camp (Shenzhen, China)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Southern University of Science and Technology and DJI' WHERE id = '69be38ed-9d26-46e3-aaf1-4819fa83f6ca';
-- 'Sabancı University Summer School 2026'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Sabancı University' WHERE id = 'aaf5b259-4e72-4cba-85a9-43be675384aa';
-- 'Sevenoaks School Summer Program'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Sevenoaks School' WHERE id = 'a17202b1-b8da-4ed4-8cf7-ee0506d01653';
-- 'SSTP'  (source: data/research/opportunities/dlopp_sp_batch6.jsonl)
UPDATE opportunities SET organization = 'University of Iowa (Belin-Blank Center)' WHERE id = '3533791e-62a7-49b7-a983-469a8a1c2514';
-- 'Stanford Institutes of Medicine Summer Program (SIMR)'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Stanford School of Medicine' WHERE id = '8f0a8a3f-6c12-4277-91ca-7d120222b231';
-- 'Stanford Summer Humanities Institute'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Stanford Pre-Collegiate Studies' WHERE id = 'cb2e1b38-c154-4cc7-9186-bb1aa4e724a7';
-- 'Student Science Training Program'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Florida, Center for Precollegiate Education and Training (CPET)' WHERE id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55';
-- 'Summer High School Programs - at BU'  (source: data/research/opportunities/dlopp_sp_batch1.jsonl)
UPDATE opportunities SET organization = 'Boston University' WHERE id = 'e03e1172-cc32-4c92-8eff-668cd6ea6fe7';
-- 'Summer Science Research Program (SSRP) 2023'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'The Rockefeller University - RockEDU Science Outreach' WHERE id = 'a29d4ef0-735f-4281-b486-51c1450077eb';
-- 'Summer@Brown'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Brown University Pre-College Programs' WHERE id = '47bc163d-65b1-4e72-94bd-ffc7fabe8a20';
-- 'The Juilliard School - Juilliard Pre-College'  (source: data/research/opportunities/s5a_batch13_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'The Juilliard School' WHERE id = '382cab93-7abd-4d0b-b7f8-d566395c056a';
-- 'The Rockefeller University Summer Science Research Program (SSRP)'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'The Rockefeller University - RockEDU Science Outreach' WHERE id = '2bbea7da-09bb-4eca-b46b-c3b5363e3b92';
-- 'The Summer School of the Polytechnic University of Milan (POLIMI) 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Politecnico di Milano' WHERE id = '8e5c10af-aebb-449c-9811-fed9dcc14039';
-- 'The Wall Street 101 Summer Pre-College Program'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Bentley University' WHERE id = '12d06ccb-6b51-4ea2-8a9e-7c326fa97514';
-- 'Tufts College Experience (For-credit 6 week program)'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Tufts University' WHERE id = '52a60b8e-7ac5-4258-b91f-09a34b9ad35d';
-- 'Tulane University Pre-College, New Orleans'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Tulane University' WHERE id = 'f9421944-556f-46ed-b748-cfdce8ed8cf7';
-- 'UC Berkeley Business Academy for Youth'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC Berkeley Haas School of Business' WHERE id = '7a2a2aea-af5f-4e06-ba12-104f08df7b8c';
-- 'UC San Diego Futures Programs'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC San Diego Division of Extended Studies' WHERE id = '10a944b3-26de-4bcc-a408-baa5b57e6c81';
-- 'UCL The Bartlett Summer Schools 2025'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University College London (UCL), The Bartlett School of Architecture' WHERE id = 'eaabbbee-17f6-4142-b9b4-a49bfa87fa7b';
-- 'UCSB Research Mentorship Programs'  (source: data/research/opportunities/s5b_batch1_2026-08-26.jsonl)
UPDATE opportunities SET organization = 'UC Santa Barbara Summer Sessions' WHERE id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90';
-- 'UniHive Summer Programmes hosted at the University of Cambridge'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UniHive Education' WHERE id = 'f9b261e6-69fb-4c1e-b7f9-ec9870ba79ac';
-- 'University of Applied Sciences and Arts of Western Switzerland'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'HEIA-FR (School of Engineering and Architecture of Fribourg), part of HES-SO' WHERE id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48';
-- 'University of Bath International Summer School'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Bath' WHERE id = 'bb519c8f-71f8-4e89-83e2-3b7e7a7ebf1f';
-- 'University of California, Santa Barbara, CA, USA'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'UC Santa Barbara' WHERE id = 'ce7d618b-debf-4508-87e1-f6905540bf8d';
-- 'University of Chicago Chicago, IL'  (source: data/research/opportunities/s5a_batch16_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Chicago' WHERE id = '16ab0b91-6ecd-463a-a0bf-85f9376c67a9';
-- 'USC Pre-College Summer Programs'  (source: data/research/opportunities/wave1_2026-08-18_groupD.jsonl)
UPDATE opportunities SET organization = 'University of Southern California' WHERE id = '4a54159a-58dd-4304-a139-2b76f2a9fe38';
-- 'University of the Arts London - The UAL International Summer School'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of the Arts London (UAL)' WHERE id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1';
-- 'UWC Türkiye (United World Colleges)'  (source: data/research/opportunities/s7_MASTER_consolidated.jsonl)
UPDATE opportunities SET organization = 'UWC International, via the UWC Türkiye National Committee (volunteer-run)' WHERE id = '97fa39ad-8c65-4603-a07d-c88fe22982ef';
-- 'Vesalius College: Brussels, Belgium Innovative Entrepreneurship Summer Programme'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Vesalius College (institutional successor unclear)' WHERE id = '53ae13de-cbc9-443f-b668-5b557d9a1290';
-- 'Warwick University Pre-University Summer Programme 2026'  (source: data/research/opportunities/s5a_batch12_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'University of Warwick' WHERE id = 'ff5d9710-80d3-47ae-959a-b8b40406f003';
-- 'Wharton Global Youth Program'  (source: data/research/opportunities/batch1_2026-08-17.jsonl)
UPDATE opportunities SET organization = 'University of Pennsylvania - Wharton School' WHERE id = 'fad2bef3-80e8-4b7e-a4a5-f7021f34767f';
-- 'Winchester College - Discover Summer Program'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'Discovery Summer (independent provider; Biltur is a Turkey-based enrollment agency, not the operator)' WHERE id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57';
-- 'XLAB International Science Camp, Germany'  (source: data/research/opportunities/s5a_batch14_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'XLAB Göttingen' WHERE id = '9f611eed-7787-4d26-b1a5-7c9cda0439aa';
-- 'York University Helix Summer Science Institute (ON, CANADA)'  (source: data/research/opportunities/s5a_batch11_2026-08-27.jsonl)
UPDATE opportunities SET organization = 'York University Faculty of Science' WHERE id = '87f773f9-c7d2-4233-8061-7002e272df7c';
-- 'BmMT (online)'  (source: data/research/opportunities/counseling-list-verification_2026-08-21.jsonl)
UPDATE opportunities SET organization = 'Berkeley Math Tournament (UC Berkeley student-run)' WHERE id = '823e79e6-3d59-48c4-a3cf-39bc9a670b98';
-- 'Horizon Academic Essay Prize'  (source: data/research/opportunities/cr1_commercial_tier.jsonl)
UPDATE opportunities SET organization = 'Horizon Inspires / Horizon Academic' WHERE id = '496ef7db-b8d4-4a72-8bcc-b7cb13208e40';
-- 'Immerse Education Essay Competition'  (source: data/research/opportunities/cr1_commercial_tier.jsonl)
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = 'ce680bf5-d52a-444e-a7de-ed1789cfc6aa';
-- 'Princeton University Ten-Minute Play Contest'  (source: data/research/opportunities/cr1_active_unverified_fixes.jsonl)
UPDATE opportunities SET organization = 'Lewis Center for the Arts, Princeton University' WHERE id = '0f182854-87b1-449b-b76e-292acbc2a482';
-- 'The Diana Award'  (source: data/research/opportunities/wave5_2026-08-21_thin-categories.jsonl)
UPDATE opportunities SET organization = 'The Diana Award (UK charity)' WHERE id = 'b399d24d-3606-4d3d-bb59-2b94623c58b2';
-- 'The Harvard Crimson Global Essay Competition'  (source: data/research/opportunities/s7photo_corpus_batchB.jsonl)
UPDATE opportunities SET organization = 'The Harvard Crimson (verified this pass -- input record listed org as not recorded; see verification_method)' WHERE id = 'c582f1d9-ec28-4335-acd0-4140893dd23f';
-- 'RISE for the World'  (source: data/research/opportunities/wave1_2026-08-20_competitions-research-scholarships.jsonl)
UPDATE opportunities SET organization = 'Schmidt Futures and the Rhodes Trust' WHERE id = '6a932044-4fc8-483d-95df-9737262321f1';
