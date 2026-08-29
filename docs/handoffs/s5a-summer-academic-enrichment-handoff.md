# S5A — Summer / Pre-College / Academic Enrichment — Handoff

Written 2026-08-26/27. Branch `oryn/s5a-summer-academic-enrichment`. No production writes were made at
any point — everything below is dry-run proposal data in `data/research/opportunities/s5a_batch*.jsonl`
and the claims shard `data/research/registry/claims_s5a.jsonl`.

## STATUS

Stopping at a natural checkpoint, not because the assigned scope is exhausted. Both halves of the
reweighted strategy (gap-closure on existing rows + new-discovery from the seed PDFs) were worked in
parallel across 7 pushed commits. Quality/evidence discipline was prioritized over raw count the whole
way through, per Contract §13/§14 and the CEO's Part 4 reweighting. A large amount of gap-closure
surface remains (see KEY GAPS) — this is a real, substantive first pass, not full coverage of the
149 active + 87 under_review `summer_program` rows.

## ASSIGNED SCOPE

S5A = categories 1-3 of the S5 mission: summer schools, pre-college academic programs, selective
academic enrichment. Explicitly NOT university research programs / mentored research / research
internships (S5B's territory — confirmed zero canonical-entity overlap with S5B's 29 pushed records
during the cross-review below). Per the CEO's Part 4 reweighting, split roughly evenly between:
**(a) gap-closure** on existing `active`/`under_review` `summer_program` rows missing
eligible_countries/deadline/cost, and **(b) new-discovery** from the 3 seed PDFs, expanded via web
search, only where genuinely not already one of the ~253 existing rows.

## PRODUCTION-READY COUNT

**28** (of 38 total records produced). All have first-party evidence for the Turkey-access gate;
23/28 additionally have a verified real photo (see IMAGE COMPLETE COUNT).

Breakdown by `turkey_student_access`: 24 `VERIFIED_ELIGIBLE`, 4 `ELIGIBLE_WITH_CONDITIONS` (Telluride
TASS — international applicants must be sophomores, a real grade condition; Northwestern CTD — Türkiye
is not one of the four named ASSET talent-search partner countries; Emory Pre-College — admission open
but international students explicitly excluded from need-based aid; ODTÜ/METU carries a cost/organizer
caveat but the eligibility question itself is clean).

Breakdown by type: 26 gap-closures (existing DB rows upgraded from `verified_current`/`unverified` with
no Turkey-access field at all, to a fully evidenced, sourced verdict), 2 net-new discoveries (PROMYS
Europe, University of Amsterdam Pre-University Honours Programmes).

## CANDIDATE COUNT

**2** — St. Stephen's School Rome Arts and Humanities Summer Program (Turkey-access resolved, but cost
and exact current dates unresolved after a failed direct-fetch of sssrome.it) and BRAND-ED (an
already-live, `under_review` umbrella row — confirmed it covers 4 differently-branded, differently-
priced, differently-aged sub-programs; facts sourced from a seed document rather than an independent
re-fetch of branded-edu.com this session).

## REJECTED COUNT

**1** — American Legion Boys State, `NOT_ELIGIBLE`. Not a stated citizenship bar but a structural one:
selection runs through nomination by the student's own high school to a *local* (US state-based)
American Legion post, with no pathway from a school outside the US. Corroborates (via fresh,
independent state-affiliate-page checks this session) the identical finding already on record in the
prior lane's `summer_schema_and_pipeline_gaps_2026-08-24.md` (item #9).

## BLOCKED/UNCLEAR COUNT

**7**, each a genuine, evidence-based ambiguity rather than a placeholder:
- **Barrett Summer Scholars** — two official ASU pages are silent on residency, but 3 independent
  secondary aggregators specifically claim Arizona-residents-only. Aggregators aren't authoritative
  (Contract §3); official silence isn't confirmation either. Unresolved.
- **Copenhagen Business School Summer University** — likely audience mismatch (its own page describes
  a mix of exchange students/professionals, not high schoolers); corroborates the prior lane's
  Bocconi/CBS finding rather than newly discovering it.
- **Istanbul Bilgi University Lise Yaz Okulu** — official page is stuck at 2025-cycle content 14+
  months into 2026, unlike every other Turkish-university row checked this session (İTÜ, Koç, Sabancı
  all show live 2026 content). Genuine anomaly, not smoothed over.
- **LSE Summer School** — same audience-mismatch risk as CBS, but this session's fetch returned only a
  closure notice, not an eligibility statement, so it's an *incomplete-research* flag, not a confirmed
  conflict.
- **JAX Summer Student Program** — genuine silence on international eligibility (not a stated bar).
- **UT Austin WiSTEM** — broadly inclusive language and a virtual track exist, but the online track's
  timezone attendability from Türkiye (UTC+3 vs. Austin Central) was never confirmed.
- **University of Bath: Step into Bath** — no nationality bar, but eligibility is written entirely in
  UK Year-12/A-level terms with no stated equivalence path for a non-UK curriculum, and it's explicitly
  the *less* restricted of the university's two summer programs (contrasted against the more clearly
  UK-only Discover Bath).

## IMAGE COMPLETE COUNT

**23/28 (82%)** of PRODUCTION_READY records have a directly-verified (subject + license confirmed via
a live Commons file-page fetch, not assumed from a search snippet), real, non-logo photo. The
remaining 5 are `NEEDS_SOURCING` for a specific, named reason each, not oversight:
- **Canada/USA Mathcamp, Telluride TASS, NSLC Business & Entrepreneurship** — all three relocate to a
  different host campus/city each year; no single truthful "host campus" photo exists without first
  confirming that year's specific host.
- **UWC Short Courses** — umbrella row over many independently-organized courses at different UWC
  colleges worldwide; no single venue to depict.
- **Sabancı University Summer School** — genuine search miss: Wikimedia Commons has the university's
  logo but no free-licensed campus photo as of this session.

One image is flagged as dated rather than wrong: the METU/ODTÜ record uses a real but archival
(1961-1980) black-and-white library photo — correctly attributed and licensed, but a current color
photo would be preferable if revisited. One image (Radcliffe Camera) is deliberately reused across two
records with different `image_depicts` values: `venue` for Oxford Scholastica Academy (an independent
commercial provider, NOT part of the University of Oxford — using `host_campus` there would misleadingly
imply institutional identity) vs. `host_campus` for PROMYS Europe (genuinely Oxford/Wadham-hosted).

## SECOND REVIEW COUNT

**Partially run, ahead of schedule** — S5B had already pushed 4 batches (29 records) by the time this
session reached a natural checkpoint, so a real cross-review was performed rather than left as "not yet
run." Sampled 9 of S5B's 29 records (Polygence, UCSB RMP, SSP, Rockefeller SSRP, Bilimle Tanış/Gebze
Technical University, Algoverse, sci-MI, NASA Citizen Science, Non-Trivial Fellowship, Research Girl —
one over target) against the mission's priority list (Turkey eligibility, current dates, provider type,
third-party-vs-university distinction, cost, image correctness):

- **No factual errors, fabrications, or contract violations found.** Evidence quality, self-flagging
  discipline (e.g. SSP's deadline correctly marked `NEEDS_REVIEW`/secondary-sourced rather than
  first-party, matching my own methodology), and umbrella-avoidance (UCSB RMP explicitly not conflated
  with UCSB's separate Summer Research Academies; sci-MI's Kenya-specific track correctly excluded)
  were all sound.
- **Zero canonical-entity overlap** between my 38 records and S5B's 29 — confirmed by name comparison.
  Rockefeller SSRP appears in both my own initial gap-list (as an existing `summer_program`-categorized
  DB row I *deliberately did not touch*, citing prior-lane coverage) and S5B's output (as a `research`-
  categorized proposal) — not a conflict, since S5B's write-up is a distinct proposed recategorization,
  and the specific facts (deadline 2026-01-02, 4 teams of 8-10) match the DB's existing values exactly.
- **Two minor, non-blocking nits worth a second look, not a downgrade:** (1) Algoverse's own narrative
  says "high-but-not-maximal confidence" but the structured `source_confidence` field is set to plain
  `"high"` — a small internal calibration mismatch. (2) Non-Trivial Fellowship's `cycle_status` is
  `"not_yet_open"` alongside already-published concrete deadline dates (priority 2026-12-22, final
  2027-01-12) — plausible (today's date is well before that window) but worth confirming the
  application portal's actual live/not-live state before treating as settled.
- **Shared open item, not unique to S5B:** all 9 sampled S5B records have `image_verified: false` — the
  same image-sourcing gap I closed for my own batch late in this session. Worth flagging to S5B/CEO as
  a shared to-do rather than a defect specific to either lane.

I have not asked S5B to review my output in return (per the brief, that coordination happens
separately once both sides are ready) — but my 38 records and this handoff are pushed and readable now
if S5B or CEO want to do so.

## DUPLICATES FOUND

- **"Anson L. Clark Scholars Program" (status `active`) vs. "Clark Scholars Program" (status
  `disabled`)** — near-certainly an exact duplicate pair (same Texas Tech program, same seed-PDF
  entry). Flagged for CEO/DATA to merge/retire; not fixed by me since Clark Scholars is a mentored-
  research program (S5B's territory), not mine to gap-close.
- **BRAND-ED** (see CANDIDATE COUNT) — one DB row silently covering 4 distinct sub-brands (School of
  The New York Times, Vogue College of Fashion, Sotheby's Institute of Art, Man City Sport Business
  School) with different subjects, cities, currencies, and even a different age floor for one track.
  Not a duplicate in the traditional sense but the same root problem as one.
- **Johns Hopkins CTY** — confirmed (not newly discovered) umbrella-row structure: the existing single
  "Johns Hopkins CTY Summer Residential Program" DB row stands in for dozens of distinct CTY tracks
  (Civic Leadership Institute, Intensive Studies for 7th Graders and Above, Institute for Advanced
  Critical and Cultural Studies, etc.) at different host campuses, ages, and price points, found while
  reading seed PDF #2. Did not split this into separate rows (would violate Contract §13's
  anti-fragmentation rule) — flagging the structural issue instead.
- Seed PDF mining (all 3 documents, ~180 combined candidate lines) surfaced remarkably little genuine
  net-new territory: the two smaller PDFs turned out to be almost entirely already-covered ground
  (RSI, Mathcamp, PROMYS, Ross, Wharton, CTY variants, Georgetown, Barrett, etc. all already
  live/under_review) — consistent with the CEO's read that raw new-discovery in this category is
  low-leverage. Only 3 genuinely new candidates emerged from ~146+32+20 pages of seed material (PROMYS
  Europe, University of Amsterdam, St. Stephen's Rome) plus 1 flagged umbrella (BRAND-ED).

## POST-COMPLETION DEDUP FOLLOW-UP (added by S5 parent, 2026-08-27)

S10/CFO relayed a methodology finding from S5B (verified against their commit `d030afb` before
acting on it): a dedup check scoped to a single category can miss an entity that already exists
live under a *different* category — S5B's own check, scoped to `category IN ('research',
'internship')`, missed 8 candidates already live under `summer_program`. The same blind-spot risk
applies here in principle, though S5A's exposure is much smaller since 26 of 28 production-ready
records are gap-closures on rows already correctly filed under `summer_program` by construction —
only the 3 genuinely new candidates were at risk (they'd only been checked against
`summer_program` specifically).

The original S5A sub-agent's session was no longer resumable (transcript unavailable) by the time
this follow-up was requested, so the S5 parent ran it directly: a full-table (no category filter)
`ILIKE` search against `title`/`organization` for each candidate's distinctive terms.

- **PROMYS Europe** — searched `promys`/`amsterdam`/`stephen`/`honours`/`honors` across the full
  `opportunities` table. One hit: `PROMYS (Program in Mathematics for Young Scientists)`,
  organization Boston University, `category='summer_program'`, `status='active'`
  (`6a56a106-64c3-40c3-a58c-563cc9b6ec69`). **Confirmed genuinely distinct, not a duplicate** —
  this is the original US program at Boston University; PROMYS Europe is a separate, Oxford/
  Wadham-hosted sister program (consistent with this handoff's own IMAGE COMPLETE COUNT note that
  PROMYS Europe's photo is Oxford-based). Same pedagogical model, different institution, country,
  and presumably application pool — a legitimate separate canonical entity per Contract §7, not a
  cross-category miscategorization.
- **University of Amsterdam Pre-University Honours Programmes** — no match under any searched
  term. Not already live under any category. Clean.
- **St. Stephen's School Rome Arts and Humanities Summer Program** — no match for `stephen`
  anywhere in the table. Not already live under any category. Clean.

**Result: all 3 candidates confirmed clean, no cross-category duplicates found, no corrections
needed.** Nothing in the 28 PRODUCTION_READY count or the 2 CANDIDATE records changes as a result
of this follow-up.

## KEY GAPS

- **Volume remaining**: of the 236 active/under_review `summer_program` rows missing
  eligible_countries/deadline/cost identified at session start, this pass resolved 34 (26 gap-closed +
  the 2 CANDIDATE-status new items don't count here) — a substantial but partial dent. A full list of
  the ~35 further `verified_current` rows not yet attempted, plus the much larger `unverified` bucket
  (which needs more from-scratch work per record, not just a gap-fill), is recoverable by re-running
  the same SQL query in the brief (`SELECT ... WHERE category='summer_program' AND status IN
  ('active','under_review')` filtered on missing fields) against the live DB.
- **Attempted-but-inconclusive this session** (genuine fetch attempts, no usable new evidence found —
  don't re-attempt blindly, but also don't assume permanently unresearchable): Georgia Tech Summer
  PEAKS, Iowa Young Writers' Studio, MathILy-Er, Rutgers Young Scholars (DIMACS), Tufts Pre-College,
  Colorado School of Mines Engineering Design Camp, Emerging Engineers @ UVA (403-blocked), NYLF
  Medicine & Health Care, Oxbridge Academic Programs, RISD Pre-College, Ross Mathematics Program,
  Sorbonne Université Summer University, Vanderbilt PTY, Case Western Reserve Online Pre-College.
  Several of these hit transient rate-limit/timeout errors rather than genuine dead ends — worth a
  fresh attempt before concluding the evidence doesn't exist.
- **CTY and BRAND-ED umbrella-row structural fixes** are a DATA/schema decision, not a data-fixing one
  — flagged, not resolved.
- **Turkish-university page freshness is inconsistent**: İTÜ, Koç, and Sabancı all show live 2026
  content; Istanbul Bilgi is stuck at 2025; ODTÜ is mid-organizer-transition (2025 run by a commercial
  operator, 2026 reportedly moving to a university radio station). A systematic re-check of all
  Turkish-university summer programs closer to the typical spring registration season (roughly
  March-June) would likely resolve several of these cleanly.
- **Image sourcing** stopped at 23/28 for structural reasons (traveling/umbrella programs, one genuine
  search miss) — see IMAGE COMPLETE COUNT. Should be revisited if/when those programs' current-year
  host institutions become confirmable.

## KEY UNCERTAINTIES

- Whether "Anson L. Clark Scholars Program" / "Clark Scholars Program" really are the same program
  under two DB rows, or a legitimate reason exists for both to exist (not independently confirmed —
  flagged on name/seed-document-recurrence pattern alone).
- Whether CBS Summer University and LSE Summer School are genuinely miscategorized (university-audience
  products sitting in a high-school-facing category) — plausible and partially evidence-backed, but not
  fully confirmed for either.
- Whether Barrett Summer Scholars is really Arizona-residents-only (aggregator claim, unconfirmed at
  primary source) or genuinely open and simply undocumented on the two official pages checked.
- Whether the stale, 2018-dated UWC "Connecting Borders" short course (hosted in Türkiye, ages 16-18,
  Europe/Middle East eligible) has ever been revived in any form — found by accident while
  cross-referencing UWC Short Courses, explicitly NOT presented as current, recorded for the next
  researcher's benefit.
- Whether a Türkiye-based applicant without an ASSET Talent Search score can realistically gain
  admission to Northwestern CTD's residential programs via SAT/ACT/PSAT alone, and what CTD's visa
  process for a 3-week residential stay actually looks like.

## FILES CREATED/UPDATED

- `data/research/opportunities/s5a_batch1_2026-08-26.jsonl` through
  `s5a_batch6_2026-08-26.jsonl` — 38 total records (6 files; batches 2-6 were edited in-place once,
  after initial creation, solely to backfill verified `image_proposal` fields — see commit `e68eb4b`).
- `data/research/registry/claims_s5a.jsonl` — 38 append-only claims entries (`S5A-0001` through
  `S5A-0038`), one per JSONL record, per the CEO control-tower's registry schema.
- `docs/handoffs/s5a-summer-academic-enrichment-handoff.md` — this file.

No other files were touched. `docs/ORYN_WORKSTREAMS.md` and
`docs/handoffs/s5-turkey-academic-opportunities-brief.md` were read but not modified, per instruction.

## COMMITS

On `oryn/s5a-summer-academic-enrichment`, oldest to newest (all pushed):
1. `cc89d20` — S5A batch1: gap-closure dry-run for 9 existing summer_program rows
2. `708d264` — S5A batch2: gap-closure dry-run for 11 more active summer_program rows
3. `2262ea2` — S5A batch3: new-discovery from seed PDFs + BRAND-ED gap-closure
4. `dccf35b` — S5A batch4: gap-closure dry-run for 5 more active summer_program rows
5. `eda2319` — S5A batch5: gap-closure dry-run for 7 more active summer_program rows
6. `b7f92df` — S5A batch6: gap-closure dry-run for 2 more active summer_program rows
7. `e68eb4b` — S5A: backfill verified images for 18 production-ready records (batches 2-6)

(plus this handoff commit, pushed immediately after this file is written)

## BRANCH

`oryn/s5a-summer-academic-enrichment` — up to date with `origin` as of this handoff.

## WHAT THE NEXT OWNER SHOULD DO

1. **CEO/DATA**: review and, where independently agreed, promote the 28 PRODUCTION_READY records —
   `turkey_student_access` and the image-provenance fields aren't live schema columns yet (per the
   brief, same blocker as S1-S4's photo work), so this data sits as structured proposals until that
   schema work lands. The 26 gap-closures should be applied as UPDATEs keyed on `opportunity_id`; the
   2 new-discoveries (PROMYS Europe, UvA) as INSERTs.
2. **CEO/DATA**: resolve the BRAND-ED and Johns Hopkins CTY umbrella-row questions (split vs. schema
   change vs. leave as-is) — both are now documented with specifics, not just flagged in the abstract.
3. **CEO/DATA**: merge or retire the "Anson L. Clark Scholars Program" / "Clark Scholars Program"
   duplicate pair.
4. **Whoever continues S5A's gap-closure**: work through the remaining ~35 untouched `verified_current`
   rows, then the much larger `unverified` bucket, using the same SQL-query-then-WebFetch pattern
   documented in this handoff and the commit messages. Retry the "attempted-but-inconclusive" list
   first — several failures this session were transient (rate limits, 403s), not genuine dead ends.
5. **S5B or CEO**: action the two minor cross-review nits (Algoverse's confidence-field/narrative
   mismatch, Non-Trivial's `cycle_status` vs. published-deadline tension) — neither blocks anything,
   both are quick to verify.
6. **Whoever runs the fleet-wide second-review pass**: S5A's own 28 production-ready records have not
   yet been reviewed by S5B or S8 — this handoff documents what *I* checked of S5B's work, not the
   reverse. Worth closing that loop explicitly rather than assuming it happened because this document
   exists.

## CONTINUATION PASS — 2026-08-27 (fresh session, prior session's transcript unresumable)

Written by a new S5A session picking up where the prior one left off. The prior session's own content
above is left untouched as a historical record — this section documents only what changed in this
pass. No production writes were made at any point, same contract as before.

### STATUS

**The entire `verified_current`-tier gap-closure backlog identified in the prior handoff's KEY GAPS is
now closed.** This includes every item on the prior "attempted-but-inconclusive" list (all 14 resolved
with a real verdict — see below) and every other `verified_current` row this pass could locate via the
live-DB query. Stopping at this natural completion point rather than continuing into the `unverified`
bucket, both because that bucket is genuinely lower priority per the prior handoff's own correct
assessment (Contract §14 — quality over count, and the `unverified` bucket needs from-scratch work per
record) and because the coordinating session flagged that the fleet is winding down for the night and
this should be the last batch cycle rather than an open-ended continuation.

### METHODOLOGY THIS PASS

1. Re-ran the live-DB gap query (`category='summer_program' AND status IN ('active','under_review')`
   filtered on missing `deadline`/`cost`/empty `eligible_countries`, restricted to
   `verification_state='verified_current'`, the higher-priority tier) — found **51 rows**, not the ~35
   the prior handoff estimated. The number shifted because the query needed re-measuring live, exactly
   as instructed, rather than trusted.
2. Excluded the 35 opportunity_ids the prior session had already touched (confirmed via each batch
   file's `opportunity_id` field) plus 3 net-new-discovery titles with no DB id — none of the 51 rows
   overlapped with those, confirming the prior session's own dedup was sound.
3. Cross-checked S5B's territory before researching anything: read S5B's own
   `s5b_2026-08-26_MISCATEGORIZATION_FINDING.md` (their final continuation had already completed and
   pushed by the time this pass started), which independently found 8 `summer_program`-categorized DB
   rows that are actually mentored-research/internship programs. Two of those 8
   (`ae174625-...` Summer Science Program, `418217ec-...` Secondary Student Training Program) were in
   this pass's own 51-row candidate list — excluded them since S5B had already gap-closed them.
   Independently (before reading S5B's file) also excluded 6 further rows on the same territorial
   logic: MIT PRIMES, Simons Summer Research Program, Garcia Summer Research Program, Caltech Summer
   Research Connection, Anson L. Clark Scholars Program (a known duplicate, S5B territory per the prior
   handoff), and The Rockefeller University SSRP (already flagged by the prior S5A session as S5B's).
   This left **43 rows** as S5A's actual worklist — S5A and S5B's independent territorial judgment
   agreed on every case checked, a useful cross-validation.
4. Retried the prior handoff's 14 "attempted-but-inconclusive" items first, per the task's own
   prioritization (batch7) — all 14 resolved this time with a real verdict, no further transient
   failures.
5. Worked through the remaining 29 rows in three more batches (batch8: 9, batch9: 9, batch10: 11),
   using the same evidence-first method throughout: official-page WebFetch first, targeted WebSearch to
   fill gaps, a live Wikimedia Commons file-page fetch (not a search snippet) to confirm subject +
   license before attaching any image, and an honest `UNCLEAR`/`NEEDS_SOURCING` recorded wherever
   genuine silence or a connection failure was hit rather than guessed past.

### NEW COUNTS THIS PASS

**43 records processed (`S5A-0039` through `S5A-0081`), all gap-closures on existing DB rows — zero
new-discovery this pass**, consistent with the task's explicit instruction to prioritize finishing the
higher-confidence tier before returning to from-scratch discovery:

- **31 PRODUCTION_READY**
- **3 REJECTED** (`NOT_ELIGIBLE`) — all structural/citizenship bars, not ambiguous calls:
  - **CU Boulder Precollegiate Development Program (PCDP)** and **Washington University in St. Louis
    College Prep Program (CPP)** — both are targeted, multi-year, first-generation-student pipeline
    programs recruiting from specific local school districts (Colorado Front Range counties;
    St. Louis area respectively), not open-application summer programs. Same category as the prior
    session's American Legion Boys State finding — a structural barrier, not a nationality one.
  - **MITES Summer** (MIT) — a clean, first-party-confirmed hard bar: MIT's own apply page states
    "applicants must be United States citizens or permanent residents with a current green card."
- **9 BLOCKED/UNCLEAR** — each a genuine, evidence-exhausted ambiguity, not a placeholder: Georgia Tech
  Summer PEAKS, Rutgers Young Scholars Program (DIMACS), Colorado School of Mines Engineering Design
  Summer Camp, Emerging Engineers @ UVA, NYLF Medicine & Health Care, Aggie STEM Overnight Camp, Future
  Makers (NYU Stern), Idyllwild Arts Summer Program, and Worldwide Youth in Science and Engineering
  (WYSE — an umbrella-row problem, see KEY FINDINGS below).

### CUMULATIVE PRODUCTION-READY COUNT (both sessions combined)

**59** (28 from the prior session + 31 from this pass). All still dry-run proposals in JSONL — none of
this is live in production, same as before.

### IMAGE COMPLETE COUNT THIS PASS

**24/31 (77%)** of this pass's production-ready records carry a directly-verified real photo (subject +
license confirmed via a live Commons file-page fetch): 23 fully cleared, plus 1 flagged
`RIGHTS_REVIEW_REQUIRED` (IE University's Segovia-campus image — the Commons file is captioned "IE
Business School," a related but formally distinct sister institution, and this pass could not confirm
within the session whether the photographed building is genuinely IE University's own). The remaining 7
are `NEEDS_SOURCING` for named structural reasons, not oversight: Oxbridge Academic Programs and Immerse
Education (both span 5+ cities/venues), Ross Mathematics Program (2 concurrent 2026 host campuses),
Global Achievers Academy and AI Summer Week @ ETH Zurich (single-week/multi-venue programs where an
image search wasn't reached this session), Stanford Pre-Collegiate Summer Institutes (intentionally —
the program is fully online, so a Stanford campus photo would misleadingly imply in-person attendance),
and University of St Andrews (a candidate image was found but not verified to full confidence in the
time available).

### KEY FINDINGS WORTH FLAGGING TO CEO/DATA

1. **Two likely currency-label errors** on existing DB records, both caught because this session's
   fresh research matched the existing numeric value exactly once a currency was attached: **AI Summer
   Week @ ETH Zurich**'s cost (500.00 in the DB, confirmed this session as **CHF** 500 from the
   organizer's own Swiss-franc-denominated form — not USD) and **University of St Andrews**'s cost
   (6850 in the DB, confirmed this session as **GBP** 6,850 from the university's own fee page — not
   USD). Both suggest the original number was captured correctly but the currency was assumed rather
   than checked.
2. **Independent cross-validation of S5B's miscategorization finding**: without having read S5B's
   `s5b_2026-08-26_MISCATEGORIZATION_FINDING.md` in advance, this pass independently excluded 6 rows
   from its own worklist on the same "this is actually a mentored-research program filed under
   summer_program" logic S5B used for their 8. Zero disagreement between the two lanes on any case
   either side checked.
3. **A new umbrella-row case**: **Worldwide Youth in Science and Engineering (WYSE)** turns out to
   bundle at least 3 differently-eligible sub-programs under one brand/DB row — Engineering Summer
   Camps (open), Young Scholars Summer STEMM Research Programs (restricted to 7 named US Midwest
   states), and a Chicago-based Digital Scholars Program — and it's unclear which one the single
   existing row is meant to represent. Same structural pattern as CTY/BRAND-ED from the prior session,
   now a third confirmed instance of this failure mode in the `summer_program` category.
4. **A possible deadline-field-mapping issue**: Penn Medicine Summer Program's existing DB deadline
   (2026-06-01) reads like a program *start* date, not an application deadline — this session found the
   actual 2026 application deadline was February 26, 2026. Flagged, not corrected (out of scope for a
   gap-closure record to silently overwrite a differently-meant field).
5. **UVA Emerging Engineers' HTTP 403 is now confirmed persistent, not transient** — blocked identically
   across two independent sessions weeks apart. Future researchers should go straight to a web-search
   workaround rather than re-attempting the direct fetch a third time.
6. **Idyllwild Arts' connection failures this session look genuinely transient** (2x socket-hang-up,
   unlike UVA's clean 403) — worth one more dedicated attempt; a promising but only secondary-sourced
   signal ("35 countries, six continents") is waiting to be first-party-confirmed.
7. **Terp Young Scholars' most consequential claim is secondary-sourced only**: that international
   students can only take the online track (no F-1/I-20/B-visa support for the in-person track) came
   from blog-style aggregators, not umd.edu directly. Recorded with a `low` confidence flag rather than
   dropped, since a restriction this real shouldn't be silently omitted just because the best evidence
   found was secondary — but it needs a first-party re-check before anyone treats it as settled.

### FILES CREATED/UPDATED THIS PASS

- `data/research/opportunities/s5a_batch7_2026-08-27.jsonl` through `s5a_batch10_2026-08-27.jsonl` — 4
  new files, 43 total records (14 + 9 + 9 + 11).
- `data/research/registry/claims_s5a.jsonl` — 43 more append-only entries (`S5A-0039` through
  `S5A-0081`); 81 total in the file now.
- This handoff file (this section only — everything above is the prior session's untouched record).

### COMMITS THIS PASS (oldest to newest, all pushed to `oryn/s5a-summer-academic-enrichment`)

1. `246dc84` — S5A batch7: retry 14 attempted-but-inconclusive rows, all resolved
2. `4d409e5` — S5A batch8: gap-closure for 9 more verified_current summer_program rows
3. `c85dc2c` — S5A batch9: gap-closure for 9 more verified_current summer_program rows
4. `a0695ca` — S5A batch10: gap-closure for final 11 verified_current summer_program rows
5. (plus this handoff commit, pushed immediately after)

### WHAT THE NEXT OWNER SHOULD DO

1. **CEO/DATA**: review and promote the 31 new PRODUCTION_READY records the same way as the prior 28
   (59 cumulative) — same not-yet-live-schema caveat applies to `turkey_student_access` and the image
   provenance fields.
2. **CEO/DATA**: fix the 2 flagged currency-label errors (AI Summer Week @ ETH Zurich → CHF, University
   of St Andrews → GBP) and check the Penn Medicine deadline-field mapping.
3. **CEO/DATA**: decide the WYSE umbrella-row question (which sub-program the row represents, or split
   it) — now the third confirmed instance of this failure mode alongside CTY and BRAND-ED.
4. **Whoever continues S5A's gap-closure**: the entire `verified_current` tier is now closed. The only
   remaining gap-closure surface is the much larger `unverified` bucket (roughly 147+ rows by this
   session's live count) — per the prior handoff's own correct assessment, this needs more
   from-scratch work per record, not just a gap-fill, so budget accordingly. Two cheap, targeted
   follow-ups first: a fresh Idyllwild Arts attempt (likely-transient failure, promising secondary
   signal) and a first-party umd.edu re-check on Terp Young Scholars' online-only-for-international
   claim.
5. **Whoever runs the fleet-wide second-review pass**: neither this pass's 31 records nor the prior
   session's 28 have been reviewed by S5B or S8 yet. S5B's own final handoff indicates their
   continuation is complete too, so both lanes' full output is now stable and ready for that review to
   actually happen.

## SECOND CONTINUATION PASS — 2026-08-27/28 (fresh session, `unverified`-tier assignment from Research CEO)

Written by a new S5A session assigned explicitly to the `unverified` bucket (the much larger, genuinely
from-scratch tier the prior two passes correctly identified but did not touch, since they were scoped to
the higher-priority `verified_current` tier). Prior sections above are left untouched. No production
writes were made at any point, same contract as before.

### STATUS

Stopping at a natural checkpoint after six pushed batches (91 records) — a substantial, real first pass
on the `unverified` bucket, not full coverage. Quality and honest per-row verdicts were prioritized over
raw count throughout, per Contract §13/§14 and the task's explicit instruction to prefer breadth of
honest verdicts over perfecting a handful.

### METHODOLOGY THIS PASS

1. **Re-measured the live bucket rather than trusting the prior session's "~147+" estimate**, per
   instruction. Found: `status` has no `unverified` enum value at all — the actual verification tier
   lives in a separate `verification_state` text column. Cross-tabulating `category='summer_program'`
   by `status` × `verification_state` gave: `active`+`unverified` 58, `under_review`+`unverified` 83,
   `disabled`+`unverified` 18, `expired`+`unverified` 1. The `disabled` and `expired` rows were sampled
   and confirmed to be either already-known-duplicate rows or clearly malformed ingestion artifacts
   (e.g. a row titled "Time: 4:30pm – 5:30pm (Hong Kong time)", another titled "USC Summer Programs 2025
   Info Sessions") — correctly out of scope, not researched. **Real worklist: 141 rows**
   (`active`+`under_review`, both `unverified`), close to but not exactly the prior estimate, exactly as
   the task anticipated needing re-measurement.
2. **Applied the S5B exclusion list precisely rather than approximately.** The task's dispatch named "8"
   rows from `s5b_2026-08-26_MISCATEGORIZATION_fixes.jsonl` but that file actually lists 10 distinct IDs
   (Polygence, Lumiere Education, Research Mentorship Program, UCSB Research Mentorship Programs, Summer
   Science Program (SSP), Rockefeller SSRP, SSTP ×2, Venture & Tech Summer Program, International
   Research Institute of NC). Live-DB spot-checks found CEO/DATA has **already actioned most of these**
   — SSP, Venture & Tech, UCSB RMP, Rockefeller SSRP, and SSTP now show `category='research'` or
   `'internship'` live, and Polygence and IRI are already `category='research'` too (explaining why they
   didn't appear in this session's `summer_program`-scoped query at all — no manual exclusion needed).
   Combined this with the prior session's own separately-documented 6-row self-exclusion (MIT PRIMES,
   Simons SRP, Garcia SRP, Caltech SRC, Clark Scholars, Rockefeller SSRP) and confirmed via live query
   that none of those 6 titles appear in the `unverified` worklist by that exact name — except one new
   wrinkle found independently this session (see KEY FINDINGS #1 below).
3. **Applied the cross-category and cross-tier dedup lesson from the task instructions throughout**, not
   as a one-time pass: every candidate with an ambiguous or generic title was checked against the live
   DB (full-table, not category-scoped) before being written up. This caught real, previously-unflagged
   duplicates (see KEY FINDINGS #2).
4. Worked six batches, front-loading the confusing "bare institution name" cluster (roughly a third of
   the 141-row bucket turned out to be exactly this shape — see KEY FINDINGS #3) since it required the
   most judgment calls and benefited from being resolved while full context was fresh.

### COUNTS THIS PASS (`S5A-0082` through `S5A-0172`, 91 records)

- **58 PRODUCTION_READY** — 53 `VERIFIED_ELIGIBLE`, 5 `ELIGIBLE_WITH_CONDITIONS` (HKUST I·ELITE:
  school-nomination-only; UChicago Pre-College: online-only for students not already enrolled at a US
  institution, confirmed via UChicago's own international-students page; Harvard SSP: I-20 visa holders
  restricted to the residential track; Kode With Klossy: virtual-only for non-US participants; Phillips
  Exeter: no financial aid for international applicants).
- **4 REJECTED** (`NOT_ELIGIBLE`) — each a clean, first-party-confirmed structural or citizenship bar,
  not an ambiguous call: BETA Camp/Prequel (own page: "open to students in grades 9-11 in North
  America"), Stanford SIMR (own page: "International students are not eligible"), Carnegie Mellon AI
  Scholars (own page: "a U.S. citizen or permanent resident with a current U.S. green card"), NYU High
  School Law Institute (structural — free, in-person, Saturday academic-year program in NYC, not
  practically accessible to a Türkiye-based student and not a summer program at all).
- **29 BLOCKED/UNCLEAR** — a mix of genuine evidence-exhausted ambiguities (e.g. ISSYP's status dispute,
  Vesalius College's institutional-succession confusion, several umbrella-index rows) and pure tooling
  failures (repeated 403s/socket errors on specific domains — JHU's `cty.jhu.edu`/`ei.jhu.edu`,
  `ringling.edu`, `tufts.edu`, `fordham.edu`'s CAS login wall, `gwu.edu`). Every BLOCKED record states
  explicitly which kind of blocker it is, so a future researcher knows whether to re-attempt (technical)
  or dig deeper (genuine ambiguity) — see each record's own `notes` field.

### REMAINING

**39 of the 141 live-measured `unverified` rows are still untouched** after this pass (102 of 141
touched: 91 researched/flagged + 11 pre-excluded for S5B-territory/winter-camp/duplicate reasons — see
below). The untouched rows are recoverable by re-running this session's own SQL query
(`category='summer_program' AND verification_state='unverified' AND status IN ('active','under_review')`)
and excluding the opportunity_ids now present in `s5a_batch11` through `s5a_batch16`. At a glance, most
of the remainder is more of the same "bare institution name" cluster this pass was already working
through (American University, Google Computer Science Institute, Hochschule Bremen, Hong Kong Baptist
University, Hong Kong Polytechnic, Lehigh University ×2, University of Maastricht, Purdue University,
SAIC ×2, Trinity College London/Ireland, Universidad de Navarra, University of Pennsylvania, USC, University
of Toronto, Woodstock School, Athena Summer Innovation Institute) plus a handful of standalone programs
not yet attempted (Dive Into Engineering!/USC, RIBS, SPINWIP, Stanley Prep, Summer at Stanford HS 2025,
Summer Discovery, UChicago Pathway Economics, Wharton Global Youth generic, Wharton Sports Analytics —
the latter's own URL is `wharton-data-competition`, suggesting it may actually be a `competition`-category
row, not `summer_program`, and should be checked against S6's territory before further work). None of
these were found broken or dead-ended in a way that would make them unresearchable — they simply weren't
reached in this pass's six batches.

**Pre-exclusions applied (11 rows, not counted in the 91), all still exactly as flagged by the task and
prior sessions, not independently re-verified as new findings**:
- 6 Turkish winter-camp rows (kış kampı/kış okulu) miscategorized as `summer_program` — the already-known
  pattern from the prior session's `summer_FINAL_SUMMARY`, this pass found 6 more specific instances:
  Sabancı Nanotechnology Winter School, Kadir Has Kış Okulu, Koç Nanoteknoloji ve Biyoteknoloji Lise Kış
  Kampı, Acıbadem Kış Bilim Kampı, Koç Lise Kış Tıp Okulu, Acıbadem Uygulamalı Moleküler Biyoloji ve
  Genetik Kampı (Kış).
- 2 Koç University "KUSRP" rows (`Koç University Research Program KUSRP`, `Research Program KUSRP 2026`)
  — S5B's mentored-research territory (Koç University Summer Research Program), already researched per
  `turkey_batch1_2026-08-21.jsonl` referenced in the operating brief.
- 1 "Garcia Summer Scholars" row — a likely duplicate of the already-`verified_current`, already-S5B-flagged
  "Garcia Summer Research Program" (see KEY FINDINGS #1).

### KEY FINDINGS WORTH FLAGGING TO CEO/DATA

1. **A new duplicate pair the prior session's self-exclusion list didn't catch**: "Garcia Summer
   Scholars" (`d83d7048-537b-4450-8dfa-69e709cdb48f`, `active`/`unverified`) appears to be the same
   Stony Brook program family as the already-`verified_current`, already-S5B-flagged "Garcia Summer
   Research Program" (`a37fa810-d142-4c07-b272-b3d58a6e6ea5`) — two DB rows, two different titles, same
   organizer/domain pattern. Excluded from this pass's worklist on that basis rather than independently
   researched; not fully confirmed as a duplicate (title alone, not a name+organizer+URL triple match).
2. **At least six more umbrella-row / bare-institution-index cases**, the same failure mode as the
   already-known CTY/BRAND-ED/WYSE trio, now confirmed a structural pattern rather than isolated
   incidents: Carnegie Mellon University (PA, USA) (`b4091e25` — confirmed at least one sub-track, AI
   Scholars, is US-citizen-only, while the portfolio's other tracks are unverified), Brown University
   (RI, USA) (`c2444f7f` — lists 8 distinct named products), Bentley University Pre-College Programs
   (`9e601648` — one real product, Wall Street 101, buried inside a contentless landing page), Columbia
   University: New York, NY (`17d177de` — general admissions portal for the whole Columbia precollege
   family), and four more Johns Hopkins CTY sub-tracks found as their OWN separate DB rows (Intensive
   Studies for 7th Graders and Above, Civic Leadership Institute, Global Issues at Princeton, Institute
   for Advanced Critical and Cultural Studies) — meaning the CTY umbrella problem is not just "one row
   representing many programs" but now also "many rows for sub-programs of one umbrella," a mirror-image
   version of the same underlying data-model gap.
3. **The "bare institution name" pattern is large and systemic, not anecdotal**: roughly a third of the
   141-row bucket consists of rows titled just `[University Name]` or `[University Name]: [City, State]`
   pointing to a generic admissions/index/homepage URL rather than a specific named program — several
   turned out to point to entirely wrong content (Lehigh University: Bethlehem PA → graduate admissions
   event schedule; University of Exeter → a random professor's individual faculty profile page;
   Universidad de Navarra → a Philosophy-faculty pilgrimage-walking page; Google Computer Science
   Institute → a different institution's (NEIU) Bachelor's degree program page; Hong Kong Polytechnic
   University → postgraduate study page; Trinity College London, Ireland → conflates two unrelated real
   institutions, Trinity College Dublin and the separate London exam board "Trinity College London",
   into one row pointing at Dublin's homepage). This looks like a pipeline/ingestion defect from an
   earlier scrape (each institution mentioned in a seed document got its own row, regardless of whether
   a specific program name or URL was actually captured) rather than isolated bad data points — worth a
   dedicated data-quality pass rather than continued one-by-one gap-closure once the pattern is this
   confirmed.
4. **Two more provider-type corrections** in the same vein as the prior session's Oxford Scholastica
   finding: Oxford Royale ("does not operate under the aegis of the University of Oxford... operates
   independently as Oxford Programs Limited") and Discovery Summer at Winchester College (an independent
   English-language-course operator using the school's campus, not a Winchester College program) — both
   corrected to `provider_type=independent_provider` rather than implying institutional affiliation.
5. **A positive Turkey-specific finding worth highlighting rather than just noting**: two records this
   pass had unusually direct, specific evidence of actual Turkish access rather than a mere absence of
   restriction — Discovery Summer/Winchester College's own official_url in the DB is a Turkish-language
   Biltur (a Türkiye-based study-abroad consultancy) enrollment page, and Horizon Inspires' own published
   historical cohort breakdown names Türkiye by name (4% of a reported cohort, alongside China, India,
   Canada, UAE). Both are stronger evidence than the "no stated restriction" pattern that make up most
   `VERIFIED_ELIGIBLE` calls in this corpus.
6. **A likely reversal of a previously "confirmed" fact, flagged rather than silently overwritten**:
   ISSYP (International Summer School for Young Physicists, Perimeter Institute) is listed in this
   lane's own `cr1_do_not_add.jsonl` (2026-08-23) as "confirmed discontinued." This session's reverify
   found the opposite signal — multiple 2025/2026-dated secondary sources (AoPS wiki, summer-program
   aggregators) describing it as a currently-running two-week online program with 900+ alumni from 60
   countries — but could not get a first-party fetch through (`perimeterinstitute.ca` returned 403
   Forbidden, `insidetheperimeter.ca` hit a domain-verification block) to settle it either way. Recorded
   as `BLOCKED`/`conflicting` rather than either accepting the old verdict or the new signal uncritically
   — per this lane's own standing lesson to report drift honestly rather than smooth it over.
7. **A recurring category-mismatch failure mode, now confirmed across four independent cases**: rows
   correctly named and pointing to a real, real program, but one that isn't actually a *summer* program
   at all — Juilliard Pre-College (a Saturday, academic-year Sept-May program), NYU High School Law
   Institute (free, yearlong, Saturday), UC San Diego Futures Programs (explicitly runs "in line with a
   traditional academic year... September to June"), and Columbia's "Spring Immersion Program" (its own
   URL path is `academic-year/academic-year-weekend`). Recommend a systematic recheck of any
   `summer_program`-categorized row whose own official page describes academic-year, not summer,
   programming.
8. **A persistent tooling pattern, not a content finding**: direct `WebFetch` calls to `cty.jhu.edu`,
   `ei.jhu.edu` (both Johns Hopkins), `ringling.edu`, `tufts.edu`, and a `fordham.edu` page behind a CAS
   login wall all failed with 403s or connection errors across this entire session, while `WebSearch`
   summaries of the same domains' content generally succeeded. Future researchers hitting these same
   domains should go straight to `WebSearch`-sourced evidence rather than repeatedly retrying direct
   fetches.

### FILES CREATED/UPDATED

- `data/research/opportunities/s5a_batch11_2026-08-27.jsonl` through `s5a_batch16_2026-08-27.jsonl` — 6
  new files, 91 total records.
- `data/research/registry/claims_s5a.jsonl` — 91 more append-only entries (`S5A-0082` through
  `S5A-0172`); 172 total in the file now.
- This handoff file (this section only — everything above is prior sessions' untouched record).

### COMMITS THIS PASS (oldest to newest, all pushed to `oryn/s5a-summer-academic-enrichment`)

1. `f1391e7` — S5A batch11: from-scratch research on 17 unverified summer_program rows + 5 BLOCKED
2. `fe01991` — S5A batch12: 11 more PRODUCTION_READY, 2 BLOCKED, 1 REJECTED
3. `7fc6191` — S5A batch13: 9 PRODUCTION_READY, 1 REJECTED, 5 structural flags
4. `69a0b7b` — S5A batch14: 9 PRODUCTION_READY, 3 structural flags
5. `c56a994` — S5A batch15: 7 PRODUCTION_READY, 2 REJECTED, 5 structural/technical flags
6. `ee011fa` — S5A batch16: 7 PRODUCTION_READY, 8 structural/technical flags
7. (plus this handoff commit, pushed immediately after)

### CUMULATIVE PRODUCTION-READY COUNT (all three sessions combined)

**117** (28 + 31 + 58). All still dry-run proposals in JSONL — none of this is live in production.

### WHAT THE NEXT OWNER SHOULD DO

1. **CEO/DATA**: review and promote the 58 new PRODUCTION_READY records the same way as the prior 59
   (117 cumulative) — same not-yet-live-schema caveat applies to `turkey_student_access` and image
   provenance fields.
2. **CEO/DATA**: the "bare institution name" data-quality pattern (KEY FINDINGS #3) is large enough now
   (roughly a dozen confirmed-bad rows found this session alone, several pointing to entirely wrong
   content) to warrant a dedicated ingestion-quality pass across the full `summer_program` category
   rather than continued one-by-one discovery — it likely extends into the untouched 39 rows too.
3. **CEO/DATA**: resolve the six-plus umbrella-row cases surfaced this session (KEY FINDINGS #2),
   ideally as one schema/process decision rather than case-by-case, since the pattern is now confirmed
   systemic (CTY alone has both an umbrella row AND now four independently-discovered sub-track rows).
4. **CEO/DATA**: decide on the ISSYP drift finding (KEY FINDINGS #6) — needs a first-party fetch this
   session couldn't get through on either `perimeterinstitute.ca` or `insidetheperimeter.ca`.
5. **Whoever continues S5A's `unverified`-tier gap-closure**: 39 rows remain untouched (see REMAINING
   above) — re-run this session's SQL query, exclude the IDs now in `s5a_batch11`-`s5a_batch16`, and
   continue. Consider addressing Wharton Sports Analytics and Business Initiative's likely
   miscategorization (URL is `wharton-data-competition`) with S6 before researching it as a
   `summer_program`.
6. **Whoever runs the fleet-wide second-review pass**: this pass's 91 records have not yet been reviewed
   by S5B or S8, same open item as the prior two passes noted for their own output.
