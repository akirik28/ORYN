-- Staged, NOT applied. First sample (15 of ~79) of the "unbackfillable-but-legitimate"
-- null-organization rows named in docs/null-organization-dedup-defect-2026-09-02.md.
-- Every organization value below came from that program's own official page, opened
-- directly this session (2026-09-02) -- not inferred from the row's title, not from a
-- WebFetch summary. Source URL + access date on every line, per this task's rule.
-- See docs/opportunity-org-research-sample15-2026-09-02.md for the hit-rate report,
-- the two non-UPDATE outcomes (one dead/renamed program, one too-vague-to-resolve row),
-- and two data-quality corrections found along the way (a wrong official_url, and an
-- org that isn't the host institution the title implies).
-- Run manually only after a human review pass, same gate as the 109-row backfill.

-- 'Boğaziçi Üniversitesi Lise BOUN 101' (id 3900e10b-dc11-4d4d-ba69-7f9a630cf602)
-- Stored official_url (buyem.bogazici.edu.tr/course/boun101-lise-yaz-okulu) 404s as of
-- 2026-09-02. Organization confirmed from the live parent site, buyem.bogazici.edu.tr,
-- opened 2026-09-02 -- matches the phrasing already used elsewhere in this corpus for
-- the same center (see the 109-row backfill's own note on this exact translation).
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '3900e10b-dc11-4d4d-ba69-7f9a630cf602';

-- 'Earn college credit that may transfer to any college you attend' (id 7f8281b0-7fc5-4a06-a03c-7c3f37bbc972)
-- Title is marketing copy, not a program name -- the actual program is SAIC's Early
-- College Program Online Summer Institute (ECPOSI). Confirmed at
-- continuingstudies.saic.edu/ecposi/overview, opened 2026-09-02, live and current
-- (2026 session dates listed).
UPDATE opportunities SET organization = 'School of the Art Institute of Chicago (SAIC)' WHERE id = '7f8281b0-7fc5-4a06-a03c-7c3f37bbc972';

-- 'Girls Who Code' (id 674f46f0-b71c-4d3a-bbff-20cfa9dcfdee)
-- Self-titled nonprofit. Confirmed at girlswhocode.com, opened 2026-09-02, live and active.
UPDATE opportunities SET organization = 'Girls Who Code' WHERE id = '674f46f0-b71c-4d3a-bbff-20cfa9dcfdee';

-- 'Harvard University (MA, USA)' (id 66c76976-90e5-4637-8afe-6828992e838a)
-- Title is just the institution name; official_url resolves to a specific program.
-- Confirmed at summer.harvard.edu, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Harvard Summer School' WHERE id = '66c76976-90e5-4637-8afe-6828992e838a';

-- 'Koç University Research Program KUSRP' (id 9c0e300e-0ebd-4444-a479-01a297473856)
-- Stored URL redirects to Koç University's Vice Rectorate for Research and Innovation,
-- opened 2026-09-02, live. Cross-references the same organizer as row 'Research
-- Program KUSRP 2026' elsewhere in the null-org set (not in this sample, not verified
-- here, flagged only as a likely-same-program note for whoever reviews this batch).
UPDATE opportunities SET organization = 'Koç Üniversitesi' WHERE id = '9c0e300e-0ebd-4444-a479-01a297473856';

-- 'RSI (Research Science Institute) at MIT' (id b2246380-2d25-4712-8ee2-cf67cdd349ca)
-- CORRECTION, not a confirmation: the title implies MIT organizes this. It does not.
-- Confirmed at cee.org/research-science-institute, opened 2026-09-02: RSI is held at
-- MIT but run by the Center for Excellence in Education, a separate nonprofit. Writing
-- 'MIT' here would have been the wrong-organization failure mode this task's own rule
-- warns is worse than a null (dedups this row against the wrong entity).
UPDATE opportunities SET organization = 'Center for Excellence in Education (CEE)' WHERE id = 'b2246380-2d25-4712-8ee2-cf67cdd349ca';

-- 'Stanley Prep for Educational Excellence' (id c6b985f9-1a40-4e8a-a2fb-63408263e66e)
-- Confirmed at stanleyprep.com, opened 2026-09-02: the site's own primary nav labels
-- its about page 'Stanley Prep', matching the row's title. Live, current program
-- (United Nations Advanced Training, 2026 dates listed).
UPDATE opportunities SET organization = 'Stanley Prep' WHERE id = 'c6b985f9-1a40-4e8a-a2fb-63408263e66e';

-- 'Young Founders Lab (YFL)' (id 269c4d5e-bb27-4897-bfb8-9779fef57ee6)
-- CORRECTION: the stored official_url (ladderinternships.com/...) is a third-party
-- review blog, not YFL's own page -- exactly the inference risk this task's rule warns
-- against, so it was not used as the source. Real official site found via search and
-- opened directly: youngfounderslab.org, 2026-09-02, live, self-titled, no parent org.
-- The official_url column should probably also be corrected to youngfounderslab.org,
-- flagged here since it's outside this task's organization-only scope.
UPDATE opportunities SET organization = 'Young Founders Lab' WHERE id = '269c4d5e-bb27-4897-bfb8-9779fef57ee6';

-- 'FRC (FIRST® Robotics Competition)' (id dfb94075-d86e-4cba-ace2-a25953e2989b)
-- Confirmed at frcturkiye.org, opened 2026-09-02, live, current season (BIOCORE, Jan 2027).
UPDATE opportunities SET organization = 'FIRST Robotics Competition Türkiye (FRC Türkiye)' WHERE id = 'dfb94075-d86e-4cba-ace2-a25953e2989b';

-- 'International Genetically Engineered Machine Competition (iGEM)' (id 931e7fc2-ee58-4904-958e-f2655c1b5c9d)
-- Confirmed at competition.igem.org, opened 2026-09-02, live, current season (2026, 440+ teams).
UPDATE opportunities SET organization = 'iGEM Foundation' WHERE id = '931e7fc2-ee58-4904-958e-f2655c1b5c9d';

-- 'Singularity AI Essay Contest' (id c996443d-7360-4197-850a-339ef959d585)
-- Confirmed at veritasai.com/singularity-ai-essay-contest, opened 2026-09-02: 'Veritas
-- AI works with high school students...' self-identifies as the organizer. Spring 2026
-- submission window is closed but the page invites sign-up for future rounds -- current
-- program, not dead, just between cycles.
UPDATE opportunities SET organization = 'Veritas AI' WHERE id = 'c996443d-7360-4197-850a-339ef959d585';

-- 'CTY (Center for Talented Youth) Online Programs Courses' (id a18a12db-6e7d-4d1f-9243-de94ae621ed8)
-- Confirmed at cty.jhu.edu/programs/online/courses, opened 2026-09-02, live.
-- NOTE for whoever applies this: docs/opportunity-data-decision-2026-09-02.md's own
-- list of 4 ambiguous likely-duplicate candidates names a 'Johns Hopkins Center for
-- Talented Youth (CTY) — Online Programs' title from the separate new-candidates batch.
-- This row is very likely the same program under a slightly different title -- worth a
-- direct compare before both are live, not decided here since it's outside this task's
-- organization-only scope.
UPDATE opportunities SET organization = 'Johns Hopkins Center for Talented Youth (CTY)' WHERE id = 'a18a12db-6e7d-4d1f-9243-de94ae621ed8';

-- 'Journal of Emerging Investigators (JEI)' (id 35f7475c-2567-4dde-ab61-c427059ff180)
-- Confirmed at emerginginvestigators.org/story, opened 2026-09-02: 'JEI is a non-profit
-- organization run and operated by graduate students, postdoctoral fellows, and
-- professors...' Self-titled, live.
UPDATE opportunities SET organization = 'Journal of Emerging Investigators (JEI)' WHERE id = '35f7475c-2567-4dde-ab61-c427059ff180';

-- NOT STAGED — 'Duke University Talent Identification Program 2024' (id 0ad4ccae-77db-450f-9768-064086e2fdd2)
-- DEAD / RENAMED, not resolved. Stored URL (tip.duke.edu/resources/opportunity-guide)
-- redirects to provost.duke.edu's 'Duke Pre-College Programs' -- a different, successor
-- program. That page's own text: 'for summer 2026 programming, all aspects of Duke
-- University Pre-College are managed by EngageU, a third-party organization.' 'Duke
-- Talent Identification Program' as a distinct entity does not appear to exist under
-- that name any more. Writing 'Duke University' here would misrepresent a defunct
-- program as a live one under an organization that no longer runs it directly. This
-- row is a disable/re-title candidate, not an organization backfill -- same category
-- the prior task used for the 9 bad-source rows, arrived at independently here.

-- NOT STAGED — 'Purdue University' (id 16d56c3b-376b-4cf6-b8b1-12daaecf0068)
-- UNRESOLVABLE, not dead. official_url is purdue.edu's bare homepage; the title is just
-- the institution name. Opened 2026-09-02: nothing on the page or in the row identifies
-- which specific Purdue program this record was meant to represent. 'Purdue University'
-- is technically true but useless for dedup -- it would not distinguish this row from
-- any other real Purdue program that might already exist or get added later. Needs the
-- original researcher's source (whatever page led to this row's creation) to resolve,
-- not further searching from this URL alone.
