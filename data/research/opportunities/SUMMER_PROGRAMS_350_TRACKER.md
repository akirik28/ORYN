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
| 1, groups B/G/H | 24 | pending | | | not yet researched — see note below |

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
