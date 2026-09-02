-- Staged, NOT applied. The 11 of 12 leads from the closeout pass
-- (opportunity-catalog-closeout-2026-09-02.md) that were found via search while the
-- Browser tool was down, then independently confirmed by opening the programme's own
-- page directly once it recovered -- same standard as every other row in this thread.
-- The 12th lead (University of Exeter) did NOT survive verification -- see the bottom
-- of this file. Run manually only after a human review pass, same gate as every other
-- artifact in this chain of work.

-- 'American University, Washington DC' (id c4e113c2-6e64-40d0-8251-0031ca86c64a)
-- Confirmed at american.edu/summer/precollege, opened 2026-09-02, live: 'Precollege
-- Programs for High School Students.'
UPDATE opportunities SET organization = 'American University' WHERE id = 'c4e113c2-6e64-40d0-8251-0031ca86c64a';

-- 'Lehigh University' (id d12506f1-d77e-49c2-9dc8-55fe610da9b0)
-- Confirmed at academicoutreach.lehigh.edu/pre-college-programs, opened 2026-09-02,
-- live: '2027 Summer Pre-College Camps | Academic Outreach.' Same source resolves the
-- sibling 'Lehigh University: Bethlehem, PA' row below.
UPDATE opportunities SET organization = 'Lehigh University (Academic Outreach)' WHERE id = 'd12506f1-d77e-49c2-9dc8-55fe610da9b0';

-- 'Lehigh University: Bethlehem, PA' (id a7a89e1e-a9e3-4a8e-9850-789c609a769d)
-- Same source and organization as the row above.
UPDATE opportunities SET organization = 'Lehigh University (Academic Outreach)' WHERE id = 'a7a89e1e-a9e3-4a8e-9850-789c609a769d';

-- 'Purdue University' (id 16d56c3b-376b-4cf6-b8b1-12daaecf0068)
-- Confirmed at purdue.edu/thinksummer, opened 2026-09-02, live: 'Office of Summer and
-- Winter Sessions.' Distinct from the already-resolved 'For-Credit Fun-Sized Courses'
-- row (batch 2, Lyles School of Civil and Construction Engineering) -- this is Purdue's
-- general pre-college hub, not the same specific program.
UPDATE opportunities SET organization = 'Purdue University (Office of Summer and Winter Sessions)' WHERE id = '16d56c3b-376b-4cf6-b8b1-12daaecf0068';

-- 'Hong Kong Baptist University (HKBU)' (id 1d7aeeff-8ac6-417b-a257-46def5ec701f)
-- Stored URL was a PDF brochure. Confirmed at hs-summer.hkbu.edu.hk, opened 2026-09-02,
-- live: 'HKBU Summer Programmes for High School Students 2026' -- a dedicated page,
-- better than the original source even though it was recoverable.
UPDATE opportunities SET organization = 'Hong Kong Baptist University (HKBU)' WHERE id = '1d7aeeff-8ac6-417b-a257-46def5ec701f';

-- 'The Hong Kong Polytechnic University (PolyU)' (id 255377bc-7564-452d-96e5-b25fb6902aa0)
-- Stored URL was PolyU's general postgraduate admissions page. Confirmed at
-- polyu.edu.hk/summerinstitute, opened 2026-09-02, live: 'PolyU Summer Institute.'
UPDATE opportunities SET organization = 'The Hong Kong Polytechnic University (PolyU)' WHERE id = '255377bc-7564-452d-96e5-b25fb6902aa0';

-- 'Sabancı University Nanotechnology Winter School' (id 4db17042-5487-4090-9212-0d7243acaa26)
-- Stored URL was a PDF. Confirmed at sunum.sabanciuniv.edu/tr/egitim/kis-okulu-tr,
-- opened 2026-09-02, live: SUNUM's own education page.
UPDATE opportunities SET organization = 'Sabancı Üniversitesi Nanoteknoloji Araştırma ve Uygulama Merkezi (SUNUM)' WHERE id = '4db17042-5487-4090-9212-0d7243acaa26';

-- 'Pre-College Program' (id 3c4cbeb7-b625-45d0-a0b9-f34df979a3d8)
-- Stored URL was an IE University Bachelor's admissions event, unrelated to a
-- pre-college program. Confirmed at ie.edu/ie-summer-school/pre-university, opened
-- 2026-09-02, live: 'Pre-University Summer Programs at IE University,' ages 15-17.
UPDATE opportunities SET organization = 'IE University' WHERE id = '3c4cbeb7-b625-45d0-a0b9-f34df979a3d8';

-- 'King's College London (London, UK)' (id 1e907aad-2bd4-43e4-98c1-4d75b6413d7a)
-- DEFECT CLASS 3 recovered: stored URL was an academic publication-repository entry
-- (kclpure.kcl.ac.uk), not a program page. Confirmed at
-- kcl.ac.uk/summer/summer-on-campus/pre-university-summer-school, opened 2026-09-02,
-- live: 'Pre-University Summer School | Summer Programmes | King's College London.'
UPDATE opportunities SET organization = 'King''s College London' WHERE id = '1e907aad-2bd4-43e4-98c1-4d75b6413d7a';

-- 'University of St. Andrews (Scotland, UK)' (id e0960bef-227f-4360-ad8f-d910e5e8dc2b)
-- DEFECT CLASS 3 recovered: stored URL was a researcher-profile page
-- (research-portal.st-andrews.ac.uk), not a program page. Confirmed at
-- st-andrews.ac.uk/study/part-time/summer-courses/academic-experience, opened
-- 2026-09-02, live: 'Summer Academic Experience Courses,' ages 16-18.
UPDATE opportunities SET organization = 'University of St Andrews' WHERE id = 'e0960bef-227f-4360-ad8f-d910e5e8dc2b';

-- 'Trinity College London, Ireland' (id f8fc69c2-e48f-48d1-9a5f-6323a7c10e34)
-- The title conflated two real but different institutions (Trinity College London, in
-- England, and Trinity College Dublin, in Ireland). Confirmed at
-- tcd.ie/study/other-courses/summer-schools, opened 2026-09-02, live: 'Summer Schools -
-- Study - Trinity College Dublin' -- the 'Ireland' half of the title was correct, the
-- 'London' half was not. Organization written as Dublin, since that's what the source
-- and the .ie domain actually confirm; the title itself may be worth a separate
-- correction, outside this task's organization-only scope.
UPDATE opportunities SET organization = 'Trinity College Dublin' WHERE id = 'f8fc69c2-e48f-48d1-9a5f-6323a7c10e34';

-- 'Nat Geo Slingshot' (id 2b1886f1-29dd-4014-8044-b6ae04d6fb41)
-- Stored URL was an image-CDN PDF link. Confirmed at
-- nationalgeographic.org/society/projects/slingshot, opened 2026-09-02, live:
-- 'Slingshot Challenge - National Geographic Society.'
UPDATE opportunities SET organization = 'National Geographic Society' WHERE id = '2b1886f1-29dd-4014-8044-b6ae04d6fb41';

-- NOT STAGED, LEAD DISPROVEN — 'University of Exeter, United Kingdom' (id 9b013735-8ae8-4175-8861-6022b3aaf9ce)
-- The weaker lead flagged in the closeout doc (exeter.ac.uk/study/internationalsummerschool)
-- was opened directly, 2026-09-02, and does NOT survive verification: it's Exeter's own
-- "Go Abroad" page, listing summer schools at OTHER universities for Exeter's own
-- enrolled students to attend -- not a University of Exeter program for external high
-- schoolers at all. Confirms the closeout doc's own lower-confidence flag was right to
-- be there. Remains unresolvable without the original source.
