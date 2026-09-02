-- Staged, NOT applied. Batch 4 (final) of the 79-row backlog — 23 rows, all resolved.
-- Same rule: every organization value from that program's own official page, opened
-- directly this session. Five rows below carry an explicit confidence caveat (page
-- blocked, Cloudflare-gated, or the domain confirmed but not independently opened) —
-- read those comments before treating this batch as uniformly full-confidence.
-- See docs/opportunity-org-research-batch4-final-2026-09-02.md for the final summary
-- across all four batches.

-- 'Wharton Sports Analytics and Business Initiative' (id c35f002c-a4b2-4965-b07f-ba775eb0e31e)
-- Confirmed at wsb.wharton.upenn.edu/wharton-data-competition, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'University of Pennsylvania (Wharton Sports Analytics and Business Initiative)' WHERE id = 'c35f002c-a4b2-4965-b07f-ba775eb0e31e';

-- 'Woodstock School: Mussoorie, India' (id dfd08c03-75c6-4bc2-b087-70c58c64db2a)
-- Confirmed at woodstockschool.in/summer, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'Woodstock School' WHERE id = 'dfd08c03-75c6-4bc2-b087-70c58c64db2a';

-- 'Bennington College Young Writers' (id 793f6cf1-5af8-413a-b15f-89e5f1f9e44f)
-- Stored deep-link denied on navigate; confirmed at bennington.edu (homepage), opened
-- 2026-09-02, live.
UPDATE opportunities SET organization = 'Bennington College' WHERE id = '793f6cf1-5af8-413a-b15f-89e5f1f9e44f';

-- 'Future Innovators Scholarship Competition' (id 21368fde-a4f9-49f8-af64-7326b6c60e60)
-- Stored URL 404s. Parent domain (immerse.education) confirms 'Immerse Education',
-- opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Immerse Education' WHERE id = '21368fde-a4f9-49f8-af64-7326b6c60e60';

-- 'Harvard Alumni for Global Women's Empowerment Essay Contest' (id 75952d25-c434-491d-becb-c3e78bda5e12)
-- CORRECTION, not confirmation: confirmed at globalwe-essays.org, opened 2026-09-02 —
-- self-identifies exactly as 'Harvard Alumni for Global Women's Empowerment,' an alumni
-- nonprofit, NOT Harvard University itself. Same title-implies-wrong-parent risk as
-- RSI/MIT and Harvard CURE/DF-HCC (batches 1-2) -- third independent instance.
UPDATE opportunities SET organization = 'Harvard Alumni for Global Women''s Empowerment' WHERE id = '75952d25-c434-491d-becb-c3e78bda5e12';

-- 'International Academic Marathon' (id d4450b97-5d23-4ab1-acf7-8f3908117fd6)
-- Confirmed at academic-marathon.org, opened 2026-09-02, live, self-titled -- page
-- itself notes a real 2026-27 structural change (moving to a school-led format).
UPDATE opportunities SET organization = 'International Academic Marathon' WHERE id = 'd4450b97-5d23-4ab1-acf7-8f3908117fd6';

-- 'International Greenwich Olympiad' (id 1ba4bf99-d36e-45d8-8dda-510587e52b05)
-- Confirmed at igolondon.co.uk, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'International Greenwich Olympiad' WHERE id = '1ba4bf99-d36e-45d8-8dda-510587e52b05';

-- 'Major League Hacking' (id c8cd2706-7afd-45d9-83cd-f88cc514527d)
-- Confirmed at mlh.com, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'Major League Hacking (MLH)' WHERE id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d';

-- 'Microsoft Imagine Cup Junior' (id a14a5d3f-089f-4bd8-b9ad-be6cd193915d)
-- Confirmed at imaginecup.microsoft.com/en-us, opened 2026-09-02: Microsoft is
-- unambiguous, but the page now brands itself a general 'Startups Competition' with no
-- 'Junior' track found on the page (checked directly). The specific 'Junior' variant
-- named in this row's title may no longer be current -- flagged, not resolved as dead,
-- since Microsoft/Imagine Cup itself is clearly live.
UPDATE opportunities SET organization = 'Microsoft (Imagine Cup)' WHERE id = 'a14a5d3f-089f-4bd8-b9ad-be6cd193915d';

-- 'New York Times Audio Stories Podcast Contest' (id 031502eb-7a60-43cd-a8c1-8d1c44cac6da)
-- CONFIDENCE CAVEAT: nytimes.com is blocked by this session's browsing policy and could
-- not be opened directly, the one exception to this task's own 'open the page' rule
-- across all four batches. Organization is about as close to common-knowledge-certain as
-- exists (the domain itself is nytimes.com, 'Learning Network' is their long-established,
-- widely-documented student-content vertical) but flagged as not independently opened,
-- unlike every other row in this file.
UPDATE opportunities SET organization = 'The New York Times (The Learning Network)' WHERE id = '031502eb-7a60-43cd-a8c1-8d1c44cac6da';

-- 'New York Times Student Editorial & Essay Contests' (id d24e59bd-43b7-4e7e-83ab-aadb02e2a971)
-- Same confidence caveat as the row above -- nytimes.com blocked, not independently opened.
UPDATE opportunities SET organization = 'The New York Times (The Learning Network)' WHERE id = 'd24e59bd-43b7-4e7e-83ab-aadb02e2a971';

-- 'Stockholm Water Prize' (id c8eb3d40-f8b8-461a-bd84-7afaf206ead4)
-- Confirmed at stockholmwaterfoundation.org, opened 2026-09-02, live.
UPDATE opportunities SET organization = 'Stockholm Water Foundation (SWF)' WHERE id = 'c8eb3d40-f8b8-461a-bd84-7afaf206ead4';

-- 'The Institute of Competition Sciences (ICS)' (id f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9)
-- Confirmed at competitionsciences.org, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'Institute of Competition Sciences (ICS)' WHERE id = 'f493d81f-1f4f-43dd-b0d7-ab6d72eef1d9';

-- 'UniHive Research Proposal Competition' (id 55dd21cd-859e-498a-a69d-56f45d777d8e)
-- CORRECTION: confirmed at unihive.education, opened 2026-09-02 -- self-titled 'UniHive
-- Education,' described as 'Cambridge Professor-led Programmes.' That phrase names the
-- instructors' affiliation, not the organizer -- writing 'University of Cambridge' would
-- have been the wrong-organization failure mode this task warns against.
UPDATE opportunities SET organization = 'UniHive Education' WHERE id = '55dd21cd-859e-498a-a69d-56f45d777d8e';

-- 'Bogazici University BOUN 101 Online Kış Okulu' (id 4d866643-6a6d-481a-add3-e29b6a163592)
-- CONFIDENCE CAVEAT: stored URL (buyem.boun.edu.tr) was denied on navigate this session
-- and not independently opened. 'boun.edu.tr' is Boğaziçi University's well-established
-- alternate short domain (BOUN = the university's own common acronym), and this exact
-- organization was independently confirmed twice already this task (batch 1's Lise BOUN
-- 101, batch 2's Kış Bilim Kampı) via the sibling bogazici.edu.tr domain -- high
-- confidence by consistency, not by opening this specific page.
UPDATE opportunities SET organization = 'Boğaziçi Üniversitesi Yaşamboyu Eğitim Merkezi (BÜYEM)' WHERE id = '4d866643-6a6d-481a-add3-e29b6a163592';

-- 'Pre-College Program Virtual Fairs' (id 7998c901-73b8-4355-8e0d-b1f2cdaf9c16)
-- Confirmed at precollegeassociation.org, opened 2026-09-02, live: 'Association for
-- Pre-College Program Directors' -- a real trade association hosting the fairs named in
-- the row's title, distinct from the 'summerschoolsineurope.eu' aggregator case (batch 3)
-- that had no identifiable organizer at all. This one does.
UPDATE opportunities SET organization = 'Association for Pre-College Program Directors' WHERE id = '7998c901-73b8-4355-8e0d-b1f2cdaf9c16';

-- 'InvestIN Young Lawyer / Young Political Leader Summer Experience (London)' (id d99d1a5c-2b77-4bc1-af84-e429410eef68)
-- Confirmed at investin.org, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'InvestIN Education' WHERE id = 'd99d1a5c-2b77-4bc1-af84-e429410eef68';

-- 'Interlochen Review' (id 95093e1a-fc13-4d9a-b4ed-5f0584252b44)
-- Confirmed at interlochenreview.org/submit, opened 2026-09-02: 'an online literary
-- journal produced by the creative writing students of Interlochen Arts Academy.'
-- Currently between submission windows (reopens Jan 2027) -- normal seasonal state, not
-- dead.
UPDATE opportunities SET organization = 'Interlochen Arts Academy' WHERE id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- 'Georgetown Pre-College Online Program (Medicine / Journalism & Media)' (id 948b2e5f-1ec8-4838-9a0a-01c928b02a8c)
-- CONFIDENCE CAVEAT, moderate: confirmed at georgetown.precollegeprograms.org/medicine,
-- opened 2026-09-02, live and clearly Georgetown-branded -- but the domain
-- ('precollegeprograms.org' hosting a 'georgetown.' subdomain) resembles the same
-- third-party-platform shape as Duke's now-EngageU-run Pre-College (see
-- docs/opportunity-org-research-sample15-2026-09-02.md's Duke TIP finding). No explicit
-- third-party disclaimer found on this page, unlike Duke's -- resolved as Georgetown, but
-- worth a second look if this pattern matters for how the organization field is used.
UPDATE opportunities SET organization = 'Georgetown University' WHERE id = '948b2e5f-1ec8-4838-9a0a-01c928b02a8c';

-- 'STEM Fellowship Journal' (id b51bf24f-42c2-419f-a456-ca86dff0ad8e)
-- CONFIDENCE CAVEAT: journal.stemfellowship.org showed a Cloudflare challenge page that
-- did not clear after a retry this session -- page content not independently read.
-- Organization inferred from the domain itself ('stemfellowship.org'), which is a
-- well-established real nonprofit, not from page content.
UPDATE opportunities SET organization = 'STEM Fellowship' WHERE id = 'b51bf24f-42c2-419f-a456-ca86dff0ad8e';

-- 'Columbia Junior Science Journal (CJSJ)' (id e0e1584c-5d96-41d6-a3a0-a62eaffa37d6)
-- DEFECT (dead URL, new domain): stored URL (cjsjournal.org) was denied on navigate both
-- with and without https this session. Real, current site found via search and opened
-- directly: columbiajuniorsciencejournal.org, 2026-09-02, live, actively publishing
-- (volume 11 in the 2025-2026 cycle). Page states plainly: 'SUPPORTED BY THE COLUMBIA
-- UNDERGRADUATE SCIENCE JOURNAL (CUSJ)' -- not Columbia University directly.
UPDATE opportunities SET organization = 'Columbia Undergraduate Science Journal (CUSJ)' WHERE id = 'e0e1584c-5d96-41d6-a3a0-a62eaffa37d6';

-- 'Young Guru Academy (YGA)' (id 5d2aca22-26d5-4592-a5fb-a554c7a51f50)
-- Confirmed at yga.org.tr/en, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'Young Guru Academy (YGA)' WHERE id = '5d2aca22-26d5-4592-a5fb-a554c7a51f50';

-- 'International Environmental Olympiad (IEnvO)' (id 2b0f2e8a-7bbc-48d5-b492-647972c42190)
-- Confirmed at env-olympiad.com/current-ienvo.html, opened 2026-09-02, live, self-titled.
UPDATE opportunities SET organization = 'International Environmental Olympiad (IEnvO)' WHERE id = '2b0f2e8a-7bbc-48d5-b492-647972c42190';
