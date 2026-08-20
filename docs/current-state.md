# ORYN Current State

This file is the single short operational source of truth. It is rewritten, not appended
to, at each integration checkpoint — history lives in `docs/handoffs/*` and git log, not
here. Every number below was measured live against the working `oryn-qa-scratch` Supabase
project on 2026-08-19, not copied from an earlier doc. If this file and a handoff doc
disagree, this file is newer and wins; if this file and the live database disagree, the
database wins and this file is stale — re-measure before trusting either.

## Repository

- main HEAD: `2b9796c` — "merge: integrate university-intelligence-spine, programs-pipeline-
  reconciled, and selected product-ux/programs-opportunities-intel work" (the prior integration
  checkpoint; `b92c72f` referenced by an earlier version of this file was stale — this repo's
  own `git log` is authoritative, not a doc snapshot).
- feature branch: `oryn/counselor-core-v1` (off `main` @ `2b9796c`), pushed, **not merged** —
  Counselor Core (see Product Direction below). Clean, all commits logical units, no force-push.
- date: 2026-08-19

## Product Direction

The database (universities, programs, opportunities) is infrastructure, not the product.
The product is the counselor loop:

```
VERIFIED DATA -> STUDENT UNDERSTANDING -> GAP DETECTION -> RECOMMENDATION
-> ACTION -> OUTCOME -> UPDATED RECOMMENDATION
```

"Here are 1,000 universities" is not the goal. "Your research is weak relative to your
leadership, here are three things worth doing about it this week" is. **Counselor Core is now
built** on `oryn/counselor-core-v1` (not yet merged to main) — see `docs/counselor-core.md` for
the full technical reference. Deterministic gap-detection -> candidate-generation -> eligibility
-> ranking -> evidence pipeline, fully TDD'd (100+ new tests), zero LLM dependency for the core
loop; an optional LLM narration layer sits on top, never required. Not yet live/browser QA'd — a
concurrent session held the only `next dev` lock for this entire build; verification is
typecheck + full test suite + production build only. See the branch's completion report.

## University Data

- Total `universities` rows: **1,019** (floor-checked, `npm run check:university-spine-health`)
- Canonical/display-active (superseded rows excluded): **1,010**
- Images: 721 real verified (71.4%) / 98 official-logo fallback / 191 ORYN-branded fallback
  / 0 broken — **1,010/1,010 display-safe**. 180 need-review (rejected: 106 too_small, 52
  portrait-or-near-square, 13 extreme-panorama, 9 download-failed), 109 no candidate ever
  found.
- Tuition/cost coverage: **163/1,019 (16.0%)** on `tuition_*_annual`. Germany and
  Netherlands are 100% (national-scale statutory-fee sources); most countries are still
  0% — no scalable official source found yet, not a bug. Separately, US `cost_of_attendance`
  covers 127 institutions via IPEDS (a different concept from tuition, never merged with it
  — see any `acquire-university-statistics-*.ts` header).
- Research topics (`research_topics_top5`, OpenAlex): 923/925 of institutions with an
  OpenAlex match, per the last full re-acquisition pass (`claude-a-university-spine.md`).
- Sources/provenance: every published fact carries `source_url` + `retrieved_at` via
  `university_sources` / `university_profile_metrics`; `SourceBadge` renders it on the
  detail page. No fabricated statistics — missing data renders "Unavailable", not a guess.

## University Programs

- `university_programs`: **198 rows, 100% `verified_current`**, 0 missing
  `official_program_url` or `source_url`, 0 duplicate-key candidates.
- Universities represented: **49** of 1,010.
- Subject mix (verified_current): economics 51, computer_science 33, business 24,
  engineering 21, other 22, and 12 smaller categories.
- Country mix: UK 43, US 38, Netherlands 24, Turkey 24, Italy 20, Germany 18,
  Switzerland 16, France 15 — eight countries, no coverage yet outside them.
- `program_research_queue`: 262 candidates across 7 batches — 201 accepted (76.7%), 32
  unresolved_university, 29 insufficient_evidence.
- Known blocker: a genuinely new, uncommitted, deterministic (no-LLM) official-catalogue
  HTML extraction pipeline (`lib/acquisition/programs.ts`, `scripts/acquire-programs.ts`)
  was found and rescued this session — see Next Phase. It is a second, complementary
  acquisition method (official catalogue scraping) alongside the existing research-handoff
  JSONL ingestion path (`lib/programs/ingest.ts`), not a duplicate of it; not yet wired into
  `package.json` or run.

## Opportunities

- Total: **290**.
- Verification: 64 verified_current (22.1%), 1 verified_historical, 225 unverified (77.6%).
- Cycle status: 11 open, 14 upcoming, 18 closed, 12 date_not_announced, 1 historical, 234
  unverified (80.7%).
- Selectivity: 251 unknown (86.6%), 16 highly_selective, 12 selective, 5
  extremely_selective, 5 open_enrollment, 1 competitive_award — never displayed as false
  precision.
- Data gaps, honestly stated rather than backfilled with guesses: 277/290 (95.5%) missing
  `deadline`, 290/290 (100%) missing `eligible_countries`, 221/290 (76.2%) missing an
  organizer link/name. 0% missing `source_url`.
- No image columns yet on `opportunities` or `university_programs` — deliberately deferred,
  university images shipped first.
- A same-day (2026-08-18) sequential write pattern is worth knowing about, not a live bug:
  Claude 2's own opportunity-mining session measured 52 rows mid-session; a separate,
  founder-directed bulk Drive-corpus import ran afterward and took live count 69 -> 290. The
  290 figure above is what's live now. Dedup during that import relied on title-similarity
  only — a live duplicate-title spot-check is worth doing before citing 290 as fully deduped
  (not done this session; low-confidence-but-plausible risk, not a confirmed defect).

## Canonical Entity Health

- **9 confirmed duplicate university pairs** (MIT, UCL, HKUST, LSE, Warwick, UTS, University
  of Newcastle Australia, Al-Farabi Kazakh National University, KFUPM) — merged at the
  *identity* layer (`canonical_entity_id`, migration 0038) and, since migration 0043 can't
  be applied yet (see Migrations), also suppressed at the *application* layer:
  `lib/universities/canonical.ts` (`canonicalUniversityId()`, `isSupersededUniversityId()`,
  `getSupersededUniversityIds()`, `excludeSupersededUniversities()`), backed by the
  generated `lib/universities/duplicate-supersessions.json`. Live-verified this session:
  searching/browsing "UCL" returns University College London exactly once; navigating
  directly to a known superseded row's URL redirects to the canonical row and renders its
  full detail page (programs, stats, sources) correctly.
- 16 read surfaces already filter through `canonical.ts` (browse, search, detail-page
  redirect, target-university writes, `EntityCombobox`, global search, applications,
  dashboard, Advisor context, both deadline jobs, the new `UniversitySearchBox` typeahead).
  One gap found and fixed this session: `lib/requirements/discover.ts`'s
  `getUniversitiesNeedingRequirementDiscovery` did not exclude superseded rows, so a
  scheduled discovery run could spend a Tavily+AI call on a row no product surface shows —
  now filtered the same way. `lib/universities/sync-us-universities.ts` and ~10 dev/admin/
  report scripts still don't filter; accepted as low-priority (not live student-facing
  reads).
- Entity audit (`npm run entities:audit`) flags a further set of *possible* near-duplicate
  names for human review (e.g. "Université PSL" vs "Université Paris Dauphine - PSL") —
  correctly not auto-merged; matches founder-blocked-backlog item 19 (43 exact-name orphan
  pairs, investigated, zero product impact, still queued).

## Product

Live-verified in-browser this session (authenticated session, real data, no mocks):
Home dashboard (Career Profile score + trend, biggest-gap card, opportunity/university
previews), University Explorer (world map with country fill + labels, region/country
browse, live typeahead search, filters, real campus images, QS-ranking sort), university
detail page (canonical redirect, student-size/admission-rate/cost-or-tuition/test-scores/
graduation-rate stat cards, grouped Programs section, Research strengths, Requirement
check, Sources), Opportunities (personalized matches with real match reasoning and honest
verification-state caveats in the copy itself), global `/search` (universities +
opportunities + profile, deduped).

Known issue, not new: the weekly-plan AI generation on the dashboard fails visibly
("We couldn't generate this week's plan") because `ANTHROPIC_API_KEY` is billing-blocked —
this is the existing, documented, honest-degradation behavior (Rule 4: no fake data on
failure), not a regression.

Not exercised this session (needs a founder credential unblock first — see below):
signup/login as a *new* account, messaging between two accounts, `/admin`, account
deletion, applications CRUD, connections.

## External Service Status

Measured live via `npm run check:integrations`, this environment, 2026-08-19:

| Service | Status |
|---|---|
| Supabase (anon key) | OK |
| Supabase (secret key) | OK |
| Anthropic | Blocked — 400, insufficient credit balance (billing, not a missing key) |
| Tavily | Blocked — HTTP 432, plan usage limit |
| College Scorecard | Missing credential (optional; US stats obtained via a public bulk CSV workaround instead) |
| OpenAlex | OK (keyless) |

Both credential values (Supabase secret key, Anthropic key) were reported inconsistently
across sessions/worktrees earlier this week — resolved by measuring directly in this
environment rather than trusting either prior claim; the table above is this environment's
actual current state.

## Migrations

- Latest on `main`: **0045** (`0045_opportunity_online_program_category.sql`). **0046**
  (`0046_advisor_message_failure_state.sql`, additive: `advisor_messages.status`/`error_message`,
  `content` now nullable) exists on `oryn/counselor-core-v1` only, not yet merged, not yet applied
  to any live database — same no-DDL-access constraint as 0043 below. Syntactically reviewed,
  pattern-consistent with 0043/0044/0045's own additive `ALTER TABLE`s, not live-tested.
- Full sequence: 0001-0042 unchanged from main. **0043** = `university_duplicate_supersession`
  (spine's; written, NOT yet applied to any live database — no DDL access in this
  environment, founder-blocked-backlog item 25). **0044** = `university_programs_enrichment`
  (programs-pipeline-reconciled's; content confirmed **already applied live** under its old
  filename/number before renumbering — verified safe via Supabase's migration-history table,
  which tracks by synthetic version, not filename, per `docs/handoffs/claude2-programs-
  opportunities.md`). **0045** = new, additive, not yet applied (`alter type ... add value
  if not exists`, safe to re-run).
- **The 0043 collision, explained**: `oryn/university-intelligence-spine` and
  `oryn/programs-pipeline-reconciled` each independently created a different migration
  numbered 0043. `oryn/programs-opportunities-intel` had already merged spine in and hit
  this exact collision, resolving it by keeping spine's `duplicate_supersession` at 0043 and
  renumbering the programs migration to 0044 (content byte-identical, diff-confirmed). This
  integration followed that same precedent rather than inventing a new one. A third, older
  migration — `oryn/programs-pipeline`'s (pre-reconciliation) `0042_university_programs_
  enrichment.sql` — is fully superseded by 0044's content and was never a live candidate.
- QA DB state: 0001-0042 applied (confirmed via the 2026-08-16 live-database-reconciliation
  pass, `docs/live-db-reconciliation.md`); 0043 written and blocked; 0044's content already
  live under its prior number; 0045 not yet applied. **The current QA DB is not assumed
  identical to a fresh migration run** — this section states the actual known divergence
  rather than assuming one.

## Tests

```
On main (2b9796c):
npm run lint          -> clean, 0 warnings/errors
npm run typecheck     -> clean (tsc --noEmit)
npm run test          -> 884/884 passing (79 test files)
npm run build         -> succeeds, 39 routes compiled
npm run check:integrations         -> see External Service Status above
npm run check:university-spine-health -> 9/10 checks PASS; 1 FAIL is the known,
                                          expected, already-documented 0043-blocked
                                          canonical_entity_id sharing (9 pairs) —
                                          not a regression

On oryn/counselor-core-v1 (not yet merged):
npm run lint          -> clean, 0 warnings/errors
npm run typecheck     -> clean (tsc --noEmit)
npm run test          -> 994/994 passing (88 test files) — 100+ new, all TDD'd
npm run build         -> succeeds, 39 routes compiled
```

Live browser QA: see Product section above — genuinely exercised in a real authenticated
session on `main`, not simulated. Full new-account/messaging/admin flows remain
code-reviewed-only, blocked on the founder actions below. **Counselor Core specifically has
not been live/browser QA'd** — a concurrent session held this environment's only `next dev`
lock for the duration of this build; killing another session's dev server unilaterally was
judged too risky. Do this before merging to main.

## Founder Actions Required

Only items Claude cannot do. Full detail and reasoning for each: `docs/founder-blocked-
backlog.md` (25 items) and `docs/qa-environment-readiness-audit.md`.

1. Disable "Confirm email" on the QA Supabase project (Authentication -> Providers) — single
   highest-leverage unblock, enables full new-account browser QA.
2. Add billing credit to the Anthropic account (key is present; failure is 400
   insufficient-credit, not a missing key) — unblocks the Advisor, weekly plans, CV
   extraction, requirement/opportunity AI-structuring.
3. Resolve the Tavily plan-usage limit (HTTP 432) — unblocks `admissions_url` acquisition
   (~413 universities still missing it) and opportunity/requirement discovery jobs.
4. Grant DDL access (or apply directly via the Supabase SQL editor) so migration 0043 can
   finally be applied — moves the 9 duplicate pairs from application-layer suppression to
   the correct schema-layer fix, and unblocks 0044/0045 being formally recorded as applied
   too.
5. The remaining 21 founder-blocked-backlog items (QA accounts, `is_admin` grant, legal
   review, hosting/deploy choice, error-monitoring provider, scholarship-sourcing policy,
   QS-ranking licensing position, etc.) — see that file directly, not reproduced here to
   avoid a second copy going stale.

## Next Phase

Recommended order, highest-leverage first:

1. **Live/browser QA `oryn/counselor-core-v1`, then merge it.** The dev-server lock that
   blocked this during the build should be free now — run the Advisor page end to end
   (sufficient profile, near-empty profile, zero-recommendation state, the failed-message
   retry flow), confirm `npm run test`/`build` still green, then merge via the normal
   non-force workflow. See `docs/counselor-core.md` for exactly what to check.
2. **Apply migration 0046** (`advisor_message_failure_state`) once DDL access exists — same
   blocker as 0043 below, same fix (founder SQL-editor pass or granted DDL access).
3. **Wire and run the rescued programme-catalog pipeline** (`lib/acquisition/programs.ts` +
   `scripts/acquire-programs.ts`) — add an `acquire:programs` package.json script, decide
   how its deterministic HTML-extraction output merges with the existing research-handoff
   JSONL ingestion path (`lib/programs/ingest.ts`) rather than running as a second,
   uncoordinated pipeline.
4. **Apply migration 0043** once DDL access exists, then run the one-time script that moves
   the 9 duplicate pairs from `duplicate-supersessions.json` into
   `duplicate_status`/`superseded_by_id`, and delete the generated-file workaround.
5. **Opportunity data quality**: fill `deadline` (277 missing) and `eligible_countries` (290
   missing) — these gate real matching/eligibility logic that currently can't be fully
   trusted (Counselor Core's own output is directly bounded by this — see
   `docs/counselor-core.md`'s Data-quality limitations section); spot-check the 290-count
   for title-similarity dedup misses from the 2026-08-18 bulk import.
6. **Production readiness**: legal review (COPPA/GDPR for minors), hosting + error-
   monitoring provider choice, CI running lint/typecheck/test on push — all founder
   decisions or founder-unblocked, listed in Founder Actions Required above.
