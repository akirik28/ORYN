# Handoff: opportunities.eligible_countries gap — Step 1 backfill + Step 2 research batch

STATUS:
COMPLETE for this pass. Deterministic backfill (Step 1) and a real 24-program research batch
(Step 2) both applied live against `qtcvcflzxbuagvvwahhu`. Gap moved from 366/391 (93.6%) to
352/391 (90.0%). Idle pending next assignment — see the scoped plan below for what a Wave 2
session should pick up.

SCOPE COMPLETED:
Full methodology, per-row reasoning for all 43 rows individually researched, and the scoped
plan for the remaining 352: `docs/research/opportunities-eligible-countries/README.md`. Applied
SQL (idempotent, guarded, safe to re-run as a no-op): `data/research/opportunities/
eligible_countries_step1_2026-08-22_dry-run-update.sql` (13 rows),
`eligible_countries_step2_2026-08-22_batch1.sql` (1 row + full documented reasoning for the
other 23 researched-but-not-written rows). Workstream claimed:
`docs/ORYN_WORKSTREAMS.md` (OPPORTUNITIES-ELIGIBLE-COUNTRIES row).

MEASUREMENT, RE-VERIFIED INDEPENDENTLY (not trusted blind from the assigning session's snapshot):

| Checkpoint | Total | Null/empty | Populated |
|---|---:|---:|---:|
| Start of this pass | 391 | 366 (93.6%) | 25 |
| After Step 1 | 391 | 353 | 38 |
| After Step 2 | 391 | **352 (90.0%)** | **39** |

KEY FINDINGS:

1. **A load-bearing code check, done before writing anything**: `lib/opportunities/matching.ts`'s
   `computeEligibility` and `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility` both
   treat `eligible_countries.length === 0` as "not restricted by country" — the check is skipped
   entirely, not treated as unknown. Two direct consequences that shaped the whole approach:
   (a) a genuinely open-worldwide program must stay empty — populating it with a fabricated
   "all countries" list would be wrong, not just unnecessary; (b) the real live risk runs the
   *other* direction from what "366 null rows" suggests on its own — a genuinely restricted
   program with an empty array is shown as eligible to every student today, with no warning.
   Before this pass, a Turkish student could see MIT PRIMES or QuestBridge marked eligible with
   zero indication otherwise. Closing this gap for actually-restricted rows is a correctness fix,
   not just a completeness one.
2. **Title/organization keyword matching is measurably unsafe for this field**: of 33 candidate
   rows surfaced by description-keyword or title/org-token matching (Buckets 2 and 3), **zero**
   produced a safe apply. Every hit was either already explicitly open, a garbled/multi-program
   scrape, or needed a fresh official fetch to enumerate safely. Only rows where a prior pass had
   already written an explicit citizenship/residency sentence in prose (Bucket 1, `citizenship_
   restrictions`/`residency_restrictions` already non-null) were safe to promote — 13 of 51 such
   rows, after each was individually read and reasoned through against a strict
   explicit-statement-only bar.
3. **The "Türkiye Scholarships" trap named in the assignment is real, and correctly avoided**:
   its own `citizenship_restrictions` text (already on the row) reads "Open to citizens of all
   countries" — it's a Turkish-government scholarship *for* international students, the opposite
   of what naive title-pattern-matching would suggest. Left untouched.
4. **Explicit citizenship restrictions concentrate in need-based/government-funded/security-
   adjacent programs, not generic paid university camps.** Calibrated from Step 2's ~19
   fresh-fetch rows with no prior signal: ~5% yielded a positive write, ~26% resolved to
   confirmed-open, the rest were genuine "checked, nothing stated." Every one of 5 additional
   "likely domestic" US university camps checked (JAX/Jackson Lab, Bill of Rights Institute,
   Colorado School of Mines, ASU Barrett, UT Austin WiSTEM) came back with no citizenship gate at
   all. A counter-finding against the obvious prior: an official `legion.org` article confirms at
   least one state's American Legion Boys State explicitly welcomes non-citizens.
5. **One genuine conflict found and recorded, not resolved**: HOSA's international-chapter country
   list disagrees between two searches of `hosa.org`'s own content (Germany/Italy vs.
   China/Korea/Turkey/Vietnam, both claiming to be current). Left null.
6. **Turkish `.org.tr`-class sites are hard to fetch directly** (UWC Türkiye 403'd twice, İstanbul
   Kent Konseyi TLS-failed) — consistent with `docs/research/opportunities-turkey/README.md`'s
   own documented experience. Worked around via WebSearch-indexed excerpts for UWC Türkiye
   (applied at `source_confidence='medium'`, explicitly not `high`, because of this) but this
   should be revisited with browser-based fetching in a future pass.
7. **One deliberate, evidence-based departure from prior R4 research**: `docs/research/
   opportunity-eligibility/extraction-audit-sample.md` left QuestBridge's `eligible_countries`
   null on the reasoning that citizenship (not location) gates it. This pass populated it as
   `['United States']` instead, matching the already-live Davidson Fellows row's near-identical
   citizenship shape — treating `eligible_countries` as "the citizenship/domicile-gating country"
   consistently with the table's own established convention, not as an oversight of the prior
   pass's caution.

INCIDENTAL FINDINGS (recorded, not acted on — outside this lane's `eligible_countries` scope):
- **Duplicate pair**: "The Diamond Challenge" (`30a605ab`, competition) / "Diamond Challenge"
  (`cb1ae3e2`, entrepreneurship) — same organization, same official-URL domain.
- **3 garbled/multi-program scrape rows**, a data-quality defect distinct from missing
  eligibility data: `69be38ed` (Robomaster China row's description mixes in unrelated Malaysia/
  Hong Kong program text), `b10444c7` (titled "Netherlands," body describes an Italian program),
  `87f773f9` (ends mid-sentence with a stray "EUROPE" token).
- İstanbul Bilgi University confirmed open/operating (a search-summary "closed by decree" claim
  checked directly against the live homepage and found false).
- İTÜ Lise Yaz Okulu's current 2026 session dates and registration deadline surfaced incidentally
  while checking eligibility — not applied to any column by this lane.

UNRESOLVED / DEFERRED:
- TechGirls' exact 37-participating-country list (page confirmed to exist, not successfully
  fetched in 2 attempts).
- Erasmus+ Youth Exchanges' `eligible_countries` stays null by design (compound Programme/Partner-
  country structure, RULE-ELIGIBILITY-009) but its `citizenship_restrictions` text could be
  tightened with the specific Programme-country list this pass confirmed (North Macedonia,
  Türkiye, Serbia, Norway, Iceland, Liechtenstein) — a future `citizenship_restrictions` edit,
  not an `eligible_countries` one.
- HOSA's chapter-list conflict (see above).
- The 38 Bucket-1 rows with existing restriction text this pass deliberately did NOT touch are
  **closed decisions with reasons recorded**, not an open queue — see the README's "Rows
  deliberately NOT touched" section before re-litigating any of them.

SCOPED PLAN FOR THE REMAINING 352 (full detail and category breakdown in the README):

- **Wave 2 (next, ~20 records, highest expected yield)**: the small, high-stakes categories —
  remaining `research` (12), `scholarship` (2), `fellowship` (4), `internship` (2) — plus closing
  TechGirls' and Erasmus+'s specific open sub-questions above.
- **Wave 3 (~25 records)**: remaining `competition` (~57) — prioritize national
  Olympiad/team-selection competitions (higher observed citizenship-gate correlation) over
  generic open competitions; do not prioritize by title keywords (measured 0% yield this pass).
- **Wave 4 (bulk, ~150-200 records, budget for a low ~5% per-record yield)**: the large
  `summer_program` tail (240 remaining). Recommend the same ~20-25-record wave structure the
  DE/NL requirements research used. Worth a product decision (not this lane's call): capturing
  this field at intake time for newly-discovered opportunities may be cheaper long-term than a
  repeated backfill pass.
- **Wave 5**: Turkish institutional/government pages specifically, with browser-based fetching
  rather than the automated `WebFetch` tool this pass used (high 403/block rate observed).
- **Separate queue, not an eligibility wave**: the 3 garbled scrape rows and 1 duplicate pair
  above need re-research/dedup, not an eligibility lookup — route to whoever owns general
  `opportunities` data quality.

INTENDED CONSUMER:
Whoever next picks up opportunity data quality (matches DATA-A's scope per
`docs/MASTER-EXECUTION-STRATEGY.md` §3) for Wave 2+ continuation, and PROD-B/counselor-facing
work for the correctness-fix framing in Key Finding 1 (worth confirming the counselor's advisory
notes for restricted-but-still-null rows are worded honestly in the meantime).

NEXT ACTION:
1. Re-verify live count fresh before starting Wave 2 (this file is a snapshot, not a live view —
   other sessions may move the number between now and then).
2. Pick up Wave 2 (research/scholarship/fellowship/internship — small enough to fully close in
   one focused pass) before the larger, lower-yield summer_program tail.
3. Consider whether the intake-time-capture product question above is worth raising with the
   coordinator rather than assumed either way.
