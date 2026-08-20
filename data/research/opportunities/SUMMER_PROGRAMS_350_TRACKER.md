# Summer programs — 350-target research campaign

Founder request (2026-08-18, Turkish): research all summer schools for Oryn in real
depth — what each program actually teaches, not just that it exists — starting with 350
quality-verified `summer_program` candidates written into `opportunities`. This file is
the durable roadmap so the campaign survives across turns/sessions, per this repo's
established parallel-session continuity pattern (`docs/handoffs/`).

**Rule for every wave (non-negotiable, per AGENTS.md Rule 4/5 and this repo's existing
opportunities discipline):** a program is only added if a researcher actually fetched and
read its own official page. No fabricated programs, no guessed facts, no invented
deadlines/costs. A candidate that can't be verified is dropped, not forced in. Quality
and honesty over hitting the number.

## Progress

| Wave | Candidates sent | Accepted | Duplicate | Rejected/skipped | Status |
|------|-----------------|----------|-----------|-------------------|--------|
| 0 (pre-existing `batch1_2026-08-17.jsonl`) | 7 | 6 | 1 (M&TSI) | 0 | Applied — commit `9cefbee` |
| 1, groups A+E | 16 | 10 | 0 | 6 (E: BETA Camp, Notre Dame Business Scholars, Wharton Foundations in Business, JSA, TASP, Georgetown Law/Advocacy — all ruled out as non-existent-under-that-name/discontinued/renamed/duplicate) | Applied — commit `b6167a4` |
| 1, groups C/D/F | 20 | 11 | 9 | 0 | Applied 2026-08-20 (see note below) |
| 1, group B | 8 | 3 | 2 | 3 (MMSS: Cloudflare-blocked, page never fetched; COSMOS: confirmed not hosted at Berkeley; UCSD Academic Connections: confirmed discontinued for 2026) | Applied 2026-08-20 |
| 1, group G | 8 | 7 | 0 | 1 (UCL Junior Summer School: no such program exists under that name — UCL's own "UCL Summer School" is undergrad-only; similarly-named third-party operators merely rent UCL's campus) | Applied 2026-08-20 |
| 1, group H | 8 | 5 new + 1 refreshed | 1 (H06 Boğaziçi BOUN101 — already covered by 2 existing rows) | 1 (Central European University Summer School — no record returned by the researcher; presumed dropped as unverifiable, per this campaign's no-forced-candidates rule) | Applied 2026-08-20 |

**Note on group H (applied 2026-08-20):** H01 (Copenhagen Business School Summer
University), H03 (AI Summer Week @ ETH Zurich), H05 (Bilkent University Summer Camp),
H07 (ODTÜ/METU Engineering Summer School), and H08 (UWC Short Courses) inserted as
net-new. H04 (Koç University Summer Academy) was NOT inserted as a new row — the live
dedup check found an existing record ("Koç Uni Yaz Okulu", stale 2023-dated
`highschoolprograms.ku.edu.tr` URL, no organization/cost/dates, `verification_state`
unverified) that is clearly the same real-world Koç HS summer program under an older
URL/branding, so per the freshness-over-duplication principle it was UPDATED in place
with the fully verified 2026 data instead of creating a duplicate; a matching
`opportunity_sources` provenance row was added. The separate "Koç University Research
Program KUSRP" row was left untouched — confirmed to be a genuinely different program
(a research program, not the Summer Academy). H06 (Boğaziçi BOUN101 High School Summer
School) was skipped entirely: two existing rows already cover it exactly
(`buyem.bogazici.edu.tr/` and `buyem.bogazici.edu.tr/course/boun101-lise-yaz-okulu`,
the latter with a fuller 2025 course list than H06's own research could re-confirm,
since the specific course page had been taken offline by the time of this research) —
inserting would have added zero information and created a 3-way duplicate. Live count
after group H: 335 total, 232 `summer_program`.

**Note on group G (applied 2026-08-20):** checking the 7 new records against the live
table also surfaced and removed 3 pre-existing junk rows (0 references in
`opportunity_matches`/`saved_opportunities` confirmed before deleting): "IE University
Business School: Madrid, Spain" and "Immerse Education Residential and Online
Programmes 2025-2026" both had `official_url` = the bare organization homepage with a
raw marketing-email scrape as the description (UTM tracking params, an "Exclusively
for UAA Students" discount code); "Immerse Education" had a title/URL mismatch —
`official_url` pointed at the essay-competition page already captured separately,
while its description was actually a directory listing of 4 other sub-programme URLs.
Live count after group G + cleanup: 329 total, 227 `summer_program`.

**Note on groups C/D/F (applied 2026-08-20):** all 7 of group C (Cornell, Duke, Johns
Hopkins CTY, Northwestern CTD, Stanford Pre-Collegiate, Penn, Emory) turned out to be
duplicates already present from the 2026-08-18 founder-directed bulk Drive-corpus import
(69→290) — re-fetching live `opportunities` immediately before dedup (per this repo's
established parallel-session practice) caught this before any duplicate insert. D02 (USC)
and D03 (UChicago) also matched existing rows under different titles. Net: 11 new rows
(NYU Precollege, Harvard SSP, MIT BWSI, Georgia Tech PEAKS, Caltech SRC, NYLF Medicine,
Interlochen, RISD, Parsons, Tisch, Iowa Young Writers' Studio).

Live `opportunities` count after groups A+E+C+D+F: 301 total, 217 `summer_program`.
(217 reflects both this campaign's own adds and the separate 2026-08-18 bulk import,
which added far more summer programs than this campaign has run so far — not a claim
that 217 came from this tracker's own waves alone.)

**Note on group B (applied 2026-08-20):** AwesomeMath and BU RISE turned out to be
duplicates of the same 2026-08-18 bulk import (matched by official_url) — caught by the
standard live-refetch-before-dedup practice. 3 net-new: Rutgers Young Scholars Program in
Discrete Mathematics, Carnegie Mellon SAMS, Secondary Student Training Program (SSTP,
University of Iowa). Live count after group B: 304 total, 220 `summer_program`.

**Operational note (2026-08-18/19):** the account's rolling session usage limit was hit
twice while running 8 parallel research agents at once (each burn appears to exhaust a
full ~5h window). Groups A and E finished and wrote their files within the first ~12
minutes of the second dispatch; groups B/C/D/F/G/H were still mid-research when the
window ran out both times. Rather than restarting those 6 from scratch, they were
resumed via SendMessage (which continues an agent from its own transcript/context) once
the window reset, with instructions to finalize efficiently rather than keep
open-ended-researching. If a future session hits this again: check wall-clock time
against the reported reset time first (it may have already passed), prefer resuming
over-budget agents to restarting them, and consider fewer than 8 parallel agents per
wave if it recurs.

## Already live or already researched — do NOT re-target

Yale Young Global Scholars, PROMYS, SUMaC, RSI, Boston University Summer Term (HS
Programs), Georgetown University Summer (general HS programs), İTÜ Lise Yaz Okulu, KU
Leuven Summer of Science, MathILy-Er, Columbia NYC Commuter Summer, Columbia Pre-College
Online Summer, Stanford SASI, Stanford ULO, Tufts Pre-College, Wharton M&TSI, Oxbridge
Academic Programs, Sabancı University Summer School, Notre Dame Pre-College Summer
Scholars, Özyeğin University Summer Research Program, Summer Science Program (SSP),
Wharton LBW, Ross Mathematics Program, Pioneer Research Institute, Wharton Investment
Competition, World Scholar's Cup, Cornell Precollege Studies Summer Residential Program,
Duke Pre-College Program, Johns Hopkins CTY Summer Residential Program, Northwestern CTD
3-Week Academic Summer Camps, Stanford Pre-Collegiate Summer Institutes, Penn Pre-College
Program, Emory Pre-College Program, NYU Precollege Program, USC Summer Programs
(Pre-College), UChicago Pre-College Summer Session, Harvard Secondary School Program
(SSP), MIT Beaver Works Summer Institute (BWSI), Georgia Tech Summer PEAKS, Caltech
Summer Research Connection (SRC), NYLF Medicine & Health Care, Interlochen Arts Camp,
RISD Pre-College, Parsons Summer Intensive Studies, Tisch Summer High School, Iowa Young
Writers' Studio.

## Wave 1 — dispatched 2026-08-18 (8 parallel research agents, 8 programs each)

**Group A — US STEM elite residential:** Hampshire College Summer Studies in Mathematics
(HCSSiM), MIT PRIMES, MITES, Simons Summer Research Program (Stony Brook), Garcia Summer
Scholars (Stony Brook), Clark Scholars Program (Texas Tech), The Jackson Laboratory
Summer Student Program, Canada/USA Mathcamp.

**Group B — US STEM university pre-college #2:** AwesomeMath Summer Program, Rutgers
Young Scholars Program in Discrete Mathematics, Carnegie Mellon SAMS, Michigan Math and
Science Scholars (MMSS), Secondary Student Training Program (SSTP, U Iowa), BU RISE
(Research in Science & Engineering), UC Berkeley COSMOS, UC San Diego Academic
Connections.

**Group C — US elite pre-college general #1:** Cornell Summer College, Duke Youth
Programs / Duke TIP Summer Studies, Johns Hopkins Center for Talented Youth (CTY) Summer
Programs, Northwestern Center for Talent Development (CTD) Summer Program, Stanford
Pre-Collegiate Summer Institutes, Penn Summer Pre-College Program, Rice Emerging Scholars
Program, Emory Pre-College Program.

**Group D — US elite pre-college general #2:** NYU Precollege Program, USC Summer
Programs (Pre-College), University of Chicago Summer Session, Harvard Secondary School
Program, MIT Beaver Works Summer Institute (BWSI), Ohio State Young Scholars Program,
Georgia Tech Summer Programs, Caltech Summer Research Connection.

**Group E — US business/law/policy:** BETA Camp, National Student Leadership Conference
(NSLC), Notre Dame Summer Business Scholars, NYU Stern Pre-College Summer Business
Institute, Wharton Global Youth "Foundations in Business", Junior Statesmen Summer School
(JSA), Telluride Association Summer Program (TASP), Georgetown Summer Law & Advocacy
track.

**Group F — US medicine/arts/writing:** Stanford Medyouth, National Youth Leadership
Forum: Medicine (NYLF Medicine), Interlochen Arts Camp, RISD Pre-College Program, Parsons
Summer Intensive Studies, NYU Tisch Summer High School Programs, Kenyon Review Young
Writers Workshop, Iowa Young Writers' Studio.

**Group G — UK/Europe #1:** Immerse Education, Oxford Scholastica Academy, LSE Summer
School, UCL Junior Summer School, Sutton Trust Summer Schools, Sciences Po Summer School,
Bocconi Summer School, IE University Summer Program.

**Group H — Europe/Turkey/international:** Copenhagen Business School Summer University,
Central European University Summer School, ETH Zurich Summer Programs, Koç University
Summer School, Bilkent University Summer School, Boğaziçi University Summer School, ODTÜ
(METU) Summer School, UWC Short Courses.

## Wave 2 — dispatched 2026-08-20 (background agent, 16 candidates, groups I+J)

| Wave | Candidates sent | Accepted | Duplicate | Rejected/skipped | Status |
|------|-----------------|----------|-----------|-------------------|--------|
| 2, groups I+J | 16 | 6 | 1 (WPI Frontiers — exact `official_url` match to an existing row from the 2026-08-18 bulk import) | 9 (see note) | Applied 2026-08-20 |

**Note on Wave 2 groups I+J:** accepted Worldwide Youth in Science and Engineering (WYSE,
UIUC Grainger), Case Western Reserve University Online Pre-College Program, Wharton
Global Youth "Future of the Business World" (FBW), Penn Medicine Summer Program for High
School Students, Idyllwild Arts Summer Program, Boston University Tanglewood Institute
(BUTI). Dropped for cause: Purdue Summer Engineering Workshop (current URLs all redirect
to a generic landing page, no live official page to read), University of Rochester Xerox
Engineering Research Program (confirmed undergraduate-only, wrong audience), Columbia
Science Honors Program (confirmed a school-year Saturday program, not summer), University
of Washington Discovery Program (no program under this name found at UW), University of
Wisconsin-Madison PEOPLE program (official page marked "RETIRED"), Stanford SPCS
entrepreneurship track (a course within the already-live Stanford Pre-Collegiate Summer
Institutes record, not distinct), Duke TIP health track (Duke TIP was discontinued
2020/2021, already noted on the existing Duke record), Georgetown Summer Medical
Institute (stale page, last showing 2019 data; the current "Medical Academy" track is
already covered by the existing Georgetown Summer record), Icahn School of Medicine at
Mount Sinai HS summer research (both SPARKED and SPICE pages blocked/unreadable —
HTTP 403 and JS-rendered respectively). Live count after Wave 2: 340 total, 235
`summer_program`.

## Wave 3 — dispatched 2026-08-21 (background agent, 28 candidates, UK/Europe more + US STEM more)

| Wave | Candidates sent | Accepted | Duplicate | Rejected/skipped | Status |
|------|-----------------|----------|-----------|-------------------|--------|
| 3, UK/EU + US more | 28 | 17 | 3 (Durham Global Futures, TECHCAMP @ Politecnico di Milano, Warwick Pre-University — all exact `official_url` matches to existing rows) | 8 (see note) | Applied 2026-08-21 |

**Note on Wave 3:** accepted University of St Andrews Summer Academic Experience,
King's College London Pre-University Summer School, University of Bath "Step into Bath",
Sorbonne Université Summer University, Freie Universität Berlin SommerUNI, Istanbul Bilgi
University High School Summer School, Terp Young Scholars (UMD), Aggie STEM Overnight
Camp (Texas A&M), CU Boulder Precollegiate Development Program, Colorado School of Mines
Engineering Design Summer Camp, Northwestern NHSI "The Cherubs", American Legion Boys
State, Vanderbilt PTY (Summer Institutes + Summer Academy), WashU College Prep Program,
Emerging Engineers @ UVA, ASU Barrett Summer Scholars, UT Austin Women in STEM (WiSTEM)
High School Camps. Dropped for cause: Imperial College Reach Out Lab (a year-round
outreach lab, not a distinct summer program), University of Edinburgh "Pathways" (no
standalone program exists; overlaps with the already-live Sutton Trust Summer School),
Trinity College Dublin Explorer programme (no program found under this name), Vienna
University of Economics and Business Summer University (undergrad/exchange-level, wrong
audience; the teen "WU4Juniors" alternative has no confirmed cycle since 2022), Stockholm
School of Economics and Panthéon-Sorbonne (no high-school-level program found for
either), UVA Young Writers Workshop (official site cites "contractual obstacles" for
2026, status unconfirmed), UNC Chapel Hill Summer Academy (summer.unc.edu bot-protected;
the literal "Morehead-Cain Summer Academy" is an already-enrolled-scholars benefit, not
an open-application program). The researcher also caught and refuted a hallucinated
WebSearch claim that Istanbul Bilgi University had been "closed by decree" — checked
directly against the official homepage and found false; flagged explicitly in that
record rather than silently trusted. Several accepted records (CU Boulder PCDP, WashU
CPP) are narrow, multi-year access-pipeline programs rather than general single-summer
applications — flagged in their own records for Oryn's matching logic to weight
accordingly. Live count after Wave 3: 369 total, 252 `summer_program`.

## Queued candidate pool for Wave 2+ (not yet dispatched)

**US STEM (more):** Purdue Summer Engineering Workshop, University of Illinois WYSE, WPI
Frontiers, Case Western Reserve pre-college, University of Rochester Xerox Engineering
Research Program, Columbia Science Honors Program, University of Washington Discovery
Program, University of Wisconsin-Madison PEOPLE program, Vanderbilt summer programs,
Washington University in St. Louis College Prep Program, UVA Young Writers
Workshop/STEM, UNC Chapel Hill Summer Academy, University of Maryland Terp Young
Scholars, UT Austin pre-college, Texas A&M pre-college, ASU summer pre-college, CU
Boulder Pre-Collegiate program, Colorado School of Mines summer camps, Northwestern
National High School Institute ("Cherub"), American Legion Boys State/Girls State.

**US business/finance (more):** Wharton "Future of the Business World" (FBW), Stanford
SPCS entrepreneurship track.

**US medicine (more):** Duke TIP health track, Penn Medicine summer program, Georgetown
Summer Medical Institute, Icahn School of Medicine at Mount Sinai HS summer research.

**Arts (more):** Idyllwild Arts Summer Program, CalArts summer programs, Boston
University Tanglewood Institute, SMFA Boston summer.

**UK/Europe (more):** St Andrews Summer Academy, Durham University summer school,
Imperial College Reach Out Lab, King's College London summer school, Warwick summer
school, University of Edinburgh Pathways summer school, University of Bath summer camps,
Trinity College Dublin Explorer program, Vienna University of Economics and Business
Summer University, Stockholm School of Economics summer program, Politecnico di Milano
summer school, Sorbonne Université summer school, Panthéon-Sorbonne summer program, Freie
Universität Berlin summer school, Istanbul Bilgi University summer program.

**Notes for future waves:** keep adding named, specific, real programs as this list gets
worked through — do not let an agent "fill in" a wave with unverified names. Prioritize
breadth across field (STEM/business/law/medicine/arts/humanities) and region (US/UK/
Europe/Turkey/international) so Oryn's opportunity matching isn't US-STEM-skewed.
