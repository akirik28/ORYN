-- Staged, NOT applied. Batch 3 of the 79-row backlog (22 rows; one row from this
-- batch's pull, University of Maastricht, was deliberately SKIPPED — see note at the
-- bottom, it's already a known defect on oryn-d0's queue, not re-researched here).
-- Same rule throughout: every organization value from that program's own official page,
-- opened directly this session, source + access date on every line.
-- See docs/opportunity-org-research-batch3-2026-09-02.md for the hit-rate report.

-- 'School of the Art Institute of Chicago (SAIC) Chicago, IL' (id 07504254-9004-4983-b149-4f783a1c32b8)
-- Same official_url and organization as two rows already staged (batch1's 'Earn college
-- credit...', batch2's 'Early College Program (ECP) Courses...') -- almost certainly a
-- third duplicate of the same underlying program, flagged not resolved-away. Confirmed
-- at saic.edu/high-school-programs, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = '07504254-9004-4983-b149-4f783a1c32b8';

-- 'SPINWIP' (id dc08474d-8363-4125-b94e-33460354903e)
-- Confirmed at physics.stanford.edu/about/inclusion/spinwip, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Stanford University (Physics Department)' WHERE id = 'dc08474d-8363-4125-b94e-33460354903e';

-- 'Summer at Stanford Program for High School 2025' (id ccd1cf71-219d-4ee2-b6c3-47903972f7cf)
-- Confirmed at summer.stanford.edu/students/high-school, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Stanford University (Summer Session)' WHERE id = 'ccd1cf71-219d-4ee2-b6c3-47903972f7cf';

-- 'Summer Discovery' (id 868d4a6f-855d-48c9-b55d-3dd831178135)
-- Confirmed at summerdiscovery.com, opened 2026-09-02, live, self-titled independent
-- for-profit pre-college program operator (runs programs on multiple campuses; not
-- affiliated with any single university).
UPDATE opportunities SET organization = 'Summer Discovery' WHERE id = '868d4a6f-855d-48c9-b55d-3dd831178135';

-- 'TechGirls (w Virginia Tech University) 2026' (id 58d2e707-2c9b-45a2-860a-02acaa1f3c53)
-- Confirmed at techgirlsglobal.org, opened 2026-09-02: 'TechGirls is an initiative of
-- the U.S. Department of State's Bureau of Educational and Cultural Affairs.' Virginia
-- Tech (named in the row's own title) is presumably an implementing partner for a
-- specific cohort/component, not contradicted by this -- but the primary, sourced owner
-- is the State Department, not a university.
UPDATE opportunities SET organization = 'U.S. Department of State (Bureau of Educational and Cultural Affairs) — TechGirls' WHERE id = '58d2e707-2c9b-45a2-860a-02acaa1f3c53';

-- 'The Pioneer Academics Research Program' (id c581e99a-c65f-4de2-bece-bbb34819c9a4)
-- Stored URL is a secondary blog post on the same domain, not the main site -- milder
-- version of the official_url-imprecision pattern, still same domain unlike class-3
-- cases. Confirmed at pioneeracademics.com (homepage), opened 2026-09-02, live,
-- self-titled.
UPDATE opportunities SET organization = 'Pioneer Academics' WHERE id = 'c581e99a-c65f-4de2-bece-bbb34819c9a4';

-- 'Two-week UM Academies (non-credit)' (id 889c580c-dbb6-4490-9078-9faf2a2a2ed0)
-- Same official_url as 'University of Miami' below -- same program, two rows. Confirmed
-- at precollege.dcie.miami.edu, opened 2026-09-02, live: DCIE = Division of Continuing
-- and International Education.
UPDATE opportunities SET organization = 'University of Miami (Division of Continuing and International Education)' WHERE id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0';

-- 'UChicago College Pathway Program in Economics (Immersion)' (id 89117ca8-52f4-41fb-8674-dd23998e7281)
-- Confirmed at summer.uchicago.edu/courses/pathways-in-economics, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'University of Chicago (UChicago Summer Session)' WHERE id = '89117ca8-52f4-41fb-8674-dd23998e7281';

-- 'Universidad de Navarra - University of Navarra' (id fd105724-26cf-448f-a595-15b3db2d7f8d)
-- Stored URL (a specific faculty page, Filosofía y Letras) redirected to the homepage on
-- open, opened 2026-09-02 -- institution confirmed, specific faculty not re-verified.
UPDATE opportunities SET organization = 'Universidad de Navarra' WHERE id = 'fd105724-26cf-448f-a595-15b3db2d7f8d';

-- 'University of Edinburgh International Summer School' (id 30436a92-26fd-4972-a8b3-dce8ad454943)
-- Confirmed at col.ed.ac.uk/our-programmes, opened 2026-09-02, live: Centre for Open
-- Learning.
UPDATE opportunities SET organization = 'University of Edinburgh (Centre for Open Learning)' WHERE id = '30436a92-26fd-4972-a8b3-dce8ad454943';

-- 'University of Miami' (id 1228cff1-265d-4cc2-aa49-95b1f3408250)
-- Same official_url and same organization as 'Two-week UM Academies' above -- likely
-- duplicate pair, flagged not resolved-away. Confirmed at precollege.dcie.miami.edu,
-- opened 2026-09-02, live.
UPDATE opportunities SET organization = 'University of Miami (Division of Continuing and International Education)' WHERE id = '1228cff1-265d-4cc2-aa49-95b1f3408250';

-- 'University of Pennsylvania (PA, USA)' (id 0009f66d-9231-4dbd-938f-9eb1c9319309)
-- Confirmed at esap.engineering.upenn.edu/courses, opened 2026-09-02, live: ESAP
-- (Engineering Summer Academy at Penn).
UPDATE opportunities SET organization = 'University of Pennsylvania (Engineering Summer Academy at Penn)' WHERE id = '0009f66d-9231-4dbd-938f-9eb1c9319309';

-- 'University of Toronto (Toronto, CANADA) - 2025' (id 018f5962-6e43-4941-af90-ead024ebf8f3)
-- Confirmed at future.utoronto.ca/high-school-enrichment-programs, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'University of Toronto' WHERE id = '018f5962-6e43-4941-af90-ead024ebf8f3';

-- 'USC Summer Programs 2025 Info Sessions' (id 7dabbd20-f678-49a3-9cae-5d6e0eb5fbde)
-- Stored URL 404s. Parent domain (precollege.usc.edu) confirms USC Pre-College -- same
-- org as batch 2's 'Dive Into Engineering!' row. Opened 2026-09-02.
UPDATE opportunities SET organization = 'University of Southern California (USC Pre-College Programs)' WHERE id = '7dabbd20-f678-49a3-9cae-5d6e0eb5fbde';

-- 'Uygulamalı Moleküler Biyoloji ve Genetik Kampı' (id dc4343ec-4856-483f-a3b0-7e0de9e38a09)
-- Same URL pattern (acibadem.edu.tr/merkezler/asegem) as two rows already staged in
-- prior batches for the same center. Not re-opened this batch (high-confidence repeat
-- of an already-verified domain), flagged here rather than silently assumed.
UPDATE opportunities SET organization = 'Acıbadem Üniversitesi Sürekli Eğitim Merkezi (ASEGEM)' WHERE id = 'dc4343ec-4856-483f-a3b0-7e0de9e38a09';

-- 'Venture & Tech Summer Program 2026' (id d1c24acc-a289-459f-a476-110a731e2eb8)
-- Confirmed at vtsp.com, opened 2026-09-02, live, self-titled. NOTE: this exact title
-- ('Venture & Tech Summer Program (VTSP)') is named in
-- docs/opportunity-data-decision-2026-09-02.md's list of 11 likely-duplicate new
-- candidates -- flagged for whoever applies either artifact, not resolved here.
UPDATE opportunities SET organization = 'Venture & Tech Summer Program (VTSP)' WHERE id = 'd1c24acc-a289-459f-a476-110a731e2eb8';

-- NOT STAGED — 'Summer Programs in the Netherlands - 2025' (id b10444c7-6c36-463c-b240-3b48025a74b6)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Stored URL (summerschoolsineurope.eu) is a
-- third-party aggregator/directory site, opened 2026-09-02 -- not any single program's
-- own page, and the title names no specific program either.

-- NOT STAGED — 'The Hong Kong Polytechnic University (PolyU)' (id 255377bc-7564-452d-96e5-b25fb6902aa0)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. Bare institution title; stored URL is PolyU's
-- general postgraduate admissions page, opened 2026-09-02 -- not a specific youth
-- program.

-- NOT STAGED — 'Trinity College London, Ireland' (id f8fc69c2-e48f-48d1-9a5f-6323a7c10e34)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE, and a title accuracy problem worth flagging on
-- its own: stored URL (tcd.ie) is Trinity College Dublin, opened 2026-09-02 -- a real
-- but DIFFERENT institution from 'Trinity College London' (also real, in England). The
-- title conflates the two. Bare-homepage URL either way, no specific program identifiable.

-- NOT STAGED — 'University of Exeter, United Kingdom' (id 9b013735-8ae8-4175-8861-6022b3aaf9ce)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. DEFECT CLASS 3: stored URL
-- (experts.exeter.ac.uk/.../fatima-naveed) is an individual researcher's staff-profile
-- page, opened 2026-09-02 -- not a program page.

-- NOT STAGED — 'University of St. Andrews (Scotland, UK)' (id e0960bef-227f-4360-ad8f-d910e5e8dc2b)
-- UNRESOLVABLE-WITHOUT-ORIGINAL-SOURCE. DEFECT CLASS 3, same shape as Exeter above:
-- stored URL (research-portal.st-andrews.ac.uk/en/persons/...) is a researcher-profile
-- system, opened 2026-09-02 -- not a program page. Two UK universities now, both using
-- a 'research-portal/persons' URL shape for this same defect -- worth knowing if this
-- gets automated later.

-- SKIPPED, NOT RESEARCHED — 'University of Maastricht, Netherlands' (id 14db7109-25fd-4cd9-bb70-73797588bec8)
-- Per oryn-a7: this is one of oryn-d0's 5 confirmed official_url-provenance defects
-- (all from the same 2026-08-18 import as this task's null-organization rows), already
-- queued for a founder call. Not re-researched or re-sourced here, per instruction —
-- recorded and left for that existing queue rather than duplicated.
