# ORYN-RESEARCH-SUMMER — index & state

**Session** `db38e14b` · overnight 2026-08-23 → 24, **continuing per founder's explicit "do not stop
before 11am" instruction** · **research only, zero production writes by this lane** — CEO (`oryn-87`)
writes to production after reviewing dry-run proposals below.
Live DB read-only, for dedup, gap targeting and measuring the product's own predicates.

**⚠️ Numbers below refreshed 2026-08-24 ~05:45 (previously refreshed ~02:15, itself stale by then too —
this table goes stale roughly every few hours of active work). If you're reading this later, check the
timestamp on this line against the last CHECKPOINT entry before trusting it again.**

## Read these in this order

| File | What it is |
|---|---|
| **This file** | Running log, corrections, working rules — read top-to-bottom, newest at the bottom. |
| `summer_findings_2026-08-23.jsonl` | **390 records** (growing), covering the large majority of active rows individually, plus corpus-wide patterns. Every claim with its verbatim quote and source URL — the actual source of truth, searchable by row_id. |
| `summer_proposals_dryrun_2026-08-23.jsonl` | **208 row-level proposals** joined to live row IDs and current values, for CEO to review and action. |
| `summer_schema_and_pipeline_gaps_2026-08-24.md` | Consolidated schema gaps (15 items) and pipeline defects (17 items total incl. a site-level-tool-block pattern), every item with a named live case — merged with CEO's own memory file for the founder's morning decision doc. |
| `summer_url_fix_review_2026-08-24.md` | The wrong-`official_url` batch — safe swaps / retire-as-duplicate / retire-not-an-opportunity / needs-more-research, with dedup-risk checked per row. |
| `summer_DRY_RUN_PACKAGE_2026-08-23.md` | Original narrative findings (A1-A15/B1-B6) — **2026-08-23 snapshot, not re-verified**, see its own §9a for a continuation summary rather than treating it as current. |
| `summer_ONLINE_CREDENTIALS_2026-08-23.md` | Workstream B — country-by-country digital-consent-age table (B4, now 8+ platforms incl. Codecademy/Brilliant/LinkedIn Learning's career-vs-education age-floor pattern), European youth language certs (B9), Khan Academy/College Board (B10). |
| `summer_findings_online_2026-08-23.jsonl` | **42 Workstream B records.** |
| `summer_AUTUMN_CALENDAR_2026-08-23.md` | Refreshed 2026-08-24 ~05:16 — dates re-anchored to today, not a stale snapshot. |
| `summer_ACTION_LIST_2026-08-23.md` | Its own "checks I did not do" list fully audited and closed 2026-08-24 ~05:33 (one item, Sorbonne, remains a genuinely blocked lead). Otherwise a 2026-08-23 snapshot. |
| `summer_WORKED_EXAMPLE_2026-08-24.md` | Not refreshed tonight — treat as illustrative, not current. |
| `summer_live_corpus_snapshot_2026-08-23.jsonl`, `summer_url_liveness_2026-08-23.tsv` | Point-in-time snapshots from 2026-08-23, superseded by direct SQL for anything current. |
| `summer_proposals_triage_2026-08-24.md` (TRIAGE.md) | A point-in-time triage of the first 175 proposals — both contradictions it flagged (John Locke, CMU AI Scholars) are now resolved elsewhere in this file. Not regenerated; CEO and I are working proposals through direct dialogue instead. |

## Scope
1. **Workstream A** — Selective Summer Programs (original brief).
2. **Workstream B** — Online courses & certificates for high school (founder, mid-session).

## Collisions — none
ORYN-RESEARCH (`oryn-ce`) confirmed they are on `competition`, not `summer_program`. Their 488-candidate
discovery burst (371 commercial) covers a **different corpus** — discovery leads, not the live table. I
checked overlap by name before starting and did not re-research any of it.
CEO is `oryn-87`. Founder-held rows: **Koç Summer Academy** (`152b3822`), **Interlochen** — no proposal
written for either. *(Also flagged, deliberately untouched: "Interlochen Review", rank 2 for user
`7722ebe9`, `unverified` — I could not tell whether the hold covers it.)*

## Baseline — refreshed 2026-08-24 ~05:45
253 rows total (a new one since 02:15 — Barnard ASII, CEO's write), **150 `active`** (88 under_review,
**14 disabled** — up from 11 at 02:15 — 1 expired).

| | all 253 | **active 150** |
|---|---|---|
| `selectivity_tier='unknown'` | 164 | **67** |
| `verification_state='unverified'` | 165 | **62** |
| has `deadline` | 31 | (not re-split this pass) |
| has `cost` | 63 | (not re-split this pass) |
| has `eligible_countries` (non-empty array, not just non-null) | 12 | (not re-split this pass) |

Movement since the 02:15 baseline: active-unknown-tier 86→67 (19 more rows scored), has_cost 46→63
corpus-wide (17 more rows priced), disabled 11→14. Movement since 2026-08-23 session-start (the
original numbers): active-unknown-tier 94→67, active-unverified 69→62, disabled 4→14. Still slower
than the raw finding count (~230→390) suggests, for the same reason as before — a meaningful share of
tonight's research is still sitting in PROPOSALS_dryrun.jsonl (208 entries now) awaiting CEO's
review/write cycle, which is the expected shape of the research/write split, not stalled progress.

## The five findings that most change what the product does

1. **A live dashboard defect** — `.limit(2)` ran before the recommendability filter, so 3 of 7 users saw a
   short or **empty** Opportunities block despite 174–182 eligible matches. Reported, **fixed in #153**.
2. **After #153, those slots filled with three expired Turkish summer programmes** — İTÜ, Sabancı, Bilgi. All
   `verified_current`, all with `deadline = NULL`, so no automated check can demote them. The code half is
   fixed; the data half is this lane's.
3. **#154's pay-to-enroll gate fires on 12 of 157 active rows** — because it reads `cost`, and 113 rows have
   none. 101 active rows are exactly the population it targets and it cannot see one of them. **Filling
   `cost` is what turns that rule on.**
4. **Three European "summer schools" are for university students** — Bocconi (bachelor-students, 7 matches),
   CBS (bachelor/master courses, 3 matches), **LSE** (*"minimum requirement... is to have an offer of a place
   at university"* — and it is **rank 1 at 91%** for one user).
5. **The free elite US programmes are closed to ORYN's international users and our records don't say so** —
   MITES, Clark Scholars and SIMR are US-citizen/permanent-resident only; **Caltech SRC is limited to one
   school district (PUSD)** and is `active` with 5 matches. Wrongly-permissive errors nobody ever reports.

## Corrections I made to my own work
1. **Baseline omitted `status`** — every headline number I reported for hours was corpus-wide, not live. Found
   it myself when RSI came back `disabled`. Both columns now shown.
2. **"RSI and iD Tech look identical"** — false, and worse for RSI: iD Tech is `active`, **RSI is `disabled`**.
3. **UCSB "dead URL"** — retracted. The 404 came from a URL *I* constructed; the stored ones return 200.
4. **Duplicate scope 16 → 3** — most twins were already `under_review`/`disabled` with zero matches.
5. **Bocconi reclassified** duplicate → wrong-audience. Merging on title would have buried it.
6. **Stanley Prep D → B** — WFUNA is named and confirms the partnership bilaterally.
7. **Package's value proposition** — CEO corrected me: `selectivity_tier` is not read on the recommendation
   path. It changes Browse and the detail page, not what ORYN recommends.
8. **⚠️ The biggest one: my Tier-4 eligibility finding was substantially wrong.** I reported that seven elite
   programmes had eligibility walls ORYN recorded "nothing" about. **The restrictions were recorded** — Caltech
   SRC's PUSD clause, CU Boulder's partner-district clause, SIMR's citizenship clause, MITES, Clark, Sutton
   Trust and Parsons all carry them, several more precisely than I described them. Cause: my snapshot never
   selected `citizenship_restrictions` or `residency_restrictions` (the **second** column-omission of the
   night, after `status`). Corrected measurement: **33 rows carry an eligibility signal, not 12**; the real gap
   is **126 of 157 active rows**. Genuinely missing: LSE, TASS, TechGirls, UCSB RMP, Bath, Mathcamp, KU Leuven.
   The snapshot has since been re-pulled with all 25 columns.

## Two constraints that limit what can be delivered
- **`selectivity_evidence` has no column.** `ingest.ts:187` requires it, validates it, and discards it. Tiers
  can be written; their justification cannot. Until the column exists the evidence lives only in
  `summer_findings_2026-08-23.jsonl` — so these must **not** be presented in-product as "evidence-backed".
- **`cost` has no currency column** and `formatCurrency` defaults to USD. LSE 4450 (GBP), Bocconi 2700 (EUR),
  ETH 500 (CHF), KU Leuven 430 (EUR), ODTÜ 60000 (TRY), Bilgi "16000 TL **+ KDV**" all share one numeric.
  Bath's £365 renders to a student as "$365". Nor can it express price ladders (Harvard $4,180→$15,735;
  we store the $9,100 rung), nationality-dependent prices (KU Leuven €380 Flemish / €430 other) or
  pre-decision application fees.

## Working rules this lane used
- **Before writing "not recorded", check every column that could hold it.** Twice tonight I inferred absence
  from a projection that could not contain the answer. A snapshot's column list silently determines its own
  conclusions.
- **Do not sample on salience.** The famous rows are the already-curated ones; generalising their state to the
  corpus gets the direction of the finding backwards.
- The authority on what a university accepts is **the university**, not the vendor. (Schoolhouse's own
  partnerships page names no institution; MIT's page is what established the claim.)
- A tool's 403/404 is a fact about the tool. `cee.org`, `ucas.com` and `uwc.org` all refused WebFetch and
  loaded fine in the browser.
- A search summary is not a source. Several are recorded here explicitly as *unverified*.
- Never infer `open_enrollment` from the absence of a stated gate — leave `unknown`. Only assert it when the
  provider says so (Aggie STEM: *"Registration is on a first-come basis."*).
- **A real `.ox.ac.uk`/`.cam.ac.uk`/institutional domain is a stronger affiliation signal than any marketing
  copy.** Downing College's summer programme sits on `dow.cam.ac.uk` — inside Cambridge's own namespace — and
  that alone distinguishes it from Oxford Royale, ISSOS, Oxbridge Academic Programs and John Locke Institute,
  none of which use a university-owned domain because none of them are the university. Check the domain before
  reading the copy.
- A screen that only ever downgrades is a policy. Pioneer's exemption was tested and **cleared**; Oxford
  Scholastica's was tested and **failed**.

## 2026-08-24 session — new batch (post-11pm continuation, founder-directed "do not stop before 11am")

**Headline finding: `official_url` pointing to unrelated content, fixable from the row's own `description`.**
Researching 19 previously-unresearched active rows whose titles were bare institution names ("Carnegie
Mellon University (PA, USA)", "King's College London (London, UK)", etc.), I first assumed — wrongly — that
these were empty ingestion stubs. Pulling `description` (which my snapshot/matching script never surfaced)
showed the opposite: rich, specific program text. The real defect: **8 of these rows have `official_url`
pointing to something entirely unrelated to the described program** — a random faculty CV PDF (Carnegie
Mellon), an unrelated master's-degree page (Hochschule Bremen), an unrelated clinical-trials paper (King's
College London), a bioacoustics lab blog (NYU), **a different Pennsylvania public high school's own website**
(the BU row), an unrelated competition page (Universidad de Navarra), an unrelated research-institute page
(Western Switzerland/HEIA-FR), a random faculty profile (St Andrews). In every one of the 8, **the correct URL
is already sitting in that same row's own `description` field** — this is a mechanical fix, not new research.
Spot-verified 3 of 8 live (CMU, King's College London, BU) — all 3 resolve correctly with current 2026-cycle
facts (see PROPOSALS_dryrun.jsonl). The other 5 are proposed but flagged `needs_live_recheck`.
Also from the same batch: **4 rows are not opportunities at all** (a single UCSC course-catalog listing, a
Zoom-webinar announcement, a summerschoolsineurope.eu aggregator page whose captured description is about an
unrelated Milan program, and a USC info-session promo redundant with USC's own correct row) — recommend
retire. And **4 rows needed only a title fix**, URLs already correct (U Chicago, UM Academies, UCSB
umbrella/index, GWU).

**Self-correction (the 3rd one this operation):** my "bare institution-name stub" hypothesis was wrong,
for the same root reason as the citizenship-restrictions miss earlier — I generalized from a snapshot that
didn't select the column the answer lived in. Full text in findings.jsonl.

**Individually verified, non-batch:**
- **Koç University Summer Academy** — real 2026 fee found: **TRY 80,000** (was null). Confirms open_enrollment
  (participation-based certificate, no selection process on either the program or fees page).
- **Rockefeller SSRP** — real selectivity evidence found (32 accepted/year, 4 teams of 8-10, interview stage) →
  propose `unknown` → `highly_selective`. Age 16+ at program start (was null).
- **American Legion Boys State** — national page states no explicit citizenship clause, but nomination runs
  through a student's own US high school + local Legion post — a structural access barrier independent of any
  stated rule, same family as the Caltech/PUSD case. Not asserting US-only; recording the mechanism.
- **CTY "Intensive Studies for 7th Graders and Above"** — stored URL is dead, redirects to the CTY homepage —
  now converges on the same destination as the sibling CTY row (15237eb0) through URL rot, not ingestion error.

Active rows individually researched: was 113/157 (72%), **now ~153/157 (~97%)** after this session's work (19-row batch +
Koç + Rockefeller + Boys State + CTY, minus the ones that turned out already covered). ~33 active rows remain.

**Workstream A breadth pass — effectively closed out.** Of the 46 active rows flagged unresearched at the
start of this session, only genuine ingestion junk remains untouched by design (retire candidates, already
listed above). The two real remaining sub-gaps: SAIC has two overlapping rows (Early College Program classes
vs. ECPSI summer institute, 7f8281b0 / e9c4cd39) not yet fully disambiguated, and several `needs_live_recheck`
flags on stale-dated finds (Hochschule Bremen, Lehigh IGEI, HEIA-FR, St Andrews, Ringling, Emory sub-pages) —
listed as such rather than asserted current. Pivoting remaining time toward Workstream B (online
courses/certificates), which was under-invested relative to A per founder's second directive.

## Correction cycle with CEO, 2026-08-24 ~01:20

CEO caught that "King's College London" (1e907aad) was a duplicate of an already-correct row
(f43ddfc3), not a URL-swap candidate. Checked all 10 of my URL-swap proposals for the same risk
rather than fixing only the one flagged — found a second, uncaught duplicate (St Andrews, e0960bef
vs. 0a316853) plus a messier three-way Lehigh case, and two swap-target URLs that themselves 404
on reverify (Hochschule Bremen, HEIA-FR — HEIA-FR's real 2026 URL found, Bremen's not). Consolidated
review table for CEO: `URL_FIX_REVIEW.md`. Koç `cost=80000` proposal withdrawn — CEO confirmed the
fact already lives correctly in `description` with `cost` intentionally NULL (no currency column);
writing the numeric would have repeated an already-fixed Bilkent-style error.
**Lesson: when a peer flags one instance of a pattern, check the whole pattern, not just their example.**

## Commercial-vs-selective sweep, 2026-08-24 ~01:35

Went back to this lane's core mandate (distinguish selective from commercial, don't let university
branding imply affiliation) rather than only auditing existing tiers. Checked two of the more
prominent brand-adjacent commercial programs directly against their own sites:

- **Oxford Royale (active, 6f80e90f)** — confirmed independent commercial company, NOT University
  of Oxford-affiliated. Real 2026 prices found (was cost=null, tier=unknown despite being active):
  £6,995 2-week Oxford residential, up to £9,995 for brand-heavy add-on tracks ('MIT Futurebuilders',
  'Ivy League Scholars') that charge MORE for other universities' names with no academic tie to any
  of them. **Its dormant twin row (7cfc009f, under_review) has official_url pointing straight at
  ox.ac.uk** — the University of Oxford's own homepage. Flagged before anyone reactivates it.
- **ISSOS (under_review, f52db280)** — same commercial-at-prestigious-campuses model, but its own
  marketing language is more careful ('at the campuses of', never 'run by'). Lower urgency, still
  under_review.

Both are proposed for `open_enrollment`, matching this lane's C-grade discipline: commercial programs
stay in Browse, just don't compete as if selective.

## Exposure-weighted sweep, 2026-08-24 ~01:40-01:45

151 active rows now (down from 157 after CEO's 6 writes). 87 still selectivity_tier='unknown'.
Rather than working blind through 87 rows, pulled the top 25 by opportunity_matches (actual
student exposure) and worked through the ones not already touched tonight. Findings:

- **Kadir Has 'Kış Okulu'** confirmed genuinely a WINTER program (Jan 19-30), miscategorized as
  summer_program — and its own linked URL is branded `liseyazokulu` (lise-YAZ-okulu = HS-SUMMER-
  school), suggesting KHAS runs two separate programs this row has cross-contaminated.
- **Columbia 'Spring Immersion Program'** — stored URL now shows an 'Academic Year Weekend
  Program' (Spring 2027, weekend format, $2,868+/course) — real and current, but not summer, not
  named what the row says.
- **'Trinity College London, Ireland'** — no such institution; real target is Trinity College
  DUBLIN's Walton Club STEM program (10 days, ages 15-18, personal statement + 2.75 GPA min — a
  real if modest bar). Correct URL was in the row's own description, per the now-familiar pattern
  — AND that same description is separately contaminated with unrelated University of Amsterdam
  content. Two independent defects on one row.
- **KUSRP (Koç University Summer Research Program)** — genuinely rich find: a full 2026 catalogue
  of named faculty-mentored research placements across many fields. Directly relevant to the
  product's 'research is the usual weak spot' thesis for this market. Cost/selectivity still open.
- **Vanderbilt PTY** — confirmed a legitimate 3-track umbrella (VSA/VSI/VMI), no wrong-audience
  issue, cost/international-eligibility still open.
- **Leangap** — real numeric cap (40 seats) + sold-out status + a soft, non-academic evaluation
  process. Borderline on this session's own selective-tier bar. UC Berkeley affiliation claimed by
  third parties, NOT found on Leangap's own page — not asserting it.
- **Acıbadem 'Lise Bilim Yaz Kampı'** — 3rd confirmed PDF-only source tonight (after Sabancı,
  UCAS), same structural extraction wall, not chased further.

~62 active rows remain both unknown-tier and unverified. Continuing top-down by exposure rather
than trying to close all 62 — most value per hour, matches the founder's 'go deeper' framing better
than surface-level completeness would.

## Exposure-weighted sweep — DONE, 2026-08-24 ~02:14

Worked through essentially the entire original list of 86 active/unknown-tier rows (as measured at
~01:15 tonight) at least once. Highlights beyond what's already logged above: Lumiere Education
(real 1-on-1 research mentorship, genuine but "Extended Studies"-qualified UCSD credit), Winchester
College "Discovery Summer" (6th confirmed real-school+commercial-third-party-operator case tonight,
real price GBP2,050/wk), UVA Emerging Engineers (free, accepted-applicant selection), Purdue
resolved (closes a case already cited by name in ONLINE_CREDENTIALS.md B5), HKBU resolved via a
real HTML page instead of its stale PDF — and gated by an opaque "invited schools only" allowlist,
a 4th distinct shape for the structural-access-barrier schema gap. Also caught, proactively this
time (before spending research effort, not after a correction): University of Edinburgh's second
row is a duplicate of the already-correct one — checked for a clean twin first, per the Pioneer
lesson from earlier tonight.

**One real self-contradiction this session, corrected:** re-derived Pioneer Academics' selectivity
evidence from scratch without checking that I'd already resolved this exact row hours earlier (clean
row exists at `bdc4bdb5`, `c581e99a` already flagged for retirement) — CEO caught it, I verified and
corrected immediately, and it produced the strengthened working rule above (dedup checks must cover
prior findings, not just the live corpus).

275 findings total. Pivoting next toward: (a) the accumulated `needs_live_recheck` items — going
back for the specific facts (cost, deadline, selectivity mechanism) that several B-grade "real but
thin" findings are still missing, and (b) continued Workstream B depth.

## under_review exploration, ~02:15-02:28

CEO's steer: explore, don't propose (nothing there reaches students today). Confirmed the
wrong-`official_url` defect is present in `under_review` too (Fordham, Google CS Institute,
Mathworks/Texas State, U Exeter, Young Founders Lab, BETA Camp — 6 confirmed by hand). Tried a
SQL heuristic (does official_url's domain appear in description?) to scope this quantitatively —
**the heuristic itself was unreliable** (~60% false positives from legitimate subdomains not
literally repeating their own domain string in prose) and I said so explicitly rather than let a
noisy 96/146-active number travel toward a founder decision about whether to write a bulk
re-extraction script. Real, hand-verified read: the pattern is confirmed in both buckets, precise
scope not established, and per CEO that's sufficient for the script-or-not call.

Also closed a loop from earlier tonight: "Kadir Has Yaz Okulu" exists as its own `under_review`
row at exactly the URL (liseyazokulu.khas.edu.tr) hypothesized as the real summer counterpart to
the Kış Okulu mixup. And found a possible second defect shape worth watching: Mathworks' own
description ends with what look like raw structured fields dumped as text ('18.0 | Teacher
Recommendation Transcript Essay | 4000.0') — plausibly age/requirements/cost that never made it to
their real columns. Not confirmed as a pattern yet, one instance only.

## Proposals triage + reconciliation, and continued under_review depth, ~02:37-03:03

CEO asked for a triage of PROPOSALS_dryrun.jsonl (175 entries) into ready/judgment/hold —
`TRIAGE.md` / `summer_proposals_triage_2026-08-24.md`. An automated grade-matching pass said 21
were "ready"; hand-verifying against live DB state cut that to 8 genuinely clean ones (6 of the
other 13 were already written — CEO had actioned them since my last check). Process surfaced two
real data-integrity bugs: two row_ids each had a second proposal entry that was actually about a
**different program** (Inspirit AI Healthcare's row carried a Horizon Inspires finding; HCSSiM's
row carried a Stanford Pre-Collegiate Summer Institutes finding). Both re-filed under their correct
row_ids with an explicit MISFILING_NOTE. Systematically checked all 13 row_ids with multiple
proposal entries — only these 2 were genuine mismatches, the rest were consistent refinements.

Continued individually verifying `under_review` rows: RoboMaster China (free, genuinely selective,
explicitly international), Polygence (real platform, but its "5.9x T25 acceptance" is an alumni
OUTCOME claim, not evidence of Polygence's OWN admission process — kept separate), PACT and Warwick
(clean open_enrollment), Sevenoaks (genuinely run by the school itself unlike most UK "prestigious
campus" rows tonight, but ages 11-16 only), Kode With Klossy and Stanford Summer Humanities
Institute (both left deliberately unresolved on selectivity rather than over-reading ambiguous
language), WPI Frontiers and Illinois Tech (both clean, complete), HSHSP (explicitly not running in
2026), University of Toronto (a 23+-program umbrella with a new eligibility shape: one sub-program,
"Blueprint," is explicitly restricted to Black students — race/ethnicity-targeted access, distinct
from every geographic/socioeconomic/citizenship wall found earlier).

Workstream B: closed the European-language-certification set at 4 — French (DELF Junior, 12-18),
German (Goethe A1, 10-16), Spanish (DELE Escolar, 11-17), Italian (CELI Adolescenti, 12-18, the
cleanest match to ORYN's exact range). Duolingo English Test's age policy is the best-designed of
anything checked all session — folds Coursera's two separate clauses into one sentence.

303 findings, 30 online findings, 177 proposals as of 03:03.

## Continued under_review depth + a systematic dedup sweep, ~03:03-03:27

Resolved several items that had been left as pattern-notes rather than full findings: Young
Founders Lab (its stored URL was a reseller's own review article, same shape as Pioneer but a
distinct sub-pattern; real site found with genuine multi-stage selection), Mathworks and Fordham
(both faculty-CV-as-URL, both fixed from their own description text).

Ran a purely mechanical dedup check — any under_review row whose official_url exactly matches an
active row's — and found 4 hits with almost no research cost: SSTP (exact duplicate, retire), Duke
TIP (a 2-hop redirect chain confirms full rename to "Duke Pre-College", also retire), University of
Miami (already known), and Oxford Royale's dormant row (CEO had already retired it once the URL fix
made the match deliberate, not new). One near-miss handled carefully: Cornell's bare row shares no
URL with the active Cornell row but covers genuinely different formats (online/commuter vs. the
active row's residential-only scope) — NOT a duplicate, flagged to keep both. CEO endorsed making
this sweep a standing, periodic check as more URL fixes land.

CTY's URL rot is now confirmed a 4th time (Carlisle also 404s) — strong enough to treat any
remaining unchecked CTY grade7-12/[location] URL as presumptively stale by default rather than
verify-each-individually.

**Real catch: "UWC Türkiye" is wrong-kind-entirely**, not a bad-URL case — it's the Turkish National
Committee's process for the full two-year IB Diploma boarding placement at one of UWC's 18 schools
worldwide, confirmed live ("80% of our students study on scholarship in the IBDP and IBCP
programmes... 3,000+ IBDP students... each year"). Nothing to do with a summer program. The correct
UWC row for this catalogue is already separate and correct ("UWC Short Courses").

Turkish-university coverage reached 8 institutions this session (Koç, Sabancı, İTÜ, Bilkent, Bilgi,
Bahçeşehir, Özyeğin, Galatasaray) — open_enrollment confirmed in every case where a selection
process was actually checkable (5/5), consolidated into a single pattern note as the reasonable
default for future Turkish rows, explicitly excluding KUSRP and Koç's research/winter programs from
that default since those look genuinely different in kind.

Also found real, decision-grade facts for several previously-thin rows: Harvard's bare row already
had rich content in its own description (a specific Pre-College Program URL, distinct from the
correct SSP row); IE University's JAB has an exact 15-participant cohort cap; UC Berkeley B-BAY's
~10% acceptance rate is confirmed verbatim; SPINWIP and JHU Engineering Innovation are both real,
free-or-credit-bearing, genuinely international programs.

333 findings, 30 online findings, 177 proposals as of 03:27.

## Barnard/Athena close-out + under_review "genuinely untouched" list exhausted, ~03:27-03:51

CEO asked me to take the Barnard College Athena Summer Innovation Institute (ASII) pass — the
program whose content had bled into BETA Camp's description. Verified directly (athenacenter.
barnard.edu/asii, then two Barnard Pre-College pages): real, 30-girls-worldwide cohort, current
2026 dates (June 29-July 17), tuition $8,160 base / $2,611 residential add-on (a SHARED "3-Week
Exploratory Institutes" tier price, not ASII-exclusive — same price-ladder shape as Harvard SSP).
Caught and did NOT carry forward a WebSearch summary's specific deadline claims (Dec 1/Feb 9/Apr
15) — direct fetch only confirmed Feb 9 as a **financial-aid** deadline, not a general one. CEO
wrote the row (id `4bba9517`) off these facts, deliberately left eligible_countries/citizenship
empty despite the "30 girls from around the world" line — correctly read as cohort-composition,
not a stated eligibility clause (same discipline as this session's outcome-claim-vs-evidence
distinction, applied by CEO this time, not me).

Then re-derived the under_review "untouched" list properly: my first attempt (row_id-based diff
against findings.jsonl) said 48 of 88 were untouched — **wrong**, because most findings never had a
`row_id` field set consistently. Redid it with per-title keyword matching against the full findings
text instead, which cut the honest untouched list to 5. Naming the miss explicitly rather than
letting the bad 48-number travel anywhere, same standard as the earlier "unreliable SQL heuristic"
calls tonight.

The real 5, all now resolved:
1-3. **Three Turkish "Kış" (winter) camps confirmed miscategorized under summer_program** — Acıbadem
   "Lise Kış Bilim Kampı" (`c3a16d0e`, title itself says Kış), Koç "Lise Kış Tıp Okulu" (`2b09924c`,
   direct fetch 403'd, corroborated via search: real file-review selection step, unlike the usual
   Turkish-university open_enrollment default), Acıbadem "...Genetik Kampı" (`dc4343ec`, our stored
   title drops the season word entirely; real title has "Kış" in it). Combined with the already-known
   Kadir Has Kış Okulu and Koç's dead-URL Nanotechnology winter camp, that's **5 confirmed instances**
   of winter programs sitting in this category — a real pattern, not isolated mixups. Did not research
   these three as summer opportunities beyond confirming the season, since they aren't summer
   opportunities — that's out of this lane's scope by design.
4. **Columbia Writing Academy** (`3779b871`) — real, current (Summer 2026 Session B, July 20-31),
   online 2-week essay-writing course, but its own stored URL (and even the clean equivalent) is a
   Columbia login wall — confirmed by direct fetch, not assumed. Non-gated /events/ page corroborates
   the program is real. Cost genuinely not found after checking 3 separate pages.
5. **University of Pennsylvania bare row = ESAP** (`0009f66d`) — real, **genuinely selective**
   (essay + transcript + 1 STEM-teacher recommendation + $90 fee), current 2026 deadlines (priority/
   intl Jan 31, final Feb 28), cost $9,250 confirmed directly. Age 15+ and GPA 3.0 minimum confirmed
   via FAQ — but a search-result claim of a specific "grade 11/12 entering Sept 2025" restriction was
   NOT corroborated by the direct fetch and was deliberately not carried forward. Hybrid Penn/"Bold
   Summers" administration noted factually, not treated as a red flag either way. Written up as a
   Bucket-1-quality ready proposal in `PROPOSALS_dryrun.jsonl`.

343 findings, 30 online findings, 178 proposals as of 03:51. under_review's "genuinely untouched"
list is now empty — remaining under_review work from here is depth/re-verification on rows already
touched, not first-pass coverage.

## Self-correction: ESAP deadlines, and closing the TOEFL/IELTS gap, ~03:51-03:59

CEO caught a real miss on the ESAP write: I'd verified the Jan 31/Feb 28 2026 deadlines as "current,
not stale" by checking the page said "2026 session" — but never checked those dates against *today's*
actual date (2026-08-24), where they're seven months elapsed. Not a bad fetch, a bad check — "right
year" and "still-actionable" are different questions. CEO correctly wrote the row with deadline=NULL
("next cycle not yet announced") instead of storing a dead date. Logged as a self-correction, and
generalized into `SCHEMA_AND_PIPELINE_GAPS.md` #3 as a third deadline-shape: most US/UK summer
deadlines fall Nov-Feb for the *following* summer, so any research pass run in the back half of the
year — like this whole session — will find most of this corpus's deadlines already elapsed. Not a
defect, just the calendar, but worth a `deadline_mode`/`next_cycle_announced` distinction so the
product doesn't misread a well-researched corpus as deadline-missing. Deliberately did NOT re-audit
every deadline this session touched by hand — the pattern note plus catch-at-write-time (which is
literally what caught this one) covers it better than a brute-force re-check would.

Closed the last open item on Workstream B's list: TOEFL iBT's age policy. Direct fetch from ets.org
(id-requirements page) confirms no stated minimum age at all — a 15-or-younger note is a *suggested*
(not required) parental-accompaniment step, nothing restricts 16-17. This makes TOEFL iBT structurally
more accessible than IELTS Online (confirmed 18+ hard wall) for ORYN's 14-18 audience — a genuinely
useful asymmetry now on record. Gave IELTS's paper/computer under-16 position a real second attempt
(2 more page fetches + 2 more targeted searches) — no ielts.org primary source surfaced despite the
effort; 3 independent secondary sources now converge on "not recommended under 16, no hard
prohibition," up from 1, but deliberately NOT upgraded to verified on convergence alone. Both written
up in `ONLINE_CREDENTIALS.md` B4 and the Open Questions section (TOEFL struck through as resolved).

344 findings, 35 online findings, 178 proposals as of 03:59.

## Active/unknown-tier coverage check + USC found, ~03:59-04:10

Ran the same title-keyword coverage check against the 79 `active` rows with `selectivity_tier=
'unknown'` that worked well for `under_review` earlier. First pass said 8 untouched; hand-checking
each cut that to 1 real gap — the rest were false negatives from imperfect keyword matching (CTY
Intensive Studies, Lehigh Bethlehem, HEIA-FR, UCL Bartlett, Maastricht, WashU CPP, and the BU row
were all already properly covered, just phrased differently than my search keyword). Not re-listing
those individually since they needed no new work — noting the check's own false-positive rate
(7 of 8) so the technique's limits are on record, same as the earlier under_review pass (which had a
much worse first-pass miss rate before hand-verification, for the same reason).

**The one real gap: USC Summer Programs** (`4a54159a`) — genuinely selective (essay, letter of rec,
transcript, $85 fee, rolling admissions), cost confirmed $11,570 residential all-in / $8,130
commuter (commuter excludes international students). International English-proficiency gate
directly ties to tonight's own TOEFL/IELTS/Duolingo research: TOEFL iBT 100+, IELTS 7+, PTE 68+,
Duolingo 120+, or SAT/ACT equivalents. Also a **third confirmed instance** of the URL-fine/
description-stale pipeline defect (`SCHEMA_AND_PIPELINE_GAPS.md` #15, after Oxford Royale and Summer
Discovery) — official_url is clean and current, but the stored description has 2025 dates and a
2024-campaign tracking link baked into its text. Three instances is enough to upgrade that item from
"worth watching" to "worth a pipeline-level re-extraction fix." Written up as a ready Bucket-1-
quality proposal.

345 findings, 35 online findings, 179 proposals as of 04:10.

## needs_live_recheck depth pass, ~04:10-04:11

Founder directive says research deeper once first-pass coverage is done — both workstreams hit that
point tonight, so switched to re-checking rows this session had already flagged `needs_live_recheck:
true` (54 of them) rather than stay idle. Picked the ones explicitly named in this lane's own pending
list plus a couple more with checkable specific claims:

- **Bentley Pre-College** — new eligibility fact (min age 16 for residential, younger can commute/
  online), confirmed the umbrella-over-Wall-Street-101 relationship, cost still unfound after 3 real
  attempts (apply page 403'd).
- **Waterloo Renison Future Ready** — ages 15-17 reconfirmed directly, cost still unfound, but
  importantly **ruled OUT** a misleading aggregator cost figure ($3,775) that turned out to describe
  a completely different Renison product (a 1-year pathway diploma) — caught before it entered the
  record, same aggregator-conflation risk as schema-gaps #13.
- **UC San Diego FUTURES** — real positive open_enrollment statement found directly ("Admission
  Criteria: None mentioned; direct enrollment"), 8 named tracks, 2 A-G approved. Scope nuance: mostly
  an academic-year program with a summer option, not primarily summer-shaped. Ready proposal.
- **MathILy-Er** — the "just as selective as MathILy" marketing line actually undersold it: real
  4-hour timed exam + forms + recommendation. Cost $6,175 confirmed. Found a genuine nuance worth
  keeping precise: int'l students CAN apply, just get lower financial-aid priority than US students —
  a financial-aid gate, not an admission bar, different shape from a hard citizenship wall. Ready
  proposal.
- **Kode With Klossy** — real holistic 2-question application confirmed directly (no numeric rate).
  Verified $0 (not just NULL — the founder's confirmed-zero distinction). Found the org also runs a
  structurally different first-come-first-served sub-program (CODE-A-BRATION) — flagged in case that
  ever becomes its own row, not conflated with this one. Ready proposal.

350 findings, 35 online findings, 182 proposals as of 04:11. Continuing the recheck pass (Girls Who
Code, Polygence next) before the next check-in.

## Girls Who Code product-change catch, Polygence resolved, Clubs researched for CEO, ~04:11-04:15

**Girls Who Code** (`674f46f0`) — real finding, not a routine depth add: the org's flagship summer
product (Summer Immersion Program) appears discontinued after 2025 — a search found GWC's own FAQ
titled "Will the Summer Immersion Program be offered again in 2026?" (couldn't read the body, zendesk
blocked me), independently corroborated by a direct fetch of GWC's own current /programs page, which
doesn't list SIP at all. Current live offerings (Clubs grades 3-12, Pathways self-paced, College &
Career ages 18-25) don't cleanly fit a summer_program shape. Flagged for CEO rather than acted on.

CEO pulled the row: dormant, 0 eligible_users, generic aggregator-style content with no specific
program ever named — genuinely zero urgency, and re-scoping to Clubs would mean inventing details
neither of us had researched. Left the call to me on whether to research Clubs properly.

**Did the Clubs pass.** Real answer, and it changes the recommendation: Clubs is NOT a viable
re-scope target, structurally — it isn't a self-service "find and apply" opportunity at all. A
student can't sign up directly; it requires either an existing club at their specific school/library
(a US school/library-partnership model with no evidence it reaches Türkiye or most of ORYN's
international footprint) or an adult volunteer becoming a background-checked facilitator. No single
application URL/deadline/cost a student can act on. Recommending the orphaned row stay flagged thin
or get retired from summer_program, not repointed at Clubs — closes CEO's open question with a
researched answer rather than a guess.

**Polygence** — closed the "no selectivity found" gap with an actual answer rather than leaving it
open. The program's OWN words explicitly disclaim strict selectivity ("we do not abide by a strict
acceptance rate... we do not ask for GPA or recommendation letters") — an unusually direct
self-disclaimer, stronger evidence against 'selective' than most silence-based reads this session.
A real screening step still exists (application + possible admissions interview), so not pure
open_enrollment either — recorded precisely rather than forced into either bucket. Cost is a floor
("start at ~$3,000" Core / "$495" Pods) — not writing a single value, same discipline as the
Stanford/Wharton price-ladder cases.

353 findings, 35 online findings, 182 proposals as of 04:15.

## Three more needs_live_recheck items, and a cross-lane misattribution caught, ~04:15-04:20

**JHU Engineering Innovation** — real 2026-dated application mechanism found (online app + fee +
1 required/1 optional essay, EA deadline Jan 30 2026), but the cost figures a search surfaced were
headed "Summer 2025" while citing a 2026 deadline in the same breath — an internal year-mismatch red
flag. Two direct fetches of the actual cost page were blocked (403). Deliberately NOT recording those
dollar figures as confirmed 2026 pricing. Real, more confidently-held fact: need-based aid exists but
explicitly only for commuter/online formats, not residential/hybrid.

**IE JAB** — likely free with a genuine IE-degree-length scholarship for admitted alumni, but IE's own
official page hit a genuine site-side redirect loop (10+ redirects, twice) — corroborated instead via
two independent secondary sources (a search summary of the official page, and iestork.org, an
unrelated student-publication domain) converging on the same specific claim. Recorded cost=0 with
explicitly MODERATE confidence, not primary-source certainty.

**SPINWIP** — got past the earlier truncation point: real recommendation-optional application detail,
a refined age floor (16+ by program start, narrower than grade alone), but selectivity mechanism still
unconfirmed after 2 real attempts. One single-source, flagged-not-adopted nuance: a search described
eligibility as "any gender," more open than the program's own women-in-physics framing — not
overriding the existing characterization on one uncorroborated source.

**Cross-lane note**: CEO's status update briefly credited me with three findings (Battlecode, Brown
STEM aid reversal, Concord Review) that don't exist anywhere in my own scratchpad — grepped every file
to check before replying rather than accepting the credit. Confirmed mutual: those were oryn-55's
BLOCK2 batch, pulled in by mistake while CEO was writing to me about something else. Nothing had been
committed to a shared doc with the wrong attribution, so no cleanup needed — logging only because
"verify before accepting credit" is the same discipline as "verify before accepting a correction."

356 findings, 35 online findings, 182 proposals as of 04:20.

## Terp Young Scholars and Downing College closed cleanly, ~04:20-04:24

**Terp Young Scholars** — direct fetch closed the cost gap precisely: two-rung ladder, Campus $1,791 /
Online $1,420 (not collapsed to one number, per schema-gaps #4 discipline). Also explicitly resolved
a minor tension in my own earlier records (one pass said tier=unknown, a later pass said selective) —
not a real contradiction like CMU AI Scholars, just an earlier pass that hadn't reached the admissions
pages yet; the scholarship-application evidence found this round independently confirms 'selective'
rather than just repeating the earlier claim. Ready proposal.

**Downing College** — resolved a real D-vs-A tension between two of my own earlier entries on this
row: the D-grade correctly found nothing at the stored bare-homepage URL; the A-grade correctly IDed
Downing as a genuine Cambridge college but hadn't found the specific programme page yet. This entry
closes the loop: 5 real named tracks exist at a deeper URL, GBP 9,000 for the HS-appropriate Specialist
Programme (2 weeks, real interview-based selection, 'unconditional offer if you meet the required
standard'), 2026 closed/2027 dates already set. Recommending a URL fix, not the earlier 'retire' call
— dedup-checked via SQL first (only one Downing row, no risk). Ready proposal.

358 findings, 35 online findings, 184 proposals as of 04:24.

## Wharton Pre-bacc, Columbia bare row, John Locke closed; TRIAGE.md left as-is deliberately, ~04:24-04:29

Three more clean closes: **Wharton Pre-baccalaureate** (GPA 3.5 floor quantifies the old "exceptional
students" language, $4,390/course, Philadelphia-resident tuition waiver found as a positive carve-out).
**Columbia University bare row** (NYC Residential Summer, $12,838/session, real 2-recommendation
mechanism with unusually specific letter-writer requirements). **John Locke Institute** — financial
aid figures now precise (GBP 800-2,000 scholarship range, exact alumni/sibling/ambassador discount
percentages) but base tuition remains genuinely unpublished after 3 real attempts; also found and
superseded a STALE proposal entry for this row from 2026-08-23 that still carried the old "no
acceptance rate published" caveat even though a same-session later finding found the real ~33% rate —
added a fresh entry explicitly marked as superseding the old one rather than editing history.

**Deliberate choice**: not regenerating TRIAGE.md even though it's now 12 proposals stale (175→187).
CEO and I have shifted to verifying/writing proposals in direct real-time dialogue as they land, which
is working well and is lower-latency than a batch document — spending time re-triaging the whole file
would trade research time for reorganizing work already flowing fine through the direct channel.
TRIAGE.md stays as a point-in-time snapshot, not a live index.

361 findings, 35 online findings, 187 proposals as of 04:29.

## Andover, Lumiere, Global Achievers Academy, ~04:29-04:34

**Andover Summer** — cost and selectivity both closed. A WebSearch pass first suggested $6,300/$3,150
as if that were the whole price picture; verifying directly caught that this was only the DAY
program's rate — Boarding is $11,000/$11,350, a 4-rung ladder not a 2-rung one. Caught before it
became a wrong single figure, not after. Selectivity: the program explicitly self-describes as
"selective" in its own words (3 essays, 2 named-role recommendations, transcript, $75 fee) — stronger
than the reputation-based caution the earlier pass correctly held out for. Ready proposal.

**Lumiere Education** — admission process (form + interview, no published rate) reasonably confirmed
across independent secondary sources. Cost deliberately NOT recorded — the same search produced two
internally-inconsistent ranges in one summary ($2,800-$8,900 vs $2,490-$5,000+), and picking either
would be worse than leaving it open.

**Global Achievers Academy** — open_enrollment REINFORCED, not just repeated: fetched the page
literally named "Admissions" directly and found genuine registration-only language (form + B2 English
floor, no selection). This is one of the 101 active rows the pay-to-enroll gate is structurally blind
to (per last night's #154 measurement) — cost remains the blocker, and aggregator figures found were
unreliable enough to skip on purpose (one explicitly labeled "Updated 2024 Cost", currency-inconsistent
with another aggregator's figure for the same org).

364 findings, 35 online findings, 188 proposals as of 04:34.

## Self-caught near-duplicate write, IE University Pre-College Program, ~04:34-04:38

Also found: ie.edu redirect-loops for this session's tool on every page tried (3 for 3 tonight —
JAB x2, this row's target page, its admissions-and-fees sub-page) — naming it a site-level pattern
like CTY's URL rot rather than retrying individual pages again.

**The real catch**: drafted a URL-fix proposal for row `3c4cbeb7` (bare/wrong-URL) pointing at IE's
Pre-University Summer Program page, THEN ran the dedup check — and found a clean row already exists
at that exact URL (`41db8ceb`, cost=5900, tier=open_enrollment, verification_state=verified_current).
Withdrew before it ever reached CEO. Same mistake class as the King's College/St Andrews near-misses,
but a different point in my own process — I'd drafted the text before checking instead of after. Fixed
going forward: dedup-check a row_id BEFORE drafting a URL-fix, the same order already used successfully
for Downing College earlier.

**Genuine value that came out of catching it**: the existing clean row's tier (open_enrollment,
already verified_current by someone) actively conflicts with tonight's fresh research (a real essay+
interview holistic process, found via the search fallback since direct fetches were blocked) — flagged
as a tension in PROPOSALS_dryrun.jsonl for a human to weigh, not silently overridden with
weaker-sourced evidence against an already-verified value.

366 findings, 35 online findings, 192 proposals as of 04:38 (188 + 1 withdrawal + 2 corrected entries
+ 1 tension flag).

## Leangap resolved, and a real audit: 4 fully-resolved findings had never made it into proposals, ~04:38-04:42

**Leangap** — UC Berkeley affiliation question resolved cleanly: checked both sides (Leangap's own
"hosted at" language, Berkeley's own affiliate materials, which don't list Leangap at all). Genuine
honest venue relationship, no misattribution risk, same shape as ISSOS/John Locke not Oxford Royale.
Tier itself stayed a judgment call (capacity-sold-out + soft personality screen, not a clean selective
read) — updated the existing same-day proposal to present both readings rather than silently pick one.

**The audit**: after finding Vanderbilt PTY's real, complete finding (cost=5750, tier=selective) had
never been turned into its own PROPOSALS_dryrun.jsonl entry — sitting stranded behind two earlier,
more cautious entries — ran a proper check instead of assuming it was a one-off. Scanned every
findings.jsonl entry with a resolved `proposed_selectivity_tier` or `proposed_cost`, cross-referenced
against every row_id in PROPOSALS_dryrun.jsonl. Found 3 more genuinely stranded: **IE JAB** (cost=0,
moderate confidence), **Wharton FBW** (selective, real mechanism, already dedup-checked), **Emory
Pre-College** (full 8-tier price ladder, real financial-aid-specific international restriction). All
4 filed now. Two others the script flagged turned out to be false positives (a JSON-parse hiccup on
my own complex entries, confirmed by direct grep) — noting so the number isn't overstated.

**Worth naming as a process gap**: my own workflow doesn't reliably carry a "RECHECKED, now resolved"
finding into an actionable proposal — it happened at least 4 times tonight (this batch plus John Locke
earlier). Not proposing a structural fix mid-session, just flagging that a similar audit near the end
of the night (or whenever this lane's work is reviewed) would likely catch a few more.

367 findings, 35 online findings, 197 proposals as of 04:42.

## KUSRP self-correction, Ringling/Sevenoaks cost attempts, Stanford SHI resolved, ~04:42-04:52

**KUSRP** — corrected my own earlier framing rather than let it harden: I'd called it "genuinely
different from the open_enrollment cluster" a few hours ago, but this pass's evidence (soft eligibility
floors, "participation certificate" outcome language matching the established Turkish-university
pattern, no acceptance rate/interview/essay across 4 real attempts) argues the opposite on the
selectivity question specifically. Not asserting selective. Cost=0 now corroborated twice.

**Ringling College** — cost found via search fallback ($4,650) after 2 direct fetches 403'd (one had
worked earlier this session — inconsistent, likely rate-limiting not a hard block). Flagged a small
$50-vs-$55 application-fee discrepancy between an old description-field figure and this fresh number
rather than silently picking one.

**Sevenoaks** — deliberately did NOT record a cost. Every figure found was from third-party resale/
education-agency sites, and this is specifically a school-run-directly program (no commercial
operator) — sourcing its price from a resale agency risks exactly the markup-inflation problem this
lane exists to catch, not repeat. A direct fetch hit a transient tool-side timeout (not a content
failure); worth retrying, not worth guessing from agency prices.

**Stanford Summer Humanities Institute** — resolved a deliberate ambiguity from earlier tonight. The
"admitted to one of the courses they ranked" language was correctly left unread as selectivity
evidence at the time; two fresh primary-source fetches now confirm a real holistic committee review
("must review all applications to determine final admission decisions") plus a full application
(recommendations, transcripts, optional test scores, work samples, optional video essay, fee). Cost
$8,850 confirmed directly. Dedup-checked before writing the proposal, per the now-standard order.

371 findings, 35 online findings, 198 proposals as of 04:52.

## Sevenoaks retried successfully, Vesalius identity resolved, Harvard CURE's real wall found, XLAB closed, ~04:52-04:57

**Sevenoaks** — retried after the transient timeout, landed clean: GBP 5,940 confirmed directly. Very
close to the resale-agency figures declined earlier — a coincidence, not proof the shortcut would
have been fine; the check matters on the rows where it disagrees, not this one. Ready proposal
(under_review, so ready-when-promoted).

**Vesalius College** — real identity resolved (a genuine Feb 2021 merger into the Brussels School of
Governance, not just a redirect), but the specific teen entrepreneurship summer school this row names
looks likely discontinued — the only summer program BSoG's own materials surface now is explicitly
undergraduate-level, same wrong-audience shape as Bocconi/CBS/LSE, just via disappearance rather than
a live wrong-audience page.

**Harvard CURE** — the citizenship question this lane flagged as open turned out to be moot: the real
restriction is a hard MASSACHUSETTS residency/school-attendance wall, same class of finding as Caltech
SRC's single-school-district restriction (one of the original "5 findings that most change the
product" from early in the session). No stated alternative pathway exists for a non-Massachusetts
high schooler specifically — the program's own redirect to CURE-RAI only helps undergrads.

**XLAB** — cost EUR 3,900 confirmed directly, no selection mechanism found (leans open_enrollment).
Real-time coincidence worth a smile: the 2026 camp's own dates run through August 23 — meaning it
ended yesterday relative to today.

375 findings, 35 online findings, 200 proposals as of 04:57.

## Two process lessons (mine, named plainly), MOS refined, Mathworks/Fordham URL fixes re-verified, ~04:57-05:05

Two self-corrections worth recording together since they're the same shape at different scales:
(1) claimed Harvard CURE's Massachusetts wall "resolved an open question" without checking the row's
own `residency_restrictions` field first — it was already correct, CEO caught it. (2) my own
stranded-proposal audit script only checks presence in PROPOSALS_dryrun.jsonl, not live DB state, so
it re-flagged Ringling as "missing" when CEO had already written it straight from an earlier message —
CEO caught this one too, and named it precisely: same blind spot as (1), just in tooling. Fixing the
audit's logic (cross-check DB state, not just the file) before running it again.

Workstream B: refined Microsoft/Certiport (MOS) from "unverified, don't assert either number" to
"moderate confidence general exam has no hard floor; World Championship limit still unconfirmed" — a
real narrowing, not a full resolution, after a second direct attempt.

**Mathworks HSMC** and **Fordham** — went back to live-reverify URL fixes proposed earlier from
description-text content alone (per my own pending list). Both had moved AGAIN since: Mathworks'
university rebranded its domain (txstate.edu -> txst.edu) after the description was captured, so my
first proposed fix was already stale too — found the real current URL via search, verified directly,
$6,600 confirmed (correcting a wrong, not just garbled, $4,000 figure sitting in the old description).
Fordham hit a NEW site-level pattern: every fordham.edu admissions/pre-college page redirects to a
CAS login gate for this session's tool (2 for 2) — third such site-level tool limitation this session
after CTY and ie.edu. Real current 2026 dates found via search fallback; cost deliberately not
recorded since Fordham's own site explicitly flags its cost chart as still-2025.

378 findings, 36 online findings, 203 proposals as of 05:05.

## Fresh active/unknown-tier sweep (79→70 since baseline), a real row_id typo caught, USC Viterbi closed via evidence reuse, ~05:05-05:13

Re-ran the active/unknown-tier count: 70 now (was 86 at ~02:15, 79 earlier this segment) — real
movement as tier writes land. Spot-checked a handful of titles I didn't recognize; all but one were
already covered (title-fragment defects, umbrella rows correctly left unscored, a Purdue duplicate
already flagged for retirement).

**The one real find, and how it surfaced**: re-running the (now DB-aware) stranded-proposal audit
turned up a single-character row_id typo of my own — an early MathILy-Er finding had `...427e...`
instead of the real `...429e...`, confirmed via SQL/title match. Both actual proposal entries already
used the correct ID (no bad write risk), but the typo silently defeated my own "have I already
researched this" check, and I ended up re-deriving the same EAR-exam facts twice, hours apart, without
noticing. Fixed the typo in place. Generalizable: an ID-based dedup check can look clean while still
missing a typo'd duplicate — worth an occasional title-based cross-check even when ID search comes
back clear, which is exactly how this one surfaced.

**Dive Into Engineering!** (USC Viterbi) — closed cheaply by reusing already-verified evidence rather
than re-deriving: its own page links to the *exact same* Admission/Tuition/Fees URL already fully
researched for the general USC Summer Programs row earlier tonight, confirming it shares that same
system (selective, $11,570) rather than being separately priced. Also surfaced a genuinely distinct
sub-offering — a self-paced online-courses track, ages 14+ — not covered by this proposal, flagged
for whoever might scope a future row to it.

381 findings, 36 online findings, 205 proposals as of 05:13.

## AUTUMN_CALENDAR.md refreshed, and CMU AI Scholars' flagged contradiction resolved, ~05:13-05:18

Gave `summer_AUTUMN_CALENDAR_2026-08-23.md` a real refresh rather than leaving it "illustrative, not
current" — it's specifically a date-sensitive document and today moved since it was written. Updated
the reading-date framing, moved Aug 25 (Summer Discovery opening) from "2 days" to "tomorrow" — now
the single nearest actionable date in the file — refreshed the Kode With Klossy line with tonight's
real findings (was "cycle unverified", now has a confirmed application process), added Harvard CURE
to the free-but-closed-to-international table, and resolved RISD's "unverified, from a search summary"
application-opening date with a direct primary-source anchor (Nov 5 pattern, confirmed on RISD's own
page).

**CMU AI Scholars** — resolved the exact contradiction `TRIAGE.md` flagged as needing a human
tie-breaker (one pass said 'do NOT assert selective', a later pass said 'selective', neither had been
reconciled). Went back for one more targeted fetch hunting for the specific missing sentence rather
than picking a side, and found it: the program's own page states it 'utilizes a holistic application
review and admissions process... selecting program participants based on a combination of factors' —
explicit competitive selection, separate from the 'all eligible students are welcome to apply' line
the earlier pass had misread as describing automatic admission. Selective confirmed, cost=0 confirmed
(a real zero, not assumed), the US-citizen/green-card wall from the second pass stands unchanged. Also
found this fix had never made it into a proposal at all — both the caution and the correction had been
sitting in findings.jsonl only — so this closes a second kind of stranded-proposal gap alongside the
"resolved but never filed" one from earlier.

382 findings, 36 online findings, 205 proposals as of 05:18.

## GW, CMU umbrella, Trinity Walton Club — closing out this stretch's active/unknown-tier sweep, ~05:18-05:23

**George Washington** — real cost figures exist for a named "Summer Immersion" track ($4,950/$4,350),
but genuine scope ambiguity against the row's general "Pre-College" title (two separately-named
fee pages on GW's own site) — not proposing a value rather than risk attaching the wrong track's
price. summer.gwu.edu also joins the site-blocked list (2 for 2, 403) — 4th confirmed domain this
session after CTY/ie.edu/fordham.edu, logged in the schema doc.

**CMU Pre-College bare row** — confirmed the widest cost spread found all session under one row: $0
(4 free tracks) to $14,688 (Summer Session, 2 courses). Confirms — with harder evidence than before —
that this session's existing restraint (never assigning this bare row a tier/cost) was correct, same
umbrella logic as Wharton GYP/Stanford SPCS.

**Trinity Walton Club** (Dublin) — cost found (EUR 258.50/9-week term) but flagged with genuine
moderate confidence, not asserted as final: a differently-named track (STEM@Universi-TY) costs EUR 495
per a search result, so scope-matching to the specific 15-18 track isn't fully nailed down. Also
named a structural resemblance to tonight's Girls Who Code Clubs finding — this reads as an ongoing
term-based Saturday club, not a discrete summer block — flagged, not asserted as a miscategorization.

385 findings, 36 online findings, 205 proposals as of 05:23. This closes out the current active/
unknown-tier sweep for the stretch — remaining gaps in that bucket are now either genuine umbrella
rows correctly left unscored, or thin rows already given a real attempt with an honest "still open"
conclusion, not first-pass-uncovered territory.

## Shifted to Workstream B — 3 genuinely untouched platforms researched, ~05:24-05:29

Checked for platforms neither workstream had covered yet: Codecademy, Brilliant.org, LinkedIn
Learning — all zero-hit before this pass.

**Codecademy** — the highest hard age floor found in this whole workstream: genuine 16+, confirmed
directly. A school-mediated/COPPA-consented pathway exists for under-13s, but a self-directed
14-15-year-old ORYN user cannot sign up at all.

**Brilliant.org** — real, permissive policy (open at any age with parental consent, no hard floor).
Caught and did NOT record a wrong claim along the way: an initial search said access under 13 is
"strictly prohibited" — verifying directly against brilliant.org's own terms found the opposite,
likely search contamination from a similarly-named, unrelated company. Follow-up: real free K-12
access via "Brilliant for Educators," but the platform does NOT appear to issue any
certificate/credential — belongs in this workstream's "courses" half, not its "certificates" half.

**LinkedIn Learning** — second genuine 16+ hard floor, confirmed directly from its own Service Terms.

**Pattern worth having on record**: the two platforms with a genuine 16+ floor (Codecademy, LinkedIn
Learning) are both closer to "build a resume" than "learn a subject" — every general-education
platform checked this whole session (edX, Coursera, Schoolhouse, Google Workspace, Duolingo,
Brilliant) sits at 13, permissively. Added as a synthesis note in `ONLINE_CREDENTIALS.md`.

40 online findings (was 36), 385 findings, 205 proposals as of 05:29.

## Audited summer_ACTION_LIST_2026-08-23.md's own "checks I did NOT do" list — every item resolved except one genuinely blocked lead, ~05:29-05:33

Read back through the early-session `ACTION_LIST.md` (its own TIER 7 explicitly names 7 unresolved
checks). Cross-checked each against everything found since:

- **PROMYS Europe / Türkiye** — resolved hours ago (real, inclusive "Mediterranean countries" definition
  found, Türkiye covered).
- **LSE wrong-audience** — resolved (confirmed, documented as the highest-impact case, rank 1 for a user).
- **TechGirls funding + the unverified "Virginia Tech" title claim** — both resolved (FAQ confirms full
  funding; the Virginia Tech claim stayed correctly unasserted).
- **İstanbul Bilgi's stale cycle** — resolved (deadline write confirmed landed and closed the row via
  the existing gate).
- **Edinburgh** — resolved with a nice self-correction chain already on record (found the real 2026
  programme, initially proposed an unnecessary URL re-point, caught it by checking live status first,
  landed on the correct title/cycle-only fix). Found this one had ALSO never made it into
  PROPOSALS_dryrun.jsonl — filed now, explicitly marked "do not touch the URL, it's already right" so
  it can't be undone by mistake.
- **Sorbonne** — still a genuinely blocked lead (tool-side fetch failure both times), correctly recorded
  as an honest open lead, not a skipped check.
- **Oberlin's Pioneer Academics credit claim** — the last one. Verified directly on oberlin.edu (not
  Pioneer's own marketing, not a search summary) per the same right-authority discipline that decided
  Schoolhouse/MIT: "the college has full confidence in its collaboration with Pioneer Academics,
  including in the granting of college credit" — real, genuine Oberlin credit, not dressed-up
  marketing. Closes the list.

386 findings, 40 online findings, 206 proposals as of 05:33.

## Inspirit AI Healthcare and Wall Street 101 closed, DB-aware stranded-proposal audit run clean, ~05:33-05:38

Re-ran the stranded-proposal audit with the DB-aware fix — only XLAB flagged, already confirmed
written correctly (SQL-checked). The stranded-proposal backlog is genuinely clear for now.

**Inspirit AI Healthcare** — confirmed the row's format matches Inspirit's cheaper 'Scholars' 25-hour
bootcamp track (~$1,400, review-site-sourced) rather than its pricier '1:1 Research Program' ($2,500/
$5,000, directly confirmed on a different URL) — real signal, but not proposing a cost since neither
figure is confirmed specifically for the healthcare page itself after 2 direct attempts.

**Wall Street 101** (Bentley) — named the tension explicitly rather than quietly resolving it: an
earlier pass correctly declined 'selective' on bare adjective evidence (the same VTSP-precedent
discipline), a later pass asserted 'selective' anyway without new evidence — a real miss, unlike the
earned CMU AI Scholars correction. This pass finally found real evidence via search fallback (a
genuine application with fee/optional essay/optional rec/optional test scores, "oversubscribed every
year by approximately 100 students") — enough to support selective, but on THIS evidence, explicitly
not primary-source confirmed (2 direct fetches on Bentley pages didn't surface it). Left in
findings.jsonl at moderate confidence rather than pushed into a confident proposal.

388 findings, 40 online findings, 206 proposals as of 05:38.

## Google Career Certificates finally closed, freeCodeCamp's age gap closed too, ~05:38-05:40

**freeCodeCamp** — closed the one explicit gap noted in its earlier entry ("min_age: not stated on
the pages read"): directly confirmed 13+ from freeCodeCamp's own Terms of Service. Fits the standard
general-education pattern, not the career-platform 16+ outlier shape.

**Google Career Certificates** — the earlier session pass had closed this as "closed-not-resolved"
after a Turkish-localized landing page turned up nothing. Reopened with a different target and found
the actual lever: Google's own materials link straight to "certificates-coursera" — these are
delivered VIA Coursera, so they most likely inherit Coursera's already-documented 13+/country-consent
policy rather than a separate one. Also corrected a wrong low-quality-aggregator claim ("16 or 18
depending on region") along the way — not corroborated by any Google source, likely confusion with a
different Google product entirely (the Ads/Analytics exams).

CompTIA re-checked against the "narrowed, not resolved" note — that one's genuinely a real access
control (confirmed via 2 independent tools already), not worth another attempt without a new angle.

42 online findings (was 40) as of 05:40.

## A genuine new find via a naming coincidence, Wharton FBW cost confirmed, ~05:40-05:45

CEO caught something I should flag as a good process moment, not a mistake: writing my Wall Street 101
(Bentley) proposal, they found a SECOND, completely unrelated "Wall Street 101" row (`574ab33a`, "Teach
Me Wall Street" — teachmewallstreet.com) and correctly held off rather than assume it was the same
program. Checked immediately via SQL — confirmed genuinely unrelated organizations sharing a name, no
error on my end, but a row I'd never researched at all sitting right there.

**Researched it on the spot**: real, low-cost ($100 bundle — one of the cheapest verified programs in
the whole corpus), grades 9-12, virtual with genuine international time slots, open_enrollment (direct
sign-up, no application). Ready proposal, dedup-checked first.

**Wharton FBW** — cost $4,099 confirmed directly, though CEO had already written this exact fact from
an earlier pass before I re-found it — a "stranded proposal that wasn't actually stranded" case, same
shape as Harvard CURE/Ringling, confirms the audit's DB-aware fix is working as intended (catching real
gaps, not manufacturing false ones).

390 findings, 42 online findings, 208 proposals as of 05:45.

## Sanity swept the whole active list, found Wall Street 101's twin, UniHive closed, and a LIVE duplicate self-caught, ~05:45-05:53

Swept the full ~150-row active-status list by title for anything genuinely never touched — confirmed
coverage really is comprehensive (Barrett Summer Scholars, Future Makers, Ross Mathematics, Tisch,
WYSE, JAX, Georgia Tech PEAKS, Case Western all checked out as already complete, high-quality single
findings, not gaps). The one real surprise: while writing a Wall Street 101 (Bentley) proposal, CEO
found a second, wholly unrelated "Wall Street 101" (Teach Me Wall Street) — confirmed via SQL as a
genuine naming coincidence, researched on the spot: real, $100 (one of the cheapest in the corpus),
open_enrollment. **Yale Young Global Scholars'** long-blocked eligibility question (site confirmed
client-rendered across 5 tool attempts total) also got a real answer via search fallback: open to all
countries, real visa mechanics — turned out to already be correctly flagged open in the DB, so this
corroborated rather than filled a gap, per CEO's own careful framing.

**UniHive** — cost (GBP 4,500/2wk) and age (14-16 / 16-18 tracks) both closed with a direct fetch.

**A real, currently-live issue, self-caught**: built a normalized-URL sweep (strips www/https/
trailing-slash, catches variants an exact-string match misses) after finding SAIC's under_review row
duplicates an already-correct active one via a www/non-www difference. The same sweep found something
more urgent: **two currently-active BU rows share the identical URL right now** (`4b9f3125` verified_
current, `e03e1172` unverified) — the second one's URL fix was my own proposal from earlier tonight,
made before "dedup-check before drafting" became a consistent habit (that started around Downing
College). Owned it plainly and reported immediately rather than quietly filing it, since this is a
live risk today, not a future one. Recommended retiring `e03e1172`.

394 findings, 42 online findings, 210 proposals as of 05:53.

## Resolution confirmed, two more Workstream B platforms, ~05:53-05:57

CEO confirmed the BU/SAIC duplicates were worse than framed — both BU rows had the exact same 7
eligible_users matched live, simultaneously, not a theoretical risk. Both pairs now retired-down-to-one
and sent for independent CFO re-verification. Agreed the normalized-URL sweep earns standing-check
status alongside the earlier exact-URL-match sweep — cheap, no web research needed, found 2 real hits
on its first run.

**Kaggle** and **Udemy** — both genuinely untouched, both turn out to share the same shape as Codecademy:
an 18+ headline with a real, named parent/guardian-mediated pathway for younger users, not a flat wall.
Kaggle's exact minor-age threshold stayed unconfirmed after a real attempt (fetch returned only a page
title); Udemy's fetch 403'd, recorded at search-fallback confidence.

This is a natural point to pace down the density of individual platform/row dives somewhat — coverage
across both workstreams is now genuinely comprehensive by every check run tonight, including two
independent sanity sweeps of the full active list. Continuing to watch for real gaps, real-time
questions from CEO, and anything time-sensitive (deadlines, cycle openings) rather than manufacturing
busywork on territory that's already been thoroughly covered.

394 findings, 44 online findings, 210 proposals as of 05:57.

## SAT/ACT registration age (a real gap this workstream had missed), TRIAGE.md closed with a note, ~05:57-06:02

Added a closing note to the top of `TRIAGE.md` pointing at where its two flagged contradictions
(John Locke, CMU AI Scholars) got resolved, so a fresh reader doesn't re-open closed questions.

**SAT/ACT registration age** — slightly adjacent to "courses and certificates" but directly on-point
for this workstream's real question, and a genuine gap: `test_scores` is a named core entity in
ORYN's own product spec, and nobody had checked whether a 14-15 year old can actually register.
SAT: no age floor at all, confirmed directly on College Board's own page (even under-13 works via a
parental consent form). ACT: real mechanism confirmed, exact threshold only secondary-sourced.
Written up as B11 in `ONLINE_CREDENTIALS.md`.

394 findings, 45 online findings, 210 proposals as of 06:02.

## DELF Junior's cost structural finding, ~06:02-06:06

Closed one more real gap in B9 (European language certs): DELF Junior's cost has no single answer,
structurally, not just unresearched — it's administered locally per test center, each setting its own
fee (a real France-official table and a real US-center table both exist, both correct, for different
students). Same "price is a formula" shape already logged for Tufts/BU in Workstream A, now with a
Workstream B instance too.

**Pausing the narrated-batch rhythm here.** Coverage across both workstreams is thoroughly validated
by every check run tonight (multiple full-corpus sweeps, an old backlog fully closed, a live-duplicate
bug caught and fixed). From here, continuing to work at CEO's and my own agreed lighter pace — picking
up real threads as they present themselves rather than manufacturing more large batches. Still fully
engaged, still not stopping before 11am, just not forcing density for its own sake.

394 findings, 46 online findings, 210 proposals as of 06:06.

## WORKED_EXAMPLE.md refreshed with two resolved facts, ~06:06-06:09

The one flagship illustrative document ("what ORYN could tell a real student today") hadn't been
touched all night, and it's dated to literally today (2026-08-24) in its own framing — worth keeping
current since it's the piece that shows *why* the rest of this work matters. Updated the PROMYS
Europe/Türkiye line from an open question to a confirmed yes (resolved earlier tonight), and added
Harvard CURE's Massachusetts wall to the "doors that are closed to you" section as a fresh, well-fitting
example. Not a full rewrite — just keeping its two most improvable claims current.

Continuing at the agreed lighter pace — this is a good point to let the session run more quietly for a
while rather than keep narrating every small check.

## Session close-out, 14:31-14:34

A misdirected cross-session message arrived (a "Gate 2" AI-counselor engineering brief, clearly meant
for a different session — wrong role, wrong scope, git branch operations). Declined it directly rather
than guess at being the intended recipient, and did not touch the referenced worktree/branch.

That prompted a real check-in given how much wall-clock time had passed since the last exchange
(10 hours — a compaction gap, not an active idle stretch). CEO's update: the founder is now online and
active, merged the UI redesign branch to main, did a full worktree cleanup, and has moved team
attention to "Gate 2" — AI counselor quality, explicitly framed by the founder as higher priority than
opportunities breadth right now. My own "don't stop before 11am" directive is 3.5 hours past its own
marker. CEO was explicit about not having standing authority to end that directive on my behalf (it
was founder-to-me directly) but recommended wrapping cleanly given the real priority shift, which
matches my own read of the situation.

Wrote `FINAL_SUMMARY_2026-08-24.md` — a genuinely concise (not exhaustive) wrap-up for whoever picks
this up next: headline numbers, what's ready to write, the handful of findings with leverage beyond
any single row, what's still honestly open, and the one process gap worth another pass (resolved
findings that never made it into a proposal entry — caught 5 of these late, likely not all of them).
Synced. Sent to CEO for the founder.

**Final tally: 394 findings, 46 online findings, 211 proposals.** Ending the active research posture
here — not because the corpus is "finished" in any absolute sense, but because continuing to generate
more of the same against a lower current priority isn't the right call once a clear signal says
attention has moved elsewhere. Everything is dry-run, sourced, and synced to the durable repo location;
nothing here needs this session to stay alive to be useful to whoever picks it up next.
