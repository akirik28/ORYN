-- Staged, NOT applied. Batch 2 of the 79-row research backlog (batch 1 was the 15-row
-- sample in organization_research_sample15_2026-09-02.sql). 23 rows, same rule: every
-- organization value from that program's own official page, opened directly this
-- session, source + access date on every line.
-- See docs/opportunity-org-research-batch2-2026-09-02.md for the hit-rate report and
-- why it dropped from the sample's 14/15 to 17/23 here -- a real, named pattern, not
-- noise. Run manually only after a human review pass, same gate as prior batches.

-- 'Bocconi Summer School 2026' (id e6f4c6d8-3e1d-4762-a6be-dd299592ac0e)
-- Stored URL 404s. Confirmed at unibocconi.it/en, opened 2026-09-02.
UPDATE opportunities SET organization = 'Bocconi University (Università Bocconi)' WHERE id = 'e6f4c6d8-3e1d-4762-a6be-dd299592ac0e';

-- 'Columbia Writing Academy' (id 3779b871-652b-4d56-bbd7-b1c451686852)
-- Confirmed at precollege.sps.columbia.edu, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Columbia University School of Professional Studies (Pre-College Programs)' WHERE id = '3779b871-652b-4d56-bbd7-b1c451686852';

-- 'Dive Into Engineering!' (id 16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec)
-- Confirmed at precollege.usc.edu/usc-viterbi-pre-college-programs, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'USC Viterbi School of Engineering' WHERE id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec';

-- 'Early College Program (ECP) Courses for High School Students' (id e9c4cd39-b514-4975-b010-1c627d7231c8)
-- Confirmed at saic.edu/high-school-programs, opened 2026-09-02, live. Same org as the
-- 'Earn college credit...' row already staged in batch 1 -- likely a near-duplicate pair,
-- flagged not resolved (dedup's job once both have an organization).
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = 'e9c4cd39-b514-4975-b010-1c627d7231c8';

-- 'For-Credit Fun-Sized Courses' (id 1d9d3901-b31f-44f8-9147-d6807b04ad3e)
-- NOT the same case as the bare 'Purdue University' row from batch 1 -- this one's URL
-- resolves to a specific school's specific course page. Confirmed at
-- engineering.purdue.edu (Lyles School of Civil and Construction Engineering), opened
-- 2026-09-02, live.
UPDATE opportunities SET organization = 'Purdue University (Lyles School of Civil and Construction Engineering)' WHERE id = '1d9d3901-b31f-44f8-9147-d6807b04ad3e';

-- 'Garcia Summer Scholars' (id d83d7048-537b-4450-8dfa-69e709cdb48f)
-- DEFECT CLASS 2 (dead official_url): stored URL 404s. Real one found via search and
-- opened directly: stonybrook.edu/garcia/summer-program/, 2026-09-02, live, describes
-- the Garcia Research Scholars Program.
UPDATE opportunities SET organization = 'Stony Brook University (Garcia Research Scholars Program)' WHERE id = 'd83d7048-537b-4450-8dfa-69e709cdb48f';

-- 'Harvard CURE Initiative to Eliminate Cancer Disparities' (id 9b93f1ce-9114-4a2e-96b7-2823f6145d21)
-- Confirmed at cure.dfhcc.harvard.edu, opened 2026-09-02, live: DF/HCC, not Harvard
-- University directly -- same title-implies-wrong-parent risk as batch 1's RSI/MIT case.
UPDATE opportunities SET organization = 'Dana-Farber/Harvard Cancer Center (DF/HCC)' WHERE id = '9b93f1ce-9114-4a2e-96b7-2823f6145d21';

-- 'Hochschule Bremen (HSB) City University of Applied Sciences, Germany' (id 8f6e438f-0465-4744-b09b-d4d8b3a82f97)
-- Stored deep-link 404s. Confirmed at hs-bremen.de/en, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Hochschule Bremen (City University of Applied Sciences)' WHERE id = '8f6e438f-0465-4744-b09b-d4d8b3a82f97';

-- 'İTÜ Tasarım Atölyesi (itüTA)' (id 6672d211-71e1-4667-b2eb-b266d4abc7b3)
-- Stored deep-link 404s. Parent domain (mim.itu.edu.tr) confirms İTÜ, opened 2026-09-02.
UPDATE opportunities SET organization = 'İstanbul Teknik Üniversitesi (İTÜ)' WHERE id = '6672d211-71e1-4667-b2eb-b266d4abc7b3';

-- 'Kış Bilim Kampı' (id c3a16d0e-55d1-4dd7-9c5e-d930a83b0460)
-- Confirmed at acibadem.edu.tr/merkezler/asegem, opened 2026-09-02, live -- same
-- phrasing already established in the 109-row backfill for a sibling Acıbadem row.
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'c3a16d0e-55d1-4dd7-9c5e-d930a83b0460';

-- 'Lise Kış Tıp Okulu' (id 2b09924c-c758-4375-b7b1-215009e50d8e)
-- Confirmed at highschoolprograms.ku.edu.tr/lise-tip-okulu, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '2b09924c-c758-4375-b7b1-215009e50d8e';

-- 'Maastricht Summer Program' (id 991e6bda-56b9-4b48-9a51-16e9f0ec7c38)
-- Confirmed at maastricht.dreamapply.com, opened 2026-09-02, live self-titled
-- application portal (hosted on a third-party SaaS tool, but the content is the
-- program's own, unlike batch 1's Young Founders Lab case).
UPDATE opportunities SET organization = 'Maastricht Summer School' WHERE id = '991e6bda-56b9-4b48-9a51-16e9f0ec7c38';

-- 'Nanoteknoloji ve Biyoteknoloji Lise Kış Kampı' (id 216c88aa-8950-4f45-aea9-62939682be0a)
-- Confirmed at ku.edu.tr/highschoolprograms/..., opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '216c88aa-8950-4f45-aea9-62939682be0a';

-- 'New York University (NY, USA)' (id 907e279d-bc2f-46b0-b970-9ed9c0abb261)
-- Title is bare, but unlike the American/Lehigh unresolved rows below, the stored URL
-- resolves to a real, specific hub page ('High School and Middle School Programs'),
-- confirmed at nyu.edu, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'New York University (NYU)' WHERE id = '907e279d-bc2f-46b0-b970-9ed9c0abb261';

-- 'Research in Biological Sciences (RIBS)' (id ea0a2569-e027-4d7c-b9b7-a858fb1359a8)
-- Confirmed at summer.uchicago.edu/programs/research-biological-sciences-ribs, opened
-- 2026-09-02, live.
UPDATE opportunities SET organization = 'University of Chicago (UChicago Summer Session)' WHERE id = 'ea0a2569-e027-4d7c-b9b7-a858fb1359a8';

-- 'Research Mentorship Program' (id 8296f39c-93da-48ab-acc5-af023b14f347)
-- Stored URL 404s. Parent domain (summer.ucsb.edu) confirms UCSB, opened 2026-09-02.
UPDATE opportunities SET organization = 'University of California, Santa Barbara (UCSB Summer Sessions)' WHERE id = '8296f39c-93da-48ab-acc5-af023b14f347';

-- 'Research Program KUSRP 2026' (id 2116709f-e222-43c7-95e0-f801053f8f2e)
-- Stored URL 404s. Parent domain (research.ku.edu.tr) confirms Koç Üniversitesi, opened
-- 2026-09-02. Almost certainly the same program as 'Koç University Research Program
-- KUSRP' already staged in batch 1 -- flagged as a likely duplicate pair, not resolved
-- here.
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '2116709f-e222-43c7-95e0-f801053f8f2e';

-- NOT STAGED — 'American University, Washington DC' (id c4e113c2-6e64-40d0-8251-0031ca86c64a)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Title is the bare institution name; stored URL
-- is a generic academic-calendar page, opened 2026-09-02 -- no specific youth program
-- identifiable from either. 'American University' would be technically true and
-- functionally useless for dedup, same reasoning as batch 1's Purdue row.

-- NOT STAGED — 'Google Computer Science Institute' (id 1da5f8df-9ea0-4a85-90ac-fa1539986611)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. DEFECT CLASS 3 (wrong-domain url): stored URL
-- (neiu.edu, a Bachelor's CS degree page) has nothing to do with a "Google Computer
-- Science Institute." Searched for the real program: Google's own national CSSI is
-- reported discontinued in 2022 by multiple secondary sources (not independently
-- confirmed here against one primary source), though Google's curriculum portal
-- (cssicurriculum.withgoogle.com, opened 2026-09-02) still exists and some
-- university-affiliated CSSI variants continue elsewhere. Can't tell which variant this
-- row meant without the original source -- writing either "Google" or a guessed
-- university would risk the wrong-organization failure mode.

-- NOT STAGED — 'King's College London (London, UK)' (id 1e907aad-2bd4-43e4-98c1-4d75b6413d7a)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. DEFECT CLASS 3 (wrong resource type): stored URL
-- (kclpure.kcl.ac.uk/portal/.../publications/...) is an academic publication-repository
-- entry for a researcher's paper, not a program page of any kind. No youth opportunity
-- identifiable from this URL. King's College London is presumably real and involved
-- somehow, but writing that in would be a guess dressed as a source.

-- NOT STAGED — 'Lehigh University' (id d12506f1-d77e-49c2-9dc8-55fe610da9b0)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Title bare; stored URL (global.lehigh.edu) is
-- Lehigh's general International Affairs office, opened 2026-09-02 -- not a youth
-- program page.

-- NOT STAGED — 'Lehigh University: Bethlehem, PA' (id a7a89e1e-a9e3-4a8e-9850-789c609a769d)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Same pattern as the row above, different Lehigh
-- URL (health.lehigh.edu, the College of Health), opened 2026-09-02 -- still not a
-- specific program page. Two separate rows, same institution, same defect shape.

-- NOT STAGED — 'Pre-College Program' (id 3c4cbeb7-b625-45d0-a0b9-f34df979a3d8)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Title is fully generic (no institution name in
-- the title at all). Stored URL (events.ie.edu/event/study-your-bachelor-at-ie-...) is
-- an undergraduate Bachelor's admissions event, opened 2026-09-02 -- not a pre-college
-- program for high schoolers. IE University is a plausible guess but not confirmed by
-- anything this row actually points to.
