# Opportunities eligible_countries gap — measurement, Step 1 backfill, Step 2 research batch

**Workstream:** OPPORTUNITIES-ELIGIBLE-COUNTRIES · **Branch:** `oryn/opportunities-eligible-countries-gap`
**Researched:** 2026-08-22 · **Scope:** `public.opportunities.eligible_countries` only. No schema
changes, no other columns touched except the `citizenship_restrictions` text directly supporting
one `eligible_countries` write (UWC Türkiye) and `source_confidence`/`updated_at` on rows actually
written.

Assigned because `docs/MASTER-EXECUTION-STRATEGY.md` §P3 and `docs/current-state.md` both flag
`eligible_countries` null-or-empty as **the single gate blocking real eligibility matching** — the
matching logic (`lib/opportunities/matching.ts`, `lib/counselor/eligibility.ts`) already exists and
is correct; it simply has almost nothing to match against.

## Live measurement, re-verified independently (not trusted from the coordinator's snapshot)

| Checkpoint | Total | Null/empty `eligible_countries` | Populated |
|---|---:|---:|---:|
| Before this pass (re-verified 2026-08-22 via Supabase MCP, matches coordinator's 391/366 snapshot exactly) | 391 | 366 (93.6%) | 25 |
| After Step 1 (deterministic backfill) | 391 | 353 | 38 |
| After Step 2 batch 1 (real research) | 391 | **352 (90.0%)** | **39** |

Net this pass: **-14 null rows (-3.6 points), +14 populated**. Modest in absolute terms and
deliberately so — see "Why the yield is small, and why that's correct" below.

## Step 1 — deterministic backfill from data already on the row

**Method:** pulled all 366 null rows (`id, title, organization, category, country, location_mode,
remote_allowed, description, source_url, source, source_confidence, verification_state,
minimum_age, maximum_age, citizenship_restrictions, residency_restrictions`) and bucketed by
signal type:

- **Bucket 1 (51 rows):** `citizenship_restrictions` or `residency_restrictions` already non-null —
  a prior research pass had already written a restriction sentence in prose but never promoted it
  into the structured array the matching code actually reads. Read in full, manually, row by row.
- **Bucket 2 (8 rows):** `description` contains an eligibility-adjacent keyword (citizen,
  nationality, resident, "open to", etc.).
- **Bucket 3 (25 rows):** `title`/`organization` contains a country-name-like token (e.g.
  "Türkiye", "USA", "Germany").

**Result: only Bucket 1 produced safe applies — 13 of 51 rows, following a strict bar (explicit,
unambiguous statement naming one specific country, or a named sub-national region that
mechanically implies one country, e.g. "Long Island, NY" or "Pasadena Unified School District").**
Buckets 2 and 3 produced **zero** safe applies — every hit was either already explicitly open,
a garbled/multi-program scrape, or needed a fresh official-source fetch to safely enumerate. This
is a genuine, useful negative finding, not a shortfall of the method: **title/organization
keyword-matching is not a safe signal for this field in this dataset**, and future waves should not
prioritize it.

**The trap, confirmed handled correctly:** "Türkiye Scholarships – Bachelor's Degree Programme"
(`34033f8a`) is exactly the case this project's own `MEMORY.md` warns about — a naive title-pattern
match ("Türkiye" in the name → assume Turkey-restricted) would have been **backwards**. Its own
`citizenship_restrictions` field, already on the row, reads: *"Open to citizens of all countries."*
It is a Turkish-government scholarship **for international students to study in Turkey**, not a
scholarship for Turkish citizens. It was correctly left untouched.

**A load-bearing code check before writing anything:** read `lib/opportunities/matching.ts`
(`computeEligibility`) and `lib/counselor/eligibility.ts` (`evaluateOpportunityEligibility`)
directly before deciding how to represent "confirmed open worldwide." Both treat
`eligible_countries.length === 0` as **"not restricted by country"** — the country check is
skipped entirely, not treated as "unknown." This means:

1. A genuinely open-worldwide opportunity is **already correctly represented** by an empty array —
   populating it with a fabricated "all countries" list would be wrong, not just unnecessary.
2. **The inverse is the real, currently-live risk**: a genuinely *restricted* opportunity with an
   empty `eligible_countries` array is today shown as eligible to every student, with no visible
   restriction note (the free-text `citizenship_restrictions`/`residency_restrictions` fields are
   only surfaced as non-blocking advisory notes by the counselor layer, never read by the hard
   matching filter). Closing this gap for genuinely-restricted rows is a **correctness fix**, not
   just a completeness one — before Step 1, a Turkish student could see MIT PRIMES, Simons Summer
   Research, or QuestBridge marked eligible with no warning.

**Applied (13 rows, all `verification_state='verified_current'`, `source_confidence='high'`,
guarded `UPDATE ... WHERE id = X AND (eligible_countries IS NULL OR eligible_countries = '{}')`,
dry-run with `ROLLBACK` confirmed exactly 13 matches before the real `COMMIT` run):**

| Title | `eligible_countries` | Basis |
|---|---|---|
| Anson L. Clark Scholars Program | United States | "U.S. citizen or permanent resident." |
| Caltech Summer Research Connection | United States | Pasadena Unified School District only (same pattern as the already-live Cold Spring Harbor row) |
| Carnegie Mellon SAMS | United States | "U.S. citizen or permanent resident required." |
| CU Boulder Precollegiate Development Program | United States | Named Colorado counties/districts only |
| MIT Beaver Works Summer Institute | United States | "Cannot accept students residing outside the US." |
| MIT PRIMES | United States | "Available only to students who reside in the United States." |
| MITES Summer | United States | "U.S. citizens or permanent residents." |
| Simons Summer Research Program | United States | "U.S. citizens and/or permanent residents." |
| Sutton Trust UK Summer Schools | United Kingdom | Requires UK state-school enrollment in a UK-specific year-group system (Year 12/13, S5) |
| Washington University STL College Prep Program | United States | St. Louis, Missouri area only |
| WYSE Young Scholars Summer STEMM Research | United States | Named 7 US states (row's own `source_url` is the Young-Scholars-specific page, not the broader open EYO camp) |
| Coca-Cola Scholars Program | United States | US immigration/residency status categories only |
| QuestBridge National College Match | United States | "U.S. citizens and permanent residents... international students living outside the U.S. are not eligible." (same shape as the already-live Davidson Fellows row; this deliberately updates the more cautious abstention in the prior R4 research pass — see "Reconciling with prior R4 research" below) |

Full per-row SQL and inline justification comments:
`data/research/opportunities/eligible_countries_step1_2026-08-22_dry-run-update.sql`.

### Rows deliberately NOT touched in Step 1, and why (the other 38 of 51 in Bucket 1)

Every one was individually read and reasoned through, not skipped by default:

- **Explicitly open** (no value needed — empty is already correct): Conrad Challenge, GENIUS
  Olympiad, Bocconi Summer School, IE University, Immerse Education, LSE Summer School, Oxford
  Scholastica, Ross Mathematics Program, Rutgers Young Scholars, Sciences Po Summer School, Tisch
  Summer High School, Wharton LBW, Türkiye Scholarships, Alpha Leo Club, Rotary Interact Club,
  Schoolhouse.world, European Youth Event, THIMUN, Girl Up Club, Girl Up Global Teen Advisor Board,
  Girl Up Project Awards, Three Dot Dash Global Teen Leaders, USACO (the described product —
  online contests — is explicitly "open to all"; only a nested training-camp sub-track is US-only).
- **Genuinely ambiguous, evidence doesn't clear the bar** (ORYN's own `no_statement_found` precedent
  applied consistently): ARML, DECA, HOSA (multi-country but non-exhaustive list), Science Olympiad
  (matches an already-reviewed precedent elsewhere in this codebase), Technovation Girls (gender,
  not country), American Legion Boys State (see Step 2 — direct research this pass found evidence
  *against* the obvious assumption).
- **Nomination/national-committee-mediated — a flat list would misrepresent the mechanism**
  (RULE-ELIGIBILITY-009, `docs/research/opportunity-eligibility/README.md`): EUCYS, Erasmus+ Youth
  Exchanges (see Step 2 — researched further, correctly stays null).
- **Compound, multi-category, doesn't reduce to a flat list**: Copenhagen Business School Summer
  University (exchange/nominated/fee-paying tiers with different rules).
- **Field content is about something other than country** (student status, gender, age — not a
  country signal at all, regardless of which restriction field it was recorded in): PROMYS,
  SUMaC.
- **Row aggregates many different sub-courses with different rules, correctly stays unaggregated**:
  UWC Short Courses, WYSE's row is the one exception — see Applied table above, because *this specific
  row's own source_url* is unambiguously the single-program page.

## Step 2 — real research batch (24 programs, official-source-first)

Per the coordinator's brief, did **not** attempt full research on all 352 remaining rows. Picked a
first batch sized to what could actually be done to this project's established accuracy bar in one
pass: 24 programs (19 from the original target list + 5 added mid-pass after the first round showed
a clear, useful pattern worth confirming further — see below). Every fetch prompt explicitly asked
for verbatim eligibility language, not a paraphrase, and every finding below is sourced to the
specific official page fetched (or, where the page could not be fetched, explicitly marked as such).

**Net structured yield: 1 row populated.** This is the expected, correct outcome of the method
applied honestly — not a shortfall. See "Why the yield is small" below for the full accounting.

### Applied (1 row)

**UWC Türkiye** (`97fa39ad`) → `eligible_countries = ['Türkiye']`, `source_confidence = 'medium'`
(not `high`). Requires Turkish citizenship, or (if not a citizen) a Turkish-citizen parent, or 5+
years of Turkey residency. Sourced via WebSearch-indexed excerpts of UWC Türkiye's own official
pages (`basvuru/uygunluk-kriterleri`, `secim-kriterleri`) — **direct fetch of `tr.uwc.org` returned
HTTP 403 on 2 independent attempts**, consistent with this project's own prior documented
experience with Turkish `.org.tr` sites (`docs/research/opportunities-turkey/README.md`'s "Known
gate not yet fixed" section). `source_confidence` reflects this explicitly — flagged for a future
pass to attempt a direct-fetch reconfirmation if the block lifts, rather than silently presented as
equivalent to a raw-fetch `high`-confidence row.

### Confirmed explicitly open (5 programs, 6 rows — correctly stays empty, no value added)

Yale Young Global Scholars ("accepts applications from ALL countries"), The Diamond
Challenge/Diamond Challenge ("Any Idea, Any Team, Any Country" — **also a confirmed duplicate
pair**, `30a605ab` + `cb1ae3e2`, same organization and official-URL domain, different category —
flagged for a dedup pass, not merged by this lane), FIRST Robotics Competition (checked 3 separate
pages, no restriction found, ~35 countries participate), LaunchX, King's College London
Pre-University Summer School.

### Conflicting evidence — recorded, not resolved

**HOSA Future Health Professionals**: two independent searches against `hosa.org` content returned
two different "current" international-chapter country lists for the same organization — one names
American Samoa/Canada/Germany/Italy/Puerto Rico (this row's own pre-existing description text), the
other names American Samoa/Canada/China/Korea/Puerto Rico/Turkey/Vietnam (a 2026 50th-anniversary
conference announcement). Neither a direct `hosa.org/join` fetch nor a `hosa.org/whatishosa` fetch
(404) surfaced HOSA's own authoritative current list. Left null rather than guessing between two
disagreeing sources — matching this project's own standing discipline (see the DE/NL requirements
precedent's 13 recorded-not-resolved conflicts).

### Checked against a real official page, no citizenship/residency statement found (16 programs)

A genuine negative finding, not an unsearched gap — every page below was actually fetched and read:
Özyeğin University Summer Research Program, Bilkent University Summer Camp (FAQ page specifically),
Istanbul Bilgi University HS Summer School, İTÜ Lise Yaz Okulu, Sabancı University Summer School,
İBB Genç Gönüllü Programı, Gençlik Merkezleri (e-Genç), İstanbul Kent Konseyi Gençlik Meclisi
(direct fetch TLS-failed; worked around via search, still nothing found), American Legion Boys
State, European Youth Parliament Türkiye, JAX Summer Student Program, BRI Student Fellowship,
Colorado School of Mines Engineering Design Summer Camp, Barrett Summer Scholars (ASU), UT Austin
Women in STEM High School Camps.

**A specific, useful counter-finding**: going in, "in-person US/Turkish institutional program →
almost certainly citizenship/residency-restricted" felt like a reasonable prior (it's exactly the
pattern Step 1 confirmed 13 times over). Direct research this pass **did not support that prior**
for any of these 16 — and for American Legion Boys State specifically, a WebSearch hit surfaced an
official `legion.org` article titled *"Non-citizens have special role in Ohio Boys State"*,
directly disproving what would otherwise have looked like an obvious "US civic program = US
citizens only" inference. This is exactly the kind of result that justifies the strict
explicit-statement-only bar over a plausible-sounding structural inference.

### Researched, real evidence found, not safely enumerable this pass (2 programs — well-scoped for one more fetch, not guessed at)

- **TechGirls (fellowship)**: official page confirms "111 young women from 37 eligible
  countries/territories" for 2026, explicitly naming Türkiye as one — but the full 37-country
  enumeration lives on a specific Eligibility & Application subpage this pass could not
  successfully reach (one fetch returned only page navigation, a guessed direct URL 404'd).
- **Erasmus+ Youth Exchanges**: the official Programme Guide fetched successfully and confirmed a
  genuinely non-flat structure — full EU27 membership, plus named "Third Countries Associated to
  the Programme" (North Macedonia, Republic of Türkiye, Republic of Serbia, Norway, Iceland,
  Liechtenstein), plus conditionally-eligible "Partner Countries" admitted "in duly justified
  cases," plus current EU-policy restrictions on Russia, Belarus, and (recently) Georgia. **Left
  null deliberately, not for lack of evidence** — RULE-ELIGIBILITY-009 is exactly on point: a flat
  `eligible_countries` array would misrepresent a structure with full vs. conditional eligibility
  tiers. The existing `citizenship_restrictions` text was independently confirmed accurate by this
  fetch; a future pass could usefully tighten its wording with the named Programme-country list —
  a `citizenship_restrictions` edit, not an `eligible_countries` one, and out of this pass's scope.

Full per-row detail for all 24: `data/research/opportunities/eligible_countries_step2_2026-08-22_batch1.sql`.

## Why the yield is small, and why that's correct

Combined Step 1 + Step 2: **43 rows individually researched to this project's evidence bar, 14
written.** That is not a low success rate by this methodology's own standard — it matches the
prior R4 eligibility-audit's own experience almost exactly (*"32 of 102 rows (31%) yielded... value;
the other 70 genuinely had no extractable value for the fields checked — that is an expected,
correct outcome under this methodology, not a shortfall,"* `docs/research/opportunity-eligibility/
extraction-audit-sample.md`). `eligible_countries` specifically is a sparse field to derive safely:
most opportunities either don't gate on nationality at all (confirmed repeatedly today, including
against a strong prior expectation for Turkish institutional programs) or gate on it in a way too
compound/conditional for a flat array (Erasmus+, CBS, UWC Short Courses).

**One methodologically useful calibration from today's Step 2 batch**, worth carrying into future
waves: of the ~19 rows fetched fresh with *no* prior restriction-text signal, 1 yielded a positive
write (~5%), ~26% resolved to confirmed-open, and the rest were genuine "checked, nothing stated."
Explicit restrictions concentrated heavily among **need-based, government-funded, or
security/military-adjacent programs** (US federal scholarships, MIT/defense-adjacent research
programs, UK state-school-funded schemes, national UWC committees) — every one of the 5 additional
"likely-domestic" university/organization camps checked this pass (JAX, BRI, Colorado Mines,
Barrett/ASU, UT Austin WiSTEM) came back with **no** citizenship gate at all. Future waves should
weight toward the first category and expect a low return from generic paid university summer camps.

## Incidental findings (recorded per this project's negative-findings discipline, not acted on — out of this lane's scope)

- **Duplicate pair**: "The Diamond Challenge" (`30a605ab`, category `competition`) and "Diamond
  Challenge" (`cb1ae3e2`, category `entrepreneurship`) are the same program (same organization,
  same official-URL domain). Not merged by this lane.
- **Garbled/multi-program scrape rows** — a different class of problem than eligibility research
  (the underlying record itself is corrupted, not just missing a field), flagged for whoever owns
  general opportunities data quality:
  - `69be38ed` "Robomaster High School Summer Camp (Shenzhen, China)" — description blob mixes in
    unrelated University of Nottingham Malaysia and SCAD Hong Kong program text.
  - `b10444c7` "Summer Programs in the Netherlands - 2025" — title says Netherlands, description
    body describes an Italian program ("Universita id (Milan, Italy)... Summer's Cool").
  - `87f773f9` "York University Helix Summer Science Institute (ON, CANADA)" — description ends
    mid-sentence with a stray "EUROPE" token, a scrape artifact.
- **Istanbul Bilgi University** — a search-summary claim that the university had been "closed by
  decree" was checked directly against the live official homepage and found false; the university
  is open and operating. Recorded because a counselor or student encountering that same
  search-summary claim elsewhere should not treat it as true.
- **İTÜ Lise Yaz Okulu** — incidentally confirmed current 2026 session dates (July 6–17 and
  July 20–31) and a registration deadline (July 16) while checking eligibility. Not applied to any
  column by this lane (outside `eligible_countries` scope) — flagged for whoever next touches this
  row's `deadline`/`start_date`/`end_date`.
- **TechGirls duplicate** (`7081b03a` active vs. `58d2e707` disabled, same `techgirlsglobal.org`
  URL) — already correctly resolved as disabled per `docs/research/verification/
  opportunities-verification-2026-08-22.md`'s prior pass; not re-litigated here.

## Scoped plan for the remaining 352 null rows

Current breakdown of what's left:

| Category | Remaining null | `verified_current` + `high` confidence | Already has restriction-text signal |
|---|---:|---:|---:|
| summer_program | 240 | 72 | 18 |
| competition | 66 | 33 | 9 |
| research | 12 | 6 | 0 |
| student_program | 6 | 6 | 3 |
| online_program | 6 | 6 | 0 |
| volunteering | 5 | 4 | 3 |
| fellowship | 4 | 4 | 2 |
| entrepreneurship | 4 | 3 | 0 |
| academic_program | 3 | 0 | 0 |
| scholarship | 2 | 1 | 1 |
| conference | 2 | 2 | 2 |
| internship | 2 | 1 | 0 |

The 38 rows with existing restriction-text signal (Bucket 1's leftovers) have **already been
individually reasoned through this pass** (see "Rows deliberately NOT touched" above) — they are
not a queue for a future wave, they are closed decisions, each with its reason recorded.

**Wave 2 (next, ~20 records, highest expected yield):** the small, high-legal-stakes categories —
remaining `research` (12), `scholarship` (2), `fellowship` (4), `internship` (2) — plus a retry of
TechGirls' and Erasmus+'s specific unresolved sub-questions above (each is a single well-targeted
fetch away from closing cleanly). These categories are rare enough in the catalogue that full
coverage is cheap, and (per counselor-core's own reasoning) scholarships/fellowships are exactly
where a wrongly-shown-as-eligible row does the most damage to student trust.

**Wave 3 (~25 records):** remaining `competition` (66, minus the 9 already resolved this pass ≈
57 candidates) — national Olympiad/team-selection competitions historically correlate with
citizenship gates (confirmed today: USACO's team-selection sub-track, EUCYS's nomination
mechanism) more than generic open competitions do; prioritize by that signal, not by title
keywords (Step 1 showed 0% yield from keyword matching).

**Wave 4 (bulk, ~150–200 records, expect low per-record yield based on today's ~5% calibration):**
the large `summer_program` tail. Recommend batches of ~20–25 the same way the DE/NL
requirements/deadlines research ran its waves, explicitly budgeting for a low hit rate rather than
treating a mostly-negative outcome as a research failure. A parallel, cheaper alternative worth a
product decision (not decided by this lane): capture this field **at intake time** for newly
discovered opportunities going forward, rather than only backfilling the existing corpus — the
per-record cost is much lower when a researcher is already reading the official page for the first
time than when a second pass has to revisit it cold.

**Wave 5 (Turkish institutional/government pages specifically):** this pass's 403/TLS-failure rate
against `.org.tr`/`.gov.tr`-adjacent domains was high (UWC Türkiye, İstanbul Kent Konseyi). A future
pass with browser-based fetching (rather than the automated `WebFetch` tool used here) would likely
succeed where this pass had to fall back to WebSearch-indexed excerpts or came back empty —
consistent with `docs/research/opportunities-turkey/README.md`'s own documented experience with the
same domain class.

**Not a Wave — a separate queue**: the 3 garbled/multi-program scrape rows and 1 duplicate pair
under "Incidental findings" need re-research/dedup, not an eligibility lookup. Recommend routing to
whoever owns general `opportunities` data quality rather than folding into an eligibility wave.

## Reconciling with prior R4 research

`docs/research/opportunity-eligibility/extraction-audit-sample.md` (2026-08-21) deliberately left
`eligible_countries` null on QuestBridge, reasoning *"eligible regardless of which country a US
citizen/PR lives in."* This pass populated it as `['United States']` instead, on the strength of a
direct comparison: the already-live Davidson Fellows row (`5589e4c8`) has the near-identical
citizenship shape ("U.S. citizens residing in the U.S., U.S. permanent residents, or active-duty
U.S. military stationed overseas") and is already recorded as `eligible_countries: ['United
States']`. Matching QuestBridge to the convention the table already uses, rather than leaving it as
the one inconsistent exception, seemed the more defensible reading of "eligible_countries = the
citizenship/domicile-gating country" as this table's own established semantics — recorded here as a
deliberate, evidence-based departure from the prior pass's more cautious call, not an oversight of
it.

## Validation

- Live count re-verified independently before starting (matched the coordinator's 366/391 snapshot
  exactly) and after each write (13 after Step 1, 1 after Step 2 — both matched the guarded `UPDATE`
  predicate's expected row count exactly, confirmed via dry-run-then-commit for Step 1).
- Both SQL files are idempotent by construction — every `UPDATE` is guarded by
  `id = X AND (eligible_countries IS NULL OR eligible_countries = '{}')`; re-running either file
  against the current (already-updated) live table is a safe no-op.
- No schema changes, no migrations, no application code touched — pure data content backfill, per
  `docs/MASTER-EXECUTION-STRATEGY.md` §5's allowance for data-only packages.
- Country-name spelling matched the table's own existing convention (`SELECT DISTINCT` run before
  writing: "United States", "United Kingdom", "Türkiye" — not "USA"/"UK"/"Turkey").
