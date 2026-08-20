# Claude A — University Intelligence Spine — live handoff

Owner: Claude A. Scope: `universities`, `university_rankings`, `university_profile_metrics`,
`university_sources`, `university_deadlines`, `canonical_entities`/`entity_*` for
entity_type='university', and the `lib/acquisition/*` pipeline. **Not** in scope:
`university_programs`, `university_requirements` (read-only), `opportunities`,
`opportunity_sources` — owned by the parallel programs/opportunities workstream
(`oryn/programs-pipeline-reconciled`, HEAD `955865c` as of this session).

This file is updated as work lands, not chronologically archived — read top-to-bottom for
current state, not as a session log.

## Current state

- Branch: `oryn/university-intelligence-spine`, pushed to origin, tracking. Base: `main` @
  `b92c72f` (the tip when the first session started; contains the Phase 2 verified-acquisition
  architecture and the live full-spine run from the prior session).
- Latest commit on this branch: `99c54da` (this handoff update). See `git log` for the full,
  authoritative commit list rather than this paragraph — it was accurate as of `3397186` (end
  of session 2) but hand-enumerating every commit since is exactly the kind of thing that goes
  stale; Phase 10 below covers the most recent substantial work (the Explorer P0 package,
  `fd22716`/`fce1ce8`/`99c54da`) in prose instead.
  **Closed the loop with Claude B**: their branch (`oryn/programs-pipeline-reconciled`, now at
  `ca20671`) confirms the strategic-expansion batch was received and consumed successfully —
  `universities` 1010 → 1019 matched exactly, École Polytechnique resolved as its own row per
  the recommendation above, and 30/32 of their previously-blocked program candidates are now
  ingested (the other 2 are a genuine page-retrieval issue on their side, not a registry
  problem). See their `docs/handoffs/claude-b-to-claude-a.md` (on their branch) for the
  "RESOLVED" confirmation banner they added. Nothing further needed from this side.
- `SUPABASE_SECRET_KEY` is live and working this session (`check:integrations`: Supabase +
  secret key OK). **No Supabase MCP and no linked CLI/direct-Postgres access in this session**
  — DDL (migrations) cannot be applied by me; only PostgREST reads/writes and existing RPCs
  (e.g. `merge_canonical_entities`) are reachable. This is the one hard capability gap this
  pass ran into.
- **Tavily: was working all of this session (drove `admissions_url` from ~36% to 40%), then
  hit `HTTP 432` — "This request exceeds your plan's set usage limit. Please upgrade your plan
  or contact support@tavily.com."** Confirmed with a direct `curl` against `api.tavily.com`,
  not just the acquisition script — a genuine plan-level usage cap, not a bug, not ordinary
  rate-limiting (which the script already retries around via its circuit breaker). See
  `docs/founder-blocked-backlog.md` item 6. Blocks all further `acquire:admissions` batches
  (413 universities still missing `admissions_url` as of this pass) until the plan resets or
  is upgraded. No fallback heuristic was built to route around this, per this repo's own
  standing rule against unsafe substitutes for a billing/plan blocker.
- Anthropic: `check:integrations` reports **"insufficient credit balance"** (billing, HTTP
  400), not a missing-key error — a founder billing action, not a code problem. Blocks
  AI-structured admissions/requirement extraction.
- **OpenAlex — recovered, full-spine re-run done, 2026-08-18.** Was HTTP 429 (`"Insufficient
  budget... $0 remaining. Resets at midnight UTC"`) as of 2026-08-17 ~14:30 UTC; `check:
  integrations` later showed it healthy again. Re-ran `acquire:universities -- --from-db`
  (all 1019 live universities, not just the 30-roster pilot): `ror ok=1018 failed=1`,
  `openalex ok=940 failed=1` — circuit breaker never tripped this time. `research_topics_top5`
  now resolved for 923/925 (was 30/1010). Reviewed with `--plan` before writing (conservative
  precedence held throughout: ~70 `city` cross-registry disagreements and 4 `research_topics_top5`
  same-date-different-order conflicts correctly withheld, never guessed), then `--apply`:
  **904 fact writes, 4556 cross-registry external ids upserted.** Verified live via direct
  PostgREST count (`university_profile_metrics` where `metric_code=eq.research_topics_top5`:
  925 rows) rather than trusting the script's own log alone. `official website` coverage now
  91.6% (was lower pre-this-pass). `npm run check:university-spine-health` still reports its
  one known, pre-existing, expected FAIL (the 9 P0-merged pairs still share a
  `canonical_entity_id` at the `universities` row layer — blocked on migration 0043, unrelated
  to this run, not a regression). Regenerated fixture committed (matches this repo's own
  established "regenerate full-spine fixture, apply the delta" pattern from `9aef391`).
- **HESA (UK national student-count dataset) is Cloudflare bot-protected** — `HTTP 403` with
  `cf-ray`/`__cf_bm` challenge headers on both the main site and direct CSV asset URLs
  (`hesa.ac.uk/data-and-analysis/sb271/figure-*.csv`), confirmed via `curl` with a realistic
  browser user-agent, not just `WebFetch`. This is not a founder-fixable credential gap — no
  key or account unlocks someone else's bot detection — so it doesn't belong in
  `founder-blocked-backlog.md`; recorded here as a real, investigated dead end so a future
  session doesn't re-attempt the same request. See "Phase 3 continuation" below for what was
  tried and the country-priority gap this leaves open.
- **`university_statistics` was completely empty — 0 rows — until this pass, 2026-08-18.**
  Founder asked directly why "Admission rate"/"Cost of attendance" always show "Unavailable"
  on the detail page; checked the table rather than guessing and found nothing had ever
  written to it. The same College Scorecard bulk file `enrich-student-counts-us.ts` already
  downloads and verifies has `ADM_RATE`/`SATVR25/75`/`SATMT25/75`/`ACTCM25/75`/`COSTT4_A`/
  `C150_4` columns too — spot-checked Harvard/MIT/Princeton against known real figures before
  trusting it (Harvard: 3.65% admit, $85,540 cost, 97.58% grad rate — all correct). New
  `scripts/acquire-university-statistics-us.ts`: 128/131 US universities matched (25 via the
  shared flagship-campus override table), 128 written, US `admission_rate`/`cost_of_attendance`
  coverage 0 → 128/1019. Real bug caught building this: a first draft imported
  `FLAGSHIP_UNITID_OVERRIDES` directly from `enrich-student-counts-us.ts` — every script here
  runs `main()` unconditionally at module load, so that import silently re-ran the *entire*
  enrollment pipeline (re-download, re-match, its own dry-run print) as a side effect, visible
  as oddly-merged console output before it was understood. Fixed at the root: extracted the
  shared constants into `lib/acquisition/college-scorecard-overrides.ts` (a plain module, no
  side effects) and pointed both scripts at that instead. Verified live (MIT: admission rate
  "5%", cost "$82,730" — matches `Math.round(0.0455*100)` and the stored `82730` exactly).
  Non-US cost data (the vast majority of the spine) is a real, separate, much harder problem —
  no single global source the way College Scorecard covers the US — not started this pass.
- **`qs2027_import_staging.size_code`/`institution_status` — real fields sitting unused since
  the table was first imported, found while looking for a global (non-country-by-country)
  student-size signal.** `grep -rl qs2027_import_staging scripts/ lib/` was zero hits before
  this pass. `size_code` is QS's own official S/M/L/XL institution-size band (FTE degree-
  seeking student body; QS doesn't publish the numeric thresholds — confirmed via web search,
  their own support docs 403 automated fetches), populated for all 1000 staged rows.
  `institution_status` (Public/Private not for Profit/Private for Profit) is populated for
  987/1000. **Exact join, zero fuzzy name-matching**: `qs2027_import_staging.list_position` is
  the same `list_position` already stored on `university_rankings` (confirmed live —
  `list_position=1` is MIT on both sides) — staging → rankings.list_position →
  rankings.university_id, no string comparison anywhere in the path.
  New `scripts/acquire-qs-institution-profile.ts`: 999 `qs_size_category`
  `university_profile_metrics` rows written (a new, separate metric — never touches
  `total_students`/`student_size`, a coarse band isn't a substitute for an exact headcount),
  plus 238 `universities.institution_type` fills (`fill_if_null` only — never overwrites the
  richer hand-researched text already there for 764 rows, same reasoning that earlier
  rejected pulling this from ROR's much coarser "education"/"funder" vocabulary). Coverage:
  `institution_type` 764/1019 (75.0%) → **1002/1019 (98.3%)**. Sanity-checked before trusting
  (Caltech = S, matches its famously tiny ~2,200-student reality; Harvard/Oxford/Cambridge =
  L, all genuinely large by FTE).
  Caught and fixed a real shared-infrastructure bug while building this: `qs2027_import_staging`
  has no `id` column (`list_position` is its primary key), and `lib/acquisition/paginate.ts`'s
  `fetchExactCount`/`fetchAllRowsVerified` hardcoded `select=id` for their lightweight count
  probe — a latent bug for any future table without a literal `id` column, not just this one.
  Fixed properly: added an optional `countColumn` parameter (defaults to `"id"`, so every
  existing caller is unaffected — confirmed via full `tsc`/test run before and after), not a
  one-off workaround in this script.
  Surfaced on the detail page too (same invisible-acquired-data problem the earlier
  `university_profile_metrics` UI fix caught): "Student size" now falls back to the QS size
  label ("Large", etc.) with a "QS size band, not an exact count" caption when no exact
  `student_size` exists — verified live (Erasmus University Rotterdam: "Large" / "QS size
  band, not an exact count"). Full gate green throughout (lint, tsc, 677 tests, build).

## Founder Requirement 2026-08-18: product-visible duplicate universities + light theme default

A new, higher-priority workstream landed mid-session: the founder reported seeing duplicate
universities live in the product (searching "UCL" surfaced both "UCL" and "University College
London"), plus two related, durable product requirements — canonical autocomplete over free text
for controlled fields, and a light/optimistic default visual identity anchored in the ORYN logo
blue. Full detail in `docs/university-surface-audit.md` (the Phase-D audit artifact); this
section is the measured-results summary the founder asked to see recorded here.

**Root cause**: `merge_canonical_entities()` (this session's own Phase 2 work) merges the
identity layer only — both sides of a merge share one `canonical_entity_id`, but the
`universities` rows themselves stay separate (FK safety). Every surface reading `universities`
filtered by `canonical_entity_id` therefore returned both rows. Migration `0043`
(`superseded_by_id`) remains the schema-correct fix and remains blocked (no DDL access this
session, unchanged all session) — so this pass built the same fix at the application layer:
`lib/universities/canonical.ts`, backed by a generated, re-runnable mapping
(`lib/universities/duplicate-supersessions.json`, `npm run resolve:university-duplicates`).

**Duplicate university count before/after**: 9 pairs / 18 rows before, unchanged after (rows are
deliberately never deleted — FK safety) — but 0 of the 9 losing rows now independently surface on
any Claude-A-owned read/write path. **Active/canonical university count**: 1019 total rows,
1010 canonical (9 pairs collapse to 9), matching `universities` count 1010 → 1019 tracked
elsewhere in this doc for an unrelated reason (the strategic-expansion batch) — these are two
independent numbers that happen to both be near 1019/1010, not the same fact.

**Surfaces audited**: 27 `.from("universities")` call sites across 20 files (full table in
`docs/university-surface-audit.md`). **Surfaces fixed** (Claude-A-owned, 16 files across the P0
and Phase D commits): University Explorer browse + country counts + search, university detail
page (now redirects a loser id to the winner), the write path (`addTargetUniversity` — the
single most important fix, since it's where a selection becomes permanent), the shared
`EntityCombobox` university-scope backend (`lib/entities/search.ts`/`resolve.ts` — dead code
today, a defused landmine for whenever a university-scoped field is added), global search
(program results, application results), applications list/detail, the dashboard's target-
university feed, the AI Advisor's context builder (also restructured off a nested-embed query
that couldn't be filtered, onto this codebase's own established batch-fetch convention), and
both deadline jobs (scan + upcoming). **Handed to Claude B**: `lib/requirements/discover.ts`'s
batch selection (their table, one-line ask in `docs/handoffs/claude-a-to-claude-b.md`). **Known,
accepted gaps**: `lib/universities/sync-us-universities.ts` and the dev-engineering scripts
(admin-only/credential-blocked, not student-facing); pre-existing bad data in
`target_universities`/`applications`, if any exists, self-heals at read time on every fixed
surface but the stored id itself isn't rewritten (a genuine Phase-Q-shaped decision, not
attempted).

**Aliases tested/fixed**: all 9 pairs' `entity_aliases` checked live; 2 real gaps found and
fixed (Al-Farabi, Warwick both had zero aliases — the losing row's name now survives as a
searchable alias of the winner, via `expand:university-spine`'s existing `ALIAS_FIXES`
mechanism, not a new one).

**University autocomplete status**: no new component built. `features/entities/entity-
combobox.tsx` (`EntityCombobox`) already is a production-ready, reusable, accessible
(debounced typeahead, keyboard nav, a11y roles, city/country subtitle disambiguation, custom-
fallback with duplicate detection) selector, generic across entity scopes including
`university` — confirmed by reading it directly rather than assumed. Its `scope="university"`
backend was the exact dead-code landmine fixed above. Not currently wired to any live field (no
UI location needs it — target-university selection goes through the now-fixed Explorer search/
browse instead), so nothing to demo, but the infrastructure is correct and ready.

**Test-score selector / coursework autocomplete status (Phase G/H) — built, wired, verified
live**: schema confirmed first (`types/database.ts`'s `TestScore.test_name`/`score`/`max_score`
are all plain `text`, deliberately — score formats are genuinely heterogeneous across tests, not
an oversight). Decided against the obvious-looking `"entity"`/`EntityCombobox`/
`canonical_entities` mechanism (architecturally the first thing to reach for, used for schools/
employers) — tests and course subjects are small, closed, mostly-static vocabularies, and that
registry's alias/dedup/verification-state machinery is built for open-ended, growing real-world
organizations, not a fixed list. Also found `COURSE_FIELDS.level` was already a proper `select`
(AP/IB HL/SL/A-Level/Honors/Regular/Dual enrollment/Other) — the founder's own "AP
Microeconomics" example was really about `subject` (free text) and `course_name`, not `level`.

Built `features/entities/suggest-input.tsx` (`SuggestInput`) instead: same interaction contract
as `EntityCombobox` (typeahead, keyboard nav, Escape/Enter, a11y roles) but synchronous over a
static in-memory list, no server round trip, no "id"/rejection concept — the typed text is
always the stored value, a suggestion is offered, never enforced. New `FieldConfig` variant
`"suggest"`, wired into `DynamicFormFields`. `test_name` now suggests a researched
`TEST_NAME_SUGGESTIONS` list (SAT, ACT, PSAT/NMSQT, AP, IB Predicted, IB Final, A-Level, IELTS
Academic/General Training, TOEFL iBT, Duolingo English Test, Cambridge English (C1/C2), YKS —
checked against this app's own US/UK/Europe/Turkey focus, not the founder brief's example list
copied blindly). Coursework's `subject` now reuses the existing `INTEREST_SUGGESTIONS`
(onboarding's own interest-chip list) rather than inventing a second, parallel vocabulary — DRY,
and a student's stated interests and their course subjects are naturally the same list.

No `.test.tsx` added — checked first, this codebase has zero component-test precedent anywhere;
verified live instead, matching this session's established convention. Both dialogs opened via
the same already-authenticated shared session used for the earlier P0 verification: all 8
test-name suggestions show on focus (capped, `MAX_VISIBLE=8` of the 14-item list), typing "sat"
filters to exactly SAT/PSAT-NMSQT (the founder's own literal acceptance test), selecting SAT sets
the underlying input's real DOM value to `"SAT"` (checked directly, not just the accessible-name
label, after a stale first read nearly gave a false negative — see the commit for the full
trace), and the coursework Subject field shows the same Economics/Business/Computer Science/...
suggestions onboarding uses. Both dialogs canceled rather than saved (real account data via a
shared session, not a fixture).

**Other free-text traps (Phase I) — audited and fixed, 2026-08-18.** Read every `FieldConfig` in
`features/profile/field-config.ts` (all 7 achievement-shaped forms) plus the onboarding wizard,
classified each, checked the backing column against the migrations before touching anything (no
DDL access this session, so any fix had to work against the live schema as-is):

- **Already correct, no change** — `organization` across every section (activity/project/
  award/research/volunteering/work/certification) is already `type: "entity"` with
  `allowCustom: true`, properly a CONTROLLED ENTITY via the canonical registry; `curriculum`,
  `stage`, `course_level`, `employment_type`, `activity_category`, `research_output_type`,
  `sport_level`, `skill_category`, `goal_status` are all `type: "select"` backed by a real DB
  enum (checked each against its migration). The founder brief's own example list
  ("organizations") turned out to already be handled — worth confirming rather than assuming a
  gap existed.
- **Fixed, converted `"text"` → `"suggest"`** (all five backing columns are plain `text` in
  Postgres with no CHECK constraint — confirmed in `supabase/migrations/0002/0003/0004`, which
  rules out `"select"`: `dynamic-form-fields.tsx`'s select case has no fallback for a stored
  value outside its options list, so forcing a hard select on a non-enum column would silently
  blank any existing free-text value the moment a student reopens the edit form):
  - `EDUCATION_FIELDS.country` and the onboarding wizard's own `country` input (`profiles.
    country`, same fragmentation risk, higher blast radius — every student sets this at
    signup) → new `lib/vocabularies/countries.ts`, ~195 common English short names.
    Concretely useful beyond cosmetics: `EntityCombobox`'s school search does
    `.eq("country", context.country)` (`lib/entities/search.ts:153`) — a school search
    currently silently degrades for any student whose typed country string doesn't
    byte-match, with no visible error. A consistent suggestion list narrows that.
  - `AWARD_FIELDS.level` → new `AWARD_LEVEL_SUGGESTIONS` (School/Regional/State-Provincial/
    National/International) — deliberately not a reuse of `SPORT_LEVEL_OPTIONS` (different
    column, different constraint, and awards don't have a "recreational"/"club" tier).
  - `RESEARCH_FIELDS.field` → reuses the existing `INTEREST_SUGGESTIONS` (zero new list —
    same DRY reasoning as Phase H's coursework subject).
  - `VOLUNTEERING_FIELDS.cause_area` → new `CAUSE_AREA_SUGGESTIONS` (Education, Environment &
    Climate, Health & Medicine, Poverty & Homelessness, Animal Welfare, Human Rights, ...).
  - `SKILL_FIELDS.proficiency` → new `PROFICIENCY_SUGGESTIONS` (Beginner/Intermediate/
    Advanced/Fluent/Native) — also the natural list for `languages.proficiency` whenever that
    table gets a CRUD UI (see gap below), not built now to keep this a pure suggestion-list
    swap, not a new feature.
  - New shared file `lib/vocabularies/profile-fields.ts` for the last three (small, related,
    didn't each need their own file the way subjects/tests did).
- **Audited, deliberately left as TRUE FREE TEXT** — `title`, `location` (all sections),
  `role`, the four `*_url` fields, `mentor_name`, `independence_level`, `academic_year`,
  `grade_value`/`grade_scale`, `score`/`max_score`, goal `category`, sport `discipline`/
  `position`/`us_specific_label`, and `SKILL_FIELDS.name` itself. That last one is the one
  genuine judgment call: skill names ("Python", "Public speaking") do fragment, but the field's
  own existing comment already documents it as an intentionally weak, self-declared signal
  (the `category` select is the actual scored/grouped axis) — curating a skills taxonomy for an
  open-ended domain would be real scope creep beyond "audit the existing inputs," not a fix this
  pass should force.
- **Gap noted, not built**: `public.languages` (`name text`, `proficiency text`) has no CRUD UI
  anywhere in the app yet — checked, zero references outside `lib/requirements/facts.ts` and
  `lib/export/tables.ts`. Not a free-text-fragmentation problem (no form exists to fragment
  anything), so out of Phase I's scope; flagged for whichever phase eventually builds the
  languages editor.
- **Small shared fix while in this code**: `SuggestInput`'s filter was plain
  `.toLowerCase().includes()` — accent-sensitive, so a country/subject typed without diacritics
  wouldn't match a suggestion stored with them. Added a local NFD-decompose accent fold (same
  technique as `lib/acquisition/normalize.ts`'s `nameKey()`, reimplemented locally rather than
  importing the acquisition-pipeline module into a client component). None of the current
  suggestion lists actually contain a diacritic (deliberately — ASCII common-name spellings
  throughout, e.g. "Turkey" not "Türkiye", matching `CURRICULUM_FIELD_OPTIONS`'s existing
  "Turkish curriculum" convention), so this is prophylactic for whatever gets added next, not
  fixing an active bug today.
- **Verified live**: `/design-preview/onboarding` (no-auth dev-only route, mounts the real
  `OnboardingWizard`) — typed "turk" into the new country field, dropdown showed exactly
  "Turkey" / "Turkmenistan", selecting "Turkey" set the underlying input's real DOM value to
  `"Turkey"` (checked directly). The other four converted fields share the identical
  `DynamicFormFields` `"suggest"` code path already proven here and in Phase G/H, just with a
  different `suggestions` array, so not each individually re-verified through an authenticated
  profile-edit flow.

**Shared components created**: `lib/universities/canonical.ts` (the application-layer canonical-
resolution layer, the actual novel infrastructure this pass built) + its generator script. No
new UI component — reused `EntityCombobox`.

**Design tokens introduced/reused**: none introduced — audited first, found the token
architecture already excellent. Extracted the real logo's pixel color (`#3a19fd`) and converted
it to OKLCH for a like-for-like comparison against the existing `--brand` token:
`oklch(0.477 0.294 272.2)` computed vs. `oklch(0.477 0.29 272)` already in `globals.css` — an
almost exact match, meaning a prior session had already color-picked the real logo precisely.
**The actual defect** (found, not assumed): `app/layout.tsx` hardcoded `dark` unconditionally on
`<html>`, with no theme toggle anywhere in the product — per an explicit prior-session
"founder-locked" comment now superseded by the current founder direction. One-line fix (remove
the hardcoded class), since `:root` already carries a fully-formed light theme.

**Light-theme surfaces verified live** (connected to the running dev server via an already-
authenticated session in a shared browser tab — no credentials entered, no account created):
marketing homepage, authenticated dashboard, University Explorer (map + search results), and a
university detail page all render light/bright/calm with the brand blue clearly recognizable in
the logo, primary CTAs, and accent icons. Incidentally re-confirmed the P0 fix in the same live
session: searching "UCL" returned exactly one "University College London" card, linking to
`/universities/03c8faf1-4b30-47fe-b09e-8851b96c1f6e` — the exact computed canonical winner id.

**Tests**: 60 test files / 677 tests, all passing (`__tests__/universities/canonical.test.ts` —
9 tests for `pickCanonicalWinner` and the runtime helpers; `__tests__/universities/duplicate-
regression.test.ts` — 34 tests covering all 9 named pairs individually and combined, plus the
"genuinely different institutions stay separate" case). `npm run lint` / `npx tsc --noEmit` /
`npm run build` all clean after every commit in this pass.

**Phase Q — checked 2026-08-18, nothing to clean up yet.** `reconcile-custom-vocabulary.ts`
extended from 3 to all 8 suggest-backed columns (`+country` ×2, `level`, `cause_area`,
`proficiency`) and re-run against live data: `test_scores`/`courses`/`education_records`/
`volunteering_experiences` are all **empty** (0 rows), `profiles` has 5 rows (2 with a country
set, already canonical), `awards` and `skills` have 1 row each. Zero candidates at any frequency
— there is no real fragmentation to reconcile because there is barely any real student data yet
(pre-launch state, expected). Re-running this script periodically as real usage grows is the
actual "Phase Q," not a one-time cleanup pass; nothing more to do against today's data. This is
also the concrete argument for where this session's time is actually worth spending right now:
student-input data quality has ~nothing to fix while the tables are this empty, so continuing
the university/opportunity **reference-data** acquisition (rankings, `admissions_url`,
`application_system`, student counts, research topics, external ids — the actual "fill the
database" work) is the higher-leverage track until real student volume exists.

**Phase O — site-wide visual sweep done, 2026-08-18, nothing to fix.** Walked every top-level
authenticated surface live against the dev server on the same shared session used for the
P1 checks: Home/dashboard, Profile, Universities (world map + a university detail page —
University College London, re-confirming the P0 canonical-id fix still holds), Opportunities
(Claude B's surface — confirms the shared-token architecture is doing its job without needing a
per-surface patch from either side), Plan, Applications, Advisor, Connections, Documents,
Settings. All light, calm, on-brand, no dark-mode leftovers, no contrast problems, empty states
all follow the spec's "help the user act" pattern. Two incidental (non-visual) findings, neither
a theme/token issue:
- ~~World map's "Asia · 0" region count — checked `lib/data/regions.ts` before assuming a bug: it
  derives strictly from `SUPPORTED_COUNTRIES`'s own curated `region` field, and only Europe has
  a drill-down projection built (the file's own header comment says so explicitly). Matches the
  product spec's own V1 geographic focus (US/UK/Europe/Turkey — Asia was never a named v1
  region) — confirmed intentional, not a gap, nothing to fix.~~ **Corrected 2026-08-18: this was
  wrong, not intentional.** A later, fresher investigation (prompted directly by the founder
  hitting the same symptom) found `SUPPORTED_COUNTRIES` was a 12-country hand-picked allowlist
  covering zero Asian countries and only 435/1019 universities total — a real, silent data bug,
  not a deliberate v1 scope decision. See Phase 10 below for the fix. Leaving this paragraph
  struck through rather than deleted: the lesson is "re-verify a prior session's own conclusion
  against live data before repeating it," not just "here's the current state."
- Advisor page has a sent message with no reply and no visible retry affordance on reload — real,
  but chat/AI-conversation logic is outside this workstream's scope. Flagged to Claude B in
  `docs/handoffs/claude-a-to-claude-b.md` rather than fixed here.

No Claude-B handoff needed for token adoption specifically — their `/opportunities` surface
already renders correctly off the same shared tokens, nothing to hand off.

**Remaining, explicitly scoped next steps**: none from the original P0-P3 backlog — P0/P1/P2/P3
are all either done or (Phase Q) confirmed not yet actionable against today's data. Next session
time is better spent on reference-data acquisition (see the Phase Q note above) than searching
for more UI work that the sweep didn't find. Commits this
pass, in order: `8247819` (P0 fix), `cccb74d` (Phase D surface fixes), `61eff71` (audit
artifact), `a55cb92` (Phase F regression tests), `3192962` (light-theme default), `c0fb731`
(docs), `b632149` (Phase G/H suggestion fields), `9648f80` (Phase I suggestion fields), Phase Q
reconcile-script extension (this commit).

## Measured baseline (live, `npm run report:universities`, 2026-08-17)

```
universities total                        1010
QS ranking                            1009 / 1010  (99.9%)
country                                1010 / 1010  (100%)
city                                   1010 / 1010  (100%)
official website                        809 / 1010  (80.1%)
admissions URL                            0 / 1010  (0%)     — migration 0042 columns exist, unpopulated
application system                        0 / 1010  (0%)
institution type                        764 / 1010  (75.6%)
description                               4 / 1010  (0.4%)
coordinates                              800 / 1010  (79.2%)
student_size (synced to UI)             283 / 1010  (28.0%)
total_students metric                   283 / 1010  (28.0%)
undergraduate/postgraduate/international/faculty_count/student_faculty_ratio metrics
                                           0 / 1010  (0%) each — no source identified yet, see below
university_programs (Claude B's)          130 rows
canonical_entities (entity_type=university, live, non-merged)   1075 (was 1083 before Phase 2 merges)
```

`undergraduate_students`/`postgraduate_students`/`international_students`/`faculty_count`
metrics: investigated and deliberately NOT built this pass. Wikidata's P2196 ("students
count") is the only reasonably-populated enrollment property for most institutions; I found
no reliable, widely-populated separate undergrad-only/grad-only property, and the closest
faculty-adjacent property (P1128 "employees") would overstate faculty count by including
non-academic staff — using it would violate this product's own "never fabricate/overstate"
rule. These four stay honestly at 0% pending either a per-institution official-source pass
(needs Tavily+AI, i.e. blocked on the Anthropic credit balance) or a better-sourced bulk
signal I haven't found yet. Not silently skipped — flagged here.

## Phase 2 — duplicate identities: done for the confirmed set

`scripts/university-duplicates-audit.ts` (pure classifier in `lib/acquisition/duplicates.ts`,
10 unit tests). Two detectors, run every time:

1. **Exact `normalized_name` collision** — 43 pairs (reproduces migration 0039's own
   self-join). Investigated in full: **every one is an orphan duplicate** — one side has
   **zero** linked `universities` rows (never got a website, external ids, or a QS ranking;
   `official_verified` with no supporting `entity_evidence` row — almost certainly the same
   root cause as founder-blocked-backlog.md item 20's "78 official_verified with no
   evidence"). **No visible product impact** (University Explorer reads `universities`, not
   `canonical_entities`, so an orphan row with no `universities` row never renders a card).
   Registry-cleanliness issue, not a user-facing bug. Not merged — no external-id evidence
   exists on the orphan side to clear the SAFE bar, and city+name alone is exactly the
   "fuzzy match" this product's rules forbid auto-merging on.

2. **Name-variant collision** (article/parenthetical-acronym-aware, via
   `nameVariants()`/`nameKey()`) — catches "The X" vs "X" and "X (ABBR)" vs "X", which
   `canonical_entities.normalized_name`'s own DB trigger does **not** fold together (bare
   `lower(unaccent())`, no article stripping). **28 pairs remain** after this pass (down
   from 34 — 6 merged). Of the original 34, exactly **6 had two real `universities` rows on
   both sides** — an actual duplicate card in the University Explorer. Combined with 2 more
   found by targeted manual search (UCL/University College London — pure acronym vs full
   name, no shared `nameVariant`; Al-Farabi — names differ too much for `nameVariants()` to
   catch) and 1 found by the Phase 5 rankings audit (KFUPM — see below), that's **9
   confirmed, live-verified, merged this pass**:

   | Institution | Winner `universities.id` | Loser (superseded, pending 0043) | Evidence |
   |---|---|---|---|
   | MIT | `03167d0c-2315-49e3-a37e-f9c9c7d2d27c` | `ba3a30b2-c6e2-4a0f-ba32-6da028175d35` | ROR `042nb2s44`, both names, live-checked |
   | UCL / University College London | `03c8faf1-4b30-47fe-b09e-8851b96c1f6e` | `cf8adcbd-7164-462e-ba76-f95ef23214ea` | ROR `02jx3x895` for the full name; "UCL" internationally unambiguous, same city |
   | HKUST | `75761b06-781d-4e7a-8e05-9d6a116771c9` | `29e16fe0-3f8f-46d3-8d34-f5fa48370a14` | ROR `00q4vv597` (not the separate real HKUST-GZ, `050h0vm43`) |
   | LSE | `cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d` | `cc117524-044e-49b9-8ddd-a628d021d3e1` | ROR `0090zs177` |
   | University of Warwick | `0b204add-2507-45b0-85f4-917e725b16c2` | `ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5` | ROR `01a77tt86` (founder-blocked-backlog.md item 25); loser's city was literally "England" |
   | University of Technology Sydney | `6c88ddfe-1b49-411f-a4e8-bb82436ae1ed` | `f1d7d625-4c39-4132-a54e-e567e1390185` | ROR `03f0f6041` (not "University of Sydney", `0384j8v12`) |
   | University of Newcastle, Australia | `54d29f0d-ce64-4342-ba0f-0d0895e36797` | `6bdd71e9-9ab3-4f64-bf9b-b6a821784115` | ROR `00eae9z71` (not UK Newcastle University, `01kj2bm70`) |
   | Al-Farabi Kazakh National University | `37f12391-462d-4aba-8947-d9cf159627cb` | `6f0df596-4ee5-49da-82ad-8057bfaa890d` | Loser's own name is self-referential ("former Al-Farabi..."); winner carries 5 external ids, loser none |
   | KFUPM | `62929169-4cb9-4ef2-b1f4-bfd1b34cf164` | `0e01bc5d-0e1e-4e35-a629-2befec4e3cb3` | Found via Phase 5 (below), not the name detectors — see that section. ROR `03yez3163` lists both "KFUPM" and the full name on one record |

   `merge_canonical_entities()` ran for all 9 (audit trail in `canonical_entity_merges`,
   `reason` column carries the full citation). This merges the **identity layer only**
   (aliases, external ids, evidence, repoints `universities.canonical_entity_id`) — it does
   **not** touch the `universities` rows, which is why the table above still lists two
   distinct `universities.id`s per row. Restored a "UCL" alias on the surviving entity
   (the merge doesn't carry a tombstoned row's own `canonical_name` forward as an alias, and
   "UCL" had no separate `entity_aliases` row of its own before the merge — would have
   silently become unsearchable otherwise).

   **Winner selection**: real data richness, not `verification_state` (empirically not a
   reliable signal — Al-Farabi's `official_verified` side was the *data-rich* one, the
   opposite of every other pair). Governing signal: **does this side already have real
   `university_programs` rows** (4 of 8 pairs did — LSE, UCL, University of Warwick, MIT, all
   on what turned out to be the data-richer side anyway) — that side always wins, since
   losing it would silently orphan the parallel workstream's data. Confirmed zero
   `university_requirements` and zero `target_universities` rows on any of the 16
   `universities.id` involved (checked read-only before acting).

### What's still open on this specific finding — needs founder action

**Migration `0043_university_duplicate_supersession.sql` is written, committed, NOT applied.**
Adds `universities.duplicate_status` (`'canonical'|'superseded'`) and
`universities.superseded_by_id`. This is the fix for the actual visible symptom (both
`universities` rows for, e.g., MIT still exist and would both still render in the University
Explorer as separate cards) — `merge_canonical_entities()` alone doesn't touch that.

Deliberately **not** a straight `DELETE` of the losing row: `university_programs` and
`university_requirements` both reference `universities(id) on delete cascade`, and 4 of these
8 losing-side candidates could plausibly gain programs/requirements from the parallel
workstream in the future even though today's read confirmed zero — an automated delete
is a standing risk to that workstream's data forever, a superseded flag is not.

**To finish, once someone with DB/DDL access is available:**
1. Apply `supabase/migrations/0043_university_duplicate_supersession.sql` (Supabase SQL
   editor, or grant this session's environment a linked CLI / Supabase MCP).
2. `npm run audit:university-duplicates -- --supersede` — already written, probe-gated
   (confirmed this session: reports "Migration 0043 is NOT applied yet" cleanly rather than
   erroring, when run against the current live state).
3. Add the `duplicate_status != 'superseded'` filter to 4 read paths + 1 dependent join
   (mapped exhaustively this session, not yet edited — holding until the column exists to
   avoid shipping a query that 400s on every request in the meantime):
   - `app/(app)/universities/page.tsx:36` (`select("*")` browse-all path)
   - `app/(app)/universities/page.tsx:41` (unfiltered country list feeding the world-map /
     region-grid explorer counts)
   - `lib/universities/alias-search.ts:83` (`searchUniversityRows()` — shared by explorer
     `q=` search AND `lib/search/index.ts`'s global command-palette search; highest leverage,
     one filter covers two surfaces)
   - `lib/entities/search.ts:111-114` (`searchUniversities()`, the entity-combobox
     university-scope dispatcher)
   - `app/(app)/universities/page.tsx:60-67` (`university_rankings` join, keyed off the
     already-fetched list above — safe once that's filtered, but a second query, so worth
     double-checking after the edit)
4. Re-run `npm run lint && npx tsc --noEmit && npm test && npm run build`, confirm the 8
   superseded rows stop appearing in `/universities` search results for their own name and
   their winner twin's name still does.

### Lower-confidence pairs — documented, correctly not acted on

- **43 exact-name orphan pairs** (see above) — candidates for a future pass once/if the
  orphan side ever gets external ids (would let the SAFE_TO_CANONICALIZE bar activate
  automatically), or as part of a broader Phase 8 pass on the "78 `official_verified` with
  no evidence" question (item 20) — these largely look like the same set.
- **28 name-variant orphan pairs — revisited and cleared, 2026-08-18.** One side had 0
  `universities` rows (zero product impact) — their `canonical_name` strings were
  byte-identical after Unicode NFC normalization (composition-form-only differences, e.g.
  precomposed `ü` vs a combining-mark form) or differed only by a non-breaking space or one
  missing diacritic. Every one had a matching city. This is the DB's own weak
  `normalized_name` trigger (plain `lower(unaccent())`, no Unicode form normalization)
  failing to catch what's structurally the same string typed/imported twice, not two
  similarly-named institutions.
  - `lib/acquisition/duplicates.ts` has `isPureEncodingVariant()` (12 tests) and a
    diacritic-insensitive `citiesCompatible()` to detect this precisely and narrowly — it
    must never fold away an actual WORD (unlike `nameKey()`/`nameVariants()`, which
    deliberately do that for search).
  - **Still not auto-merged by the classifier itself.** `isPureEncodingVariant()` is never
    wired to `SAFE_TO_CANONICALIZE` — this module's one bar for authorizing a merge is
    external verification (an agreeing ROR id), so "how confident does the match look" is
    never itself sufficient, the same principle that kept migration 0039's 43 identical-
    `normalized_name` pairs queued for human review instead of auto-merged. Each of the 28
    was instead independently confirmed via `searchRorByName()` — single confident active
    ROR match, correct country, for every one — before being hand-added to
    `MANUALLY_VERIFIED` in `scripts/university-duplicates-audit.ts` (2026-08-18 batch) and
    merged with `--merge-verified`. `loserUniversityId` is `null` for all 28 (nothing to
    supersede on the losing side); the `--supersede` path now skips `null` entries instead
    of failing.
  - Result: `npm run audit:university-duplicates` now reports **0** name-variant pairs
    (was 28). `canonical_entities` live-count 1083 → 1055. Full gate
    (lint/typecheck/677 tests/build) green after.
- **Correction, same session**: an earlier draft of this file claimed founder-blocked-backlog.md
  item 25's KFUPM pair "does not exist in the live registry" — that was wrong, and was itself
  caused by an incomplete search (canonical_entities searched for "king fahd"/"petroleum"
  substrings; the second row's canonical_name is literally just "KFUPM", matching neither).
  The Phase 5 rankings audit below found it independently (two universities.id rows both
  claiming QS 2027 rank 63, no tie marker) and it's merged now — see the Phase 2 table above
  (9 pairs, not 8) and the Phase 5 section for the full account.
- **founder-blocked-backlog.md item 19's "43 duplicates"** matches this session's exact-name
  pass count (43) — consistent, not independently stale.

## Requests for Claude B

Nothing blocking. FYI only: the `universities.id` for MIT / UCL / LSE / University of Warwick
that already carries your `university_programs` rows is, in every case, the one that survived
as canonical this pass (see table above) — no action needed on your end, just noted in case
you're tracking ids anywhere outside the database itself. If you ever add programs to one of
the *loser* ids in that table before migration 0043 lands and the read-path filters go in,
they'd currently still be visible (the loser row isn't hidden yet) — not a problem, just not
yet deduplicated either.

## Phase 3 — student population: Wikidata index is exhausted, real finding, not a bug

Ran `enrich:student-counts -- --limit 1000` (covers every remaining gap). Result: **1 new row**
(University of Westminster), 6 rejected as stale (pre-2015, correctly not written), **712/719
genuinely unresolved** — no Wikidata P2196 statement with an acceptable domain+date exists for
them at all, not a matching/domain-rule problem. `total_students` is now 284/1010.

This is the honest ceiling for a Wikidata-index approach: the well-documented (mostly
Western/large) institutions were captured in earlier passes; the long tail (smaller/regional
institutions across the QS 1000) mostly isn't on Wikidata with a sourced figure. Closing this
further needs either (a) `ANTHROPIC_API_KEY` credits restored, to build the Tavily-search +
AI-extract path AGENTS.md Phase 3 actually describes for this, reading each institution's own
"facts and figures" page — the architecturally correct path — or (b) loosening the `MIN_ACCEPT_YEAR
= 2015` staleness filter or the domain allow-list in `source-authority.ts`'s `population`
class, neither attempted here since both are deliberate existing quality bars, not bugs.
**Did not build a numeric-extraction-without-AI fallback** — unlike a URL (right domain or
wrong, binary and safe to score), a wrong digit silently accepted as a student count is a much
worse failure mode than finding nothing, and Tavily-only text-regex extraction of a NUMBER is
exactly that risk. Recommend this stays blocked on (a) rather than a workaround.

Investigated `undergraduate_students`/`postgraduate_students`/`international_students`/
`faculty_count`/`student_faculty_ratio` (0% each): no reliable, separately-populated Wikidata
property found for undergrad-only/grad-only splits, and the nearest faculty-adjacent property
(P1128 "employees") would overstate faculty by including non-academic staff — using it would
be exactly the kind of fabrication-by-overstatement this product's rules forbid. Left honestly
at 0%, not attempted with a weaker signal.

### Session 2 continuation — moved beyond Wikidata to a real national dataset (US), UK blocked

Per the founder's explicit instruction not to keep pushing the exhausted Wikidata index and
instead find scalable *official* national datasets: `scripts/enrich-student-counts-us.ts`
against the US Department of Education's College Scorecard **bulk institution-level file**
(`Most-Recent-Cohorts-Institution.csv`, IPEDS-derived, ~6,300 US institutions) — a genuinely
different, keyless source from the live query API `lib/providers/college-scorecard.ts` wraps
(which needs the still-unset `COLLEGE_SCORECARD_API_KEY`). Verified real before trusting it:
`curl -sI` on the download URL (real S3/CloudFront headers, HTTP 200), then spot-checked
Harvard/MIT/Princeton/Stanford figures against public knowledge.

Scope kept explicit, per the founder's instruction not to conflate definitions: `UGDS`/`GRADS`
are **headcount**, **institution-level** (one UNITID = one campus; IPEDS gives every branch
campus of a multi-campus system its own UNITID, never a system total). No per-row academic
year is asserted in `stats_as_of` — the bulk file is a rolling per-institution "most recent
available" snapshot with no year column, and the year can genuinely differ row-to-row, so
`stats_as_of` is `"undated (see source)"` / `data_quality_flag =
"current_page_date_uncertain"`, reusing the Wikidata pipeline's own convention for this exact
situation rather than asserting a guessed year.

Matching: exact `nameKey`/`nameVariants` first (103/131 US universities), then a small,
individually city-verified `FLAGSHIP_UNITID_OVERRIDES` table (25 entries) for the well-known
IPEDS "-Main Campus" multi-campus-suffix convention (e.g. `Purdue University` only exists in
the bulk file as `Purdue University-Main Campus`) — each entry confirmed by cross-checking the
bulk file's own city/state against that institution's known flagship location, **not**
name-similarity/fuzzy matching. Two multi-campus names deliberately got no override and stay
unresolved: **City University of New York** (a ~25-college system — Baruch, Hunter, Brooklyn,
...— with no single UNITID representing it) and **University of Minnesota (System)** (our own
row names it a system total; the Twin Cities flagship's headcount would silently relabel a
campus figure as a system figure, the exact HEADCOUNT/SYSTEM conflation this pipeline exists
to prevent). One genuine near-duplicate — Notre Dame's Chicago satellite campus sharing a
name-key with the main South Bend campus — was correctly caught by the existing
more-than-one-candidate guard and skipped rather than guessed.

**Result: 128/131 US universities matched (25 via the verified override), 354 facts applied**
— `undergraduate_students` 128 (0% → new), `postgraduate_students` 128 (0% → new),
`total_students` 98 new (320/1010 total spine-wide, up from 222).

**UK is next by gap size (51 QS universities still missing `total_students`, the largest
non-US gap) and was investigated, not just queued.** HESA — the obvious source, and the one
the founder named — is Cloudflare bot-protected (see "Current state" above): confirmed `403`
with `cf-ray`/challenge cookies on the main site, on `data.gov.uk`'s own mirrored links (which
still point back to `hesa.ac.uk` URLs), and on individual CSV asset URLs directly, all via
`curl` with a realistic browser user agent — not a `WebFetch`-specific quirk. Did not attempt
to defeat the bot challenge (headless-browser rendering, cookie-jar/session replay, etc.) —
that crosses from "acquire official data" into "evade another service's anti-bot controls,"
which this session's own instructions treat the same as any other detection-evasion request.
**Germany (37 missing), India (33), Italy (31), Spain (27) were identified as the next-largest
gaps but not yet investigated** — genuinely queued, not attempted and abandoned. A reasonable
next step for each: check whether that country's own statistics office (Destatis for Germany,
AISHE/UGC for India, MUR/ISTAT for Italy, Ministerio de Universidades for Spain) publishes a
comparable bulk per-institution file, applying the exact same live-`curl`-verify-before-trust
discipline used for College Scorecard, rather than assuming any of them will or won't work.

## Phase 4 — admissions_url / application_system: built, live-tested, one real bug caught and fixed before scale-up

Tavily-only (no AI — Anthropic credit-blocked). `scripts/acquire-admissions-facts.ts` +
`lib/acquisition/admissions.ts` (16 unit tests). Domain-restricted Tavily search
(`include_domains` = the institution's own already-verified `website_url` host, so every
candidate is `official_primary`-tier by construction) → deterministic URL/title keyword score
picks the admissions page or returns null (never a guess) → `application_system` only ever set
when a known portal name (Common App/UCAS/Parcoursup/Studielink/uni-assist/ÖSYM-YKS/Coalition)
appears verbatim in the fetched page content.

**Four real scoring bugs found and fixed by actually reading the live output, not just
trusting "a value was found" — every one caught between an apply and the next batch, never
left for a later session to discover:**
1. First 3-university smoke test resolved Aarhus University to a **Master's-only** admissions
   page (`masters.au.dk/...`) — wrong audience for ORYN's high-school users. Fixed with an
   explicit graduate/PhD-level penalty; re-verified live (now resolves to `bachelor.au.dk`).
2. A 40-university batch resolved **Al Ain University** to a 2019 **news article** about a
   research-competition win — contained neither "admission" nor "apply" anywhere, cleared the
   old threshold purely on the undergrad/bachelor bonus. Fixed by making a real admission/apply
   signal a hard requirement before any other bonus counts (was previously just the
   highest-weighted signal, not a gate). Audited all 29 URLs the pre-fix batch had already
   written, found and reverted 2 bad ones (Al Ain; Aristotle University of Thessaloniki, a
   department-subdomain page) directly in the database; the other 27 were investigated and
   confirmed genuine (2 initially flagged by the audit heuristic — Ajou, Aston — turned out to
   be correct pages the heuristic's simpler regex just didn't recognize).
3. A 150-university batch tagged **Dublin City University** (Ireland) `application_system =
   "ÖSYM/YKS"` (Turkey's national exam) — its own page describes accepting the Turkish "Lise
   Diplomasi + YKS" qualification as one of many recognized foreign quals, which is a
   different fact from DCU using that system itself. Fixed by gating every country-specific
   system (Parcoursup/Studielink/uni-assist/ÖSYM-YKS) behind a same-country match between the
   institution and the system's home country (`lib/acquisition/normalize.ts`'s `sameCountry`,
   so `Türkiye`/`Turkey` aliasing works). Common App/UCAS/Coalition were left ungated at this
   point — broad multi-country portals, reasoned to be lower risk, no demonstrated bug yet.
   Reverted DCU's value; re-verified against the real live DCU page text (not just the unit
   test).
4. A 300-university batch proved that reasoning wrong: **Shanghai Jiao Tong University**
   (China) was tagged `application_system = "Common App"` (the US portal) from its own
   international-admissions PDF — same mechanism as #3, just on a pattern assumed safe.
   Generalized the fix instead of special-casing again: every system in the list is now
   country-gated, including Common App (→ United States), UCAS (→ United Kingdom), and
   Coalition (→ United States). Manually audited all 60 `application_system` rows produced
   across all three batches against the new rule — SJTU was the only mismatch. Separately
   (unrelated mechanism, same batch), **LSE**'s newly-acquired `admissions_url` resolved to an
   "Undergraduate Admissions Extenuating Circumstances" sub-page — real LSE content, on-domain,
   but not what a prospective applicant needs; reverted (LSE's `application_system=UCAS` was
   correct and kept).

**Known, accepted limitation, not chased further this session:** a handful of the kept
`admissions_url` results point at a real, on-topic, on-domain admissions page that is narrower
than ideal (a specific institute/department/program's admissions page rather than the
university-wide one — e.g. Alexandria University resolved to its Public Health institute's
admission page, Bologna to Medicine & Surgery's, a few others to a specific news bulletin
about that cycle's admission scores/seats rather than a general how-to-apply hub). These are
honestly sourced and about the right topic at the right institution, just not perfectly
scoped — the kind of judgment call that needs AI-level page-purpose understanding to fully
close, which is exactly the piece blocked on Anthropic credits. Not a fabrication risk,
disclosed rather than silently accepted as perfect.

**Coverage after the first session's four batches** (40 + 150 + 300 + 250 universities):
`admissions_url` 368/1010 (36.4%), `application_system` 74/1010 (7.3%) — net of all reverts.
The 4th batch's country-consistency was checked exhaustively (all 74 `application_system`
rows, not a sample): 0 mismatches, confirming the generalized country gate holds across the
full dataset, not just the two cases that originally exposed it. A last spot-check of 8
newly-flagged `admissions_url` values found the same "real but narrower than ideal" pattern
already documented above (an "Info Day" press release, a country-specific PDF guide, a
single-program page) — no new bug class, nothing reverted this round.

Every write is `fill_if_null`, re-checked immediately before writing (not just at selection
time). `--limit` defaults to 25 deliberately — Tavily is a paid API, scale-up should stay
deliberate rather than a single 1010-university run. `npm run check:university-spine-health`
passes cleanly after all four batches and every revert. `scripts/audit-admissions-quality.ts`
(new this session — see below) makes that anomaly check repeatable instead of ad hoc.

### Session 2 continuation — a real crash bug, two more real anomalies, then a plan-limit wall

**Bug found and fixed**: the apply loop's per-fact PATCH/probe `fetch` calls had no
`try`/`catch`, unlike the acquire-side calls. A 350-candidate batch died mid-write on an
uncaught `fetch failed` (a transient network blip) and exited silently — `[exited with code
0]` even though the run was genuinely incomplete, stranding the rest of the batch unattempted.
Fixed in `eca81c8`: each fact's apply is now individually try/caught (one flaky request can no
longer abort the run), and a new `--apply-from <path>` mode replays a previously saved
`--out` batch without spending any new Tavily credit — used to recover the stranded batch's
remaining facts (24 admissions_url + 2 application_system) without re-querying Tavily for
universities already paid for.

**Two more real anomalies caught by `audit:admissions-quality` and reverted** (same two
pattern classes as the first session's LSE finding, now with regression tests in
`__tests__/acquisition/admissions.test.ts`): a stale admissions-cycle news post (Gadjah Mada
University's "2026 seat count" announcement) and — a second, independent occurrence — LSE's
`admissions_url` had reverted back to the same "Extenuating Circumstances" page this session
that the first session had already reverted once. **Root cause not established** — no direct
evidence distinguishes "the first revert didn't actually persist" from "something else
re-wrote it" — flagged here rather than silently re-fixed a third time without note. A
regression test now locks in the correct (below-threshold) score for that exact URL, so if it
reappears again the acquisition scorer itself, not just the periodic audit, will refuse it.

**Coverage after resuming the stranded batch**: `admissions_url` 407/1019 (40.0%),
`application_system` 77/1019 (7.6%). `audit:admissions-quality` clean (0 flagged) at this
point. A further `--limit 413` batch (all remaining candidates) then hit Tavily's plan usage
limit on its 3rd request and tripped the circuit breaker immediately — 0 new facts, see
"Current state" above. **413 universities still missing `admissions_url`** as of this pass;
resuming needs the Tavily plan blocker resolved first, not a code change.

## Phase 8 — canonical entity registry quality: two real findings closed

1. **73/73 `official_verified` university entities had zero `entity_evidence` rows** —
   confirms founder-blocked-backlog.md item 20's finding still holds, for the entire set, not
   a few stragglers. `scripts/verification-state-audit.ts` downgrades honestly
   (`official_verified` → `source_verified`) in one direction only, never upgrades. Applied:
   all 73 downgraded, including 4 with a real linked `universities` row (3 Phase 2 merge
   winners — Al-Farabi, UTS, HKUST — plus the standalone KFUPM entity). Re-run confirms 0
   remain. General-purpose (`--entity-type` flag), scoped to `university` this session.
2. **`scripts/entities-audit.ts` (pre-existing, not written this session) was silently
   truncating its own read of `canonical_entities` at 1000 rows** — the exact bug class
   `lib/acquisition/paginate.ts`'s own header documents at length, just never applied to this
   particular script. The registry passed 1000 rows at some point this session (now 1160);
   every audit run since then was silently over an arbitrary 1000-row slice. Fixed (paginated
   `canonical_entities` and `entity_aliases` reads, mirrors `university-data-report.ts`'s own
   `selectAll` pattern). Live effect: `POSSIBLE_DUPLICATE` findings went 231 → 296 once the
   other 160 entities were actually included. Not investigated further this session (296 is
   the Levenshtein-fuzzy, cross-entity-type bucket that's explicitly "review, don't auto-act
   on" by the audit's own design — far beyond this session's scope to hand-verify each one).

The 43 exact-name + 28 name-variant orphan pairs from the Phase 2 dossier above are very
likely a large fraction of both the pre-fix-73 and the 296 POSSIBLE_DUPLICATE set — not
independently re-investigated as a third thing, just noted as probably-overlapping.

## Phase 5 — rankings: clean, well-designed already, one real finding (the 9th duplicate)

`university_rankings` audited directly (1009 rows). Findings:

- **Provider/edition naming is already clean** — exactly one value, `QS | 2027`, no naming
  drift (e.g. no "QS World University Rankings" vs "QS" split). Nothing to normalize.
- **Zero false-precision cases.** The schema already separates `rank_display` (exact source
  string, e.g. a band like "601-610") from `rank_numeric` (nullable derived sort key,
  explicitly null when the source gives a band — per the column's own migration 0038
  comment). Checked directly: 0 rows have a band-shaped `rank_display` with a non-null
  `rank_numeric`. This was already built correctly; confirmed, not fixed.
- **9 `(provider, edition, list_position)` collisions** — two different `universities.id` rows
  claiming the identical QS rank. **8 were exactly the 8 Phase 2 pairs already merged**
  (independent structural confirmation of that work from a completely different angle — every
  single one of the 8 name-collision-detected duplicates also independently collided on QS
  rank, which is exactly what "same real institution" predicts). **The 9th was new**: KFUPM,
  rank_display `"63"` with no tie marker on both sides (a genuine QS tie would read `"=63"`)
  — see the Phase 2 table above, now merged.
- **Bocconi University is the one university (1/1010) with no QS ranking row at all, in any
  provider/edition.** **Confirmed this session, not just plausible**: QS's own published
  methodology excludes single-discipline institutions from its overall World University
  Rankings (Bocconi is Economics/Management/Law-only) — Bocconi ranks #9 in QS's separate
  Business & Management subject ranking instead, a different product from the one this table
  tracks. Genuine category exclusion, not a data-acquisition gap. Nothing to fabricate; no fix
  needed in the acquisition pipeline. Surfaced properly in the UI instead — the university
  detail page now shows QS rank (it previously showed none at all, for any university — see
  the ranking-display commit), and correctly renders nothing for a university with zero
  ranking rows rather than a misleading blank/broken state.

## Phase 7 — external IDs: mostly closed by this session's re-acquisition

Full-spine `acquire:universities --from-db` + `import --apply` this session (see the fixture-
regeneration commit) refreshed ROR/WIKIDATA/GRID/ISNI/CROSSREF_FUNDER coverage with current
credentials and the new circuit breaker: 3,950 external ids upserted (idempotent — mostly
confirming what was already there), 807/1010 resolved (203 unresolved: 192 ambiguous/no exact
name match, 5 country mismatch, 2 no ROR hit, 4 other — all kept in the fixture with a reason,
none guessed). **Closed, not just theoretically covered**: `npm run
check:university-spine-health` (built later this session — see Phase 10) directly checks
whether the same external id is ever mapped to two different *live* (non-merged) canonical
university entities registry-wide, beyond what the import pipeline's own resolver refuses to
act on. Confirmed clean as of the last run of this session.

## Phase 9 — `university_profile_metrics` schema review: flexible store stays, no new typed columns

Reviewed with real data now in hand (612 rows, up from near-zero): 320 `total_students`, 128
each `undergraduate_students`/`postgraduate_students` (new this session), 30
`research_topics_top5`, and 6 one-off scope-variant rows — `full_time_equivalent_students` (2),
`students_australian_campuses`, `system_total_students`, `phd_fellows_enrolled`,
`taught_degree_students` (1 each).

**Decision: no new typed columns on `universities`.** Reasoning:

- Every row carries real provenance (`source_url`, `source_type`, `verified_at`,
  `data_quality_flag`, `stats_as_of`, `scope`, `notes`) that a typed column has nowhere to put
  without either dropping it or adding a parallel `_source_url`/`_verified_at` column per
  metric — exactly the "hundreds of nullable columns" anti-pattern AGENTS.md Phase 35 already
  rules out for this table.
- The 6 one-off scope-variant rows are the clearest argument *for* keeping the flexible store,
  not against it: `students_australian_campuses` and `system_total_students` are exactly the
  HEADCOUNT/FTE/CAMPUS/SYSTEM conflation the founder's brief said never to collapse into one
  column, and a fixed schema has no honest place to put a value that is real but
  differently-scoped from the primary metric. The flexible store kept them distinct instead of
  either discarding them or silently blending them into `total_students` — working exactly as
  designed.
- `research_topics_top5` isn't a scalar at all (a top-5 list), which doesn't fit a single typed
  column regardless of volume.
- `undergraduate_students`/`postgraduate_students` are real and now well-populated, but
  US-only so far (128/1010, ~13% of the spine) and not yet read by any UI — promoting to a
  typed column now would mean a mostly-null column speculatively added ahead of both broader
  geographic coverage and an actual UI consumer.
- The one existing exception, `universities.student_size` mirroring `total_students`
  (`fill_if_null`, so a differently-sourced or human-set value is never overwritten), stays the
  right narrow carve-out: it's the single figure read on every Explorer card and the detail
  page, worth a cheap denormalized read; nothing else here clears that bar yet. **Verified
  exact and current**: 320/320 `total_students` rows have a matching non-null
  `universities.student_size` — the sync has no gap.

No code change from this review — the existing design was already correct; this closes the
open question rather than leaving it queued indefinitely. Revisit if/when `undergraduate_students`/
`postgraduate_students` cross a majority-of-spine coverage threshold AND a UI actually wants to
read them directly (the same two conditions that justified `student_size`).

## Phase 10 — University Explorer P0 package: two severe live bugs found + fixed, full filter/compare system built, 2026-08-18

Triggered directly by a founder bug report ("the explorer only shows ~400 universities,
Asia shows 0") plus an explicit, detailed P0A–P0M spec, treated as a temporary interruption
of the tuition-acquisition work (see "Next" below) — complete before resuming that roadmap,
per the founder's own instruction.

**P0A/P0B — root cause: `SUPPORTED_COUNTRIES` was a 12-country hardcoded allowlist.**
Covered 435/1019 universities and zero Asian countries (see the corrected paragraph above —
an earlier pass had wrongly signed this off as intentional v1 scoping). Rewrote
`lib/data/country-geo.ts`'s `SUPPORTED_COUNTRIES` to all 89 live countries in the data
(`region` type expanded from `North America | Europe | Asia | Other` to include `Oceania`,
`South America`, `Africa`), `lib/data/regions.ts`'s `MAP_REGIONS` gained matching region
entries. Product judgment calls kept/made explicit in the file's own header: Turkey → Europe,
Cyprus/Northern Cyprus → Europe (EU-membership relevance for fee-status, departs from strict
UN M49 Western Asia), Russia → Europe (matches UN M49's own Eastern Europe classification).
10 new regression tests in `__tests__/universities/country-region-mapping.test.ts`, structural
(e.g. "Asia contains China/India/Japan," "every region is a real subset of
SUPPORTED_COUNTRIES") rather than value-based, so they don't break on the next enrichment pass.

**A second, independent instance of the exact same PostgREST-1000-row-cap bug class, found
INSIDE the fix for the first one**: `app/(app)/universities/page.tsx`'s original per-country
count query was a single unpaginated `.select("country")` — would have undercounted by 19 once
`SUPPORTED_COUNTRIES` actually covered all 1019. Fixed via a new `getUniversityCountByCountry`
in `lib/universities/queries.ts` (paginated, exact-count-verified against the server's own
count, same discipline `lib/acquisition/paginate.ts` already uses on the script side).

**A THIRD instance, more severe than the first two, found live-testing this same session's own
new Ranking-sort feature (built earlier, already committed/pushed) against the "World" scope —
the default landing state of this entire page**: `fetchRankingSortedPage()`'s id-scoping query
had no `.range()` either, silently truncating at 1000/1019. That alone would just be an
undercount, but the truncated ~1000-id list was then passed to
`.in("university_id", scopedIds)` — and a live empirical test against this project (not
theory) showed `.in()` itself starts failing (`Bad Request`, or a bare `fetch failed`)
somewhere around 400-700 uuids in the list:

```
50 ids -> OK · 100 -> OK · 200 -> OK · 300 -> OK
400 ids -> ERROR: fetch failed · 500/600 -> ERROR: fetch failed · 700+ -> ERROR: Bad Request
```

Net effect, confirmed by reproducing the exact query against the live DB: **the default view
of `/universities` (World scope, "QS Ranking" sort — both defaults) was returning ZERO
university cards in production**, not just an incomplete list. This had shipped earlier the
same session without being caught, because manual QA up to that point had mostly been done
with a country/region already selected (small `scopedCountries`, safely under the `.in()`
limit) rather than the true unscoped "World" default.

Fixed by restructuring the whole query path (`app/(app)/universities/page.tsx`,
`fetchViaIdIntersection`/`getScopedRows`): country/type scope is now read via a paginated,
`.range()`-based loop with NO id-list `.in()` anywhere (filters by column, not by a
server-supplied id array); cost/rank narrowing happens against a full paginated column read
(`getAllCostOfAttendance`/`getAllQsRankNumeric` in `lib/universities/queries.ts`) intersected
in TypeScript memory, not via `.in()`; the ONLY `.in("id", ...)` left in the whole path reads
`pageIds`, already sliced to `PAGE_SIZE` (48) — always far under the empirically-verified
limit. Live-verified after the fix: World + QS Ranking now correctly shows "Showing 1–48 of
700" with MIT #1, Stanford #=2, etc. in the right order. Regression-guarded in
`__tests__/universities/pagination-safety.test.ts` (source-level: asserts the fixed functions
still paginate, and that `fetchViaIdIntersection`'s one remaining `.in("id", ...)` reads
`pageIds` specifically, not a full scope array) — a live-DB integration test isn't practical
here (no Supabase-mocking convention in this codebase, see `alias-search.test.ts`'s own
pure-function-only approach), so this is the honest ceiling of what a unit test can guard.

**P0C — map redesign.** Added a real "selected" fill state to the country *shape* itself (only
the marker dot changed color before). Reproduced the founder's "Germany turns black when
selected" report live (screenshot + a scoped `getComputedStyle` check on the map's own SVG,
not a page-wide sample that gets swamped by ~250 unrelated 24×24 icon SVGs) — the undiluted
`--brand-primary` token (L≈0.46 in OKLCH) reads as a clean, vivid blue everywhere else it's
used (buttons, text, small icons), but as the dominant fill of a large map region next to a
much lighter "unselected" tint, it reads as near-black. Fixed with a 4-step `color-mix(in
oklch, ...)` intensity ladder in `features/universities/world-map-explorer.tsx`: unselected
(55% diluted) < unselected-hover (40%) < selected (30%) < selected-hover (22%) — verified via
direct pixel `getComputedStyle` checks at each step, not just visual screenshots (too small at
map scale to judge reliably). Re-confirmed working post-refactor: Germany selected now
computes to `oklch(0.622 ...)`, a clearly mid-tone blue, not black.

**P0D/P0E — navigation + real filters.** `features/universities/region-grid-explorer.tsx`
rewritten: unscoped ("World") view caps at the top 10 populated countries + a zero-JS
`<details>` "All countries (N more)" disclosure (auto-opens if the active country filter is
inside the overflow set); a selected region shows every country in it (none exceeds ~40, no
cap needed). New filter system (`lib/universities/filters.ts` for the pure bucket/matching
logic, `features/universities/filter-sheet.tsx` for the UI — a right-side `Sheet` drawer, one
instance at all viewport widths rather than a separate mobile-specific bottom-sheet, a
deliberate scope cut noted in the component's own comment): cost of attendance (quick $10k/
25k/50k buckets), institution type (Public/Private, `institution_type` matched by
case-insensitive substring since the real data is free text — "Private nonprofit", "Private
not for Profit"), student population (4 size buckets), QS ranking tier (Top 10/25/50/100/250/
500). Every filter is a plain server-built `<Link>`, no client-side filter-state to wire up —
same URL-state philosophy as the rest of this page. **Deliberately deferred, documented in
`lib/universities/filters.ts`'s own header rather than silently missing**: admission-rate and
application-system filters (128/1019 and 77/1019 coverage — too thin to feel like real signal
today) and a research-topic filter (923/1019 coverage, but free text needing a real controlled
taxonomy first, a separate build).

**The founder's explicit "excluded because unavailable" requirement** — implemented for cost
and student-population (the two range filters with materially incomplete coverage today):
`applyRangeFilters` in `lib/universities/filters.ts` tracks rows dropped for having NO data at
all, separately from rows that had real data outside the selected range, and the page renders
it as its own sentence (`"884 additional universities are excluded because cost data is
unavailable."`) — live-verified: `?cost=50k-plus` on the full World scope correctly shows
"Showing 1–37 of 37" plus that exact 884-university disclosure (37 matched + 884 unknown + 89
known-but-below-$50k = 1010, the full reconciled total — see P0K below). Unit-tested directly
(`__tests__/universities/filters.test.ts`, 20 tests) since this logic is now a pure, exported
function — null/unknown handling, bucket boundary correctness, combined-filter AND semantics,
and the specific "known-but-out-of-range" vs "genuinely unknown" distinction the founder's spec
called out by name.

**P0F/P0G — sort + cards.** Sort options: QS Ranking (default — "Recommended" was
deliberately NOT added, since there's no real personalization engine behind this browse view
yet and a fake relevance score is exactly the fabricated-scoring the founder's brief rules
out), Student population, Name. Cards (`features/universities/university-card.tsx`) gained
cost (labeled "cost of attendance," not "tuition" — that's honestly what the underlying
`university_statistics` column is) and up to 3 research-topic chips, both omitted entirely
rather than shown as "Unavailable" given how partial today's coverage is.

**P0H — compare (minimal, real).** Cards get a "Compare" toggle (up to 4, `Scale` icon),
backed by a small localStorage-based external store (`features/universities/compare-context.tsx`,
`useSyncExternalStore` — the same hydration-safe pattern `university-explorer-hero.tsx`'s
`useIsDesktop` already established for a browser-only value, not a `useState`-in-`useEffect`,
which is a real lint error in this codebase, not just style). A sticky bottom bar
(`compare-bar.tsx`) links to a new `/universities/compare?ids=...` page — a plain table, every
unresolved cell reads "—", never guessed.

**A real bug caught building the compare page, worth naming as a lesson**: `COMPARE_MAX` was
first defined in `compare-context.tsx` ("use client") and imported into the server-rendered
compare page. A NAMED EXPORT FROM A "USE CLIENT" FILE BECOMES A CLIENT-REFERENCE PROXY EVEN
FOR A PLAIN CONSTANT, not just component exports — the server component received a function
that throws if actually called, not the number 4. `.slice(0, thatFunction)` silently coerced
it to `NaN`, which `Array.prototype.slice` clamps to 0 — so every "Compare N" link produced an
empty comparison, with no error anywhere in the normal request path (confirmed via a direct
server-side `console.log`, since `tsc`/lint/tests/build all passed cleanly — this is a runtime
RSC-bundler behavior none of the four gates can catch). Fixed by moving the constant to a new,
plain, directive-free `lib/universities/compare-constants.ts`. Regression-guarded in
`__tests__/universities/compare-constants.test.ts` (asserts the module never grows a "use
client"/"use server" directive, and that the compare page imports from the plain module).
**General lesson for future work in this codebase**: a "use client" file's exports — ALL of
them, not just components — are unsafe to import from a Server Component. Shared constants
between a client feature and its server-rendered destination need their own plain module.

**P0I/P0J — search over the full dataset, shareable URL state.** Search already ran through
the canonical-entity RPC (`lib/universities/alias-search.ts`), unaffected by any of the above —
confirmed live with a university outside the old ~400-record boundary. Every filter/sort/page
param composes into one URL (`buildHref` in `page.tsx`, a single function all of pagination,
sort, and filter links call through) — verified pagination correctly preserves active filters
(`Next` from a filtered page carries `sort=name&type=public&size=30k-plus&page=2`, checked via
the rendered anchor's own `href`, not just re-navigating manually).

**P0K — reconciliation, live numbers, 2026-08-18:**

```
raw universities table (unfiltered count):        1019
superseded/merged-loser rows (getSupersededUniversityIds): 9
canonical total (what every count on this page shows): 1010

Per-continent (sums to 1010 exactly, no unexplained gap):
  Europe 403 · North America 167 · Asia 343 · Oceania 43 · South America 37 · Africa 17

Per-country spot checks (raw universities.country= count; the app-displayed,
superseded-excluded number is slightly lower where a merged duplicate landed in that country):
  United States 131 (app: 130) · United Kingdom 79 (app: 76) · Germany 49 (app: 49)
  China 64 (app: 64) · India 37 (app: 37) · Japan 22 · Australia 37 (app: 35)

Other coverage figures used by the new filters:
  university_statistics rows (cost/admission data, US-only so far): 128
  university_rankings QS rows: 1009
  institution_type non-null: 1002/1019 (98.3% — see the Phase verification note above)
  student_size non-null: 383/1019 (37.6%)
```

**P0L — regression tests added this phase**: 10 (country-region-mapping, pre-existing from
earlier this session) + 20 (`filters.test.ts`) + 3 (`compare-constants.test.ts`) + 5
(`pagination-safety.test.ts`) = 38 new/carried tests specific to this package. Full suite:
**64 files, 713 tests, all green**, plus clean `tsc`/`lint`/`next build` after every change in
this phase, not just at the end.

**P0M — manual QA performed**: World default view (the severe bug — now correct), Germany map
selection (pixel-verified not black), Turkey (`?country=Turkey` → 9, correct), mobile viewport
(375px — map correctly doesn't mount, Filters button present and functional), cost/type/size/
rank filters individually and combined, filter+pagination interaction, the full compare flow
end-to-end (select 2 cards → sticky bar → compare page → real MIT-vs-Stanford data). Not
exhaustively re-tested at every country × viewport combination the founder's checklist listed
(China/Japan/Australia specifically) — the mapping/rendering logic is uniform across countries
(verified structurally via the country-region-mapping tests plus the Germany/Turkey/World spot
checks), so a full per-country visual pass would be re-testing the same code path repeatedly
rather than finding new risk; flagging this as the one item in the P0M checklist not run to
its full literal breadth, not silently skipped.

Commits this phase (in order): explorer pagination/sort/map/region fixes (pre-existing, already
on this branch before this handoff update), then this update's own: filter system
(`lib/universities/filters.ts`, `filter-sheet.tsx`, page.tsx wiring), the ranking-sort
World-scope bug fix, compare feature + the COMPARE_MAX bug fix, regression tests, this handoff
section.

## Phase 11 — Explorer map UX polish (P0N-P0U) + multi-select filters, 2026-08-18

Founder-reported live bugs, fixed in `features/universities/world-map-explorer.tsx` and
`lib/data/map-visuals.ts` (new): label clutter, land clicks not selecting, and a genuine
black-fill bug. Full detail is in the two commits' own messages (`10c45db` for the map,
`3ecdaf3` for the filter fix below) — summarized here for anyone not reading git log.

**Label clutter (P0N)**: all 89 supported countries rendered a permanent text label
simultaneously at world scope — dense over Europe/Asia specifically, matching the report
exactly. Capped to the top 8 by count at world scope, top 15 at region scope (a no-op for
every region except Europe/Asia, the two actually named), plus the selected country
regardless of rank. Verified live: exactly 8 labels render on the default view, all real
top-count countries.

**Land clicks didn't select (P0O)**: only the marker DOT had an `onClick` — the country's own
land shape, the obvious large click target, had none. Added the same `selectCountry` call to
`<Geography>`, resolved via a `numericId -> name` lookup. This is the one root cause behind
the founder's "map click doesn't drive filter state" report — the underlying URL-param/
server-component architecture (`?country=` read by `page.tsx`, driving chips/results/counts
together) was already correct from Phase 10; nothing there needed to change once land clicks
actually fired the existing mechanism.

**The real black-fill bug (P0P)** — this was NOT the color math from the earlier (2026-08-18,
same-day, Phase 10) fix, which was already correct. Reproduced live and root-caused properly
this time: selecting a country via direct URL navigation always rendered the correct diluted
blue; clicking that SAME country's shape could render literal black. A `getComputedStyle`
check on the just-clicked path showed an EMPTY inline `style` attribute — not a wrong color,
no style at all — which is what makes an SVG `<path>` fall back to the spec's own default
fill (black). The underlying map library (`@vnedyalk0v/react19-simple-maps`) has its own
internal hover/pressed state machine driving which of a `{default, hover, pressed, focused}`
style object it applies, and that machine can drop the style entirely right after a click.
Fixed by computing one style object from this component's OWN tracked state (not the
library's internal flags) and repeating that identical object across all four keys the
library could select between — so it can't matter which one its internal state lands on.
Verified live across United States, China (twice), Germany, United Kingdom, Turkey, and
Australia: 0 black paths via computed-style check after every click, chip/URL/results synced
each time, including a region-scoped click (Germany inside `?region=europe`) correctly
preserving the region param.

**Tooltip (P0S)**: hovering either the marker or the land shape now shows a real floating
tooltip (name, university count, region) positioned in viewport space (`position: fixed`, so
it can't be clipped by the map's own `overflow-hidden` container) — verified live showing
correct data for United States.

**Visual polish (P0Q)**: a subtle brand-tinted radial gradient stands in for flat ocean
background; selected markers get a soft double-ring halo. Kept intentionally restrained —
the founder's own direction is "light, airy, not loud," and the map was already functionally
correct after the P0N/P0O/P0P fixes; this pass didn't chase decoration beyond that.

**Lower UI (P0R)**: reviewed live (chips, search bar, filter sheet, sort select) — already
reads as one coherent surface with the map, wraps correctly, no redesign needed.

**Pure logic extracted and unit-tested** (`lib/data/map-visuals.ts`,
`pickLabelPriorityCountries`/`resolveCountryFillStyle`) since the map component itself has no
test renderer in this codebase (same constraint `lib/universities/filters.ts` documents for
`applyRangeFilters`). The click/library-state-machine half of the black-fill fix isn't unit-
testable (it's a live-DOM/third-party-library behavior) — guarded instead with source-level
regression tests in `__tests__/universities/map-interaction.test.ts`, the same pattern
`compare-constants.test.ts` already established for exactly this class of bug.

**Separately, mid-package: a founder-reported filter UX bug, fixed same session.** Cost and
student-population filters were single-select presets — no way to express "$10k to $50k"
(spanning two adjacent buckets), reported live via screenshot. Converted both to multi-select
(`lib/universities/filters.ts`'s `RangeFilters.cost`/`.size` are now arrays, OR-matched within
the category, still AND against every other filter) — rank stays single-select (QS tiers are
already cumulative, so multi-selecting adds no expressive power). Verified live: selecting
both "$10,000-$25,000" and "$25,000-$50,000" shows both chips active simultaneously and
returns real matches from either sub-range. 4 new tests cover the OR-semantics directly.

**A real finding, not acted on**: this session shares its working directory with at least one
other active, uncommitted session building a university-image-acquisition pipeline
(`lib/acquisition/wikimedia.ts`, `opengraph.ts`, `image-storage.ts`, `image-validation.ts`,
`features/universities/detail-hero-image.tsx`, and more) plus a `research-taxonomy.ts` module
— all touching files inside this workstream's nominal scope (`lib/acquisition/*`,
`app/(app)/universities/*`). Confirmed via `git status`/`git diff` before every commit this
phase that only files this session actually authored were staged — never a blind `git add -A`.
Not investigated further (out of scope for this map-fix package), but worth another session
being aware of before assuming sole ownership of `lib/acquisition/*` going forward — this
handoff doc's own "Owner: Claude A" line may need revisiting if this is a second Claude A
instance rather than a different workstream.

Full gate green (`tsc`/lint/799 tests/build) at time of commit. Commits: `10c45db` (map),
`3ecdaf3` (multi-select filters, landed first).

## Next (queued, not yet started)

**Active priority as of 2026-08-18, per explicit founder direction — supersedes the general
enrichment ordering below until it progresses meaningfully**: global tuition/cost-of-attendance
acquisition for the ~890 non-US universities still showing "Unavailable" (`university_statistics`
is 128/1019, US-only — see Phase 10's P0K numbers). Country order: UK (done, 25/79), Canada
(done for this pass, 5/27 + well-documented negatives), Australia (closed out, 1/38 + 6
documented negatives — see below), Germany (**done, 49/49** — a real state-law pattern, see
below), Netherlands (**done, 13/13** — statutory fee scalable, institutional fee per-university,
see below), France (**done, 19/30 standard universities** — 11 confirmed to have a genuinely
different, decree-independent fee status, see below), Switzerland (**done, 7/11** — ETH-domain
federal policy + per-canton research, see below), Italy (**done for this pass, 4/38** — a real
ISEE-income-based framework, not a flat number, see below), Spain (**done for this pass,
10/29** — per-region ECTS-credit pricing, see below), China (**investigated, deliberately not
written** — conflicting sources, no official domain confirmed, see below), South Korea
(**done for this pass, 2/31** — no national/regional price, per-university research with two
specifically-named extraction blockers, see below), Japan (**done for this pass, 17/22** — a
real, government-set, two-decade-stable national-university standard rate, see below),
Malaysia (**investigated, deliberately not written** — every major public university's fee
data is PDF-gated, see below), Russia (**investigated, deliberately not written** — 6 major
universities individually checked, no reliable general figure anywhere, see below), Saudi
Arabia (**done for this pass, 13/18** — a real, decades-old national free-tuition policy for
domestic students, see below). **Coverage-driven, not geography-driven, per the founder's own
instruction** — run `npm run report:universities` (now includes a per-country tuition table)
before picking each next country. As of right after Saudi Arabia: Taiwan (16 missing), UAE
(12) are the largest remaining zero-coverage pools not yet investigated; India (37)
and the US (131, shown as 0 in the tuition table by design — see the report's own note —
already has 128/131 via the separate `cost_of_attendance` column) are lower priority per the
founder's own sequencing. Reorder for efficiency if a better bulk source turns up elsewhere, same
as the German/Spanish student-count pipelines below already did. Per-country pipeline:
discover → acquire → normalize → match → fixture → validate → `--plan` → `--apply` → verify,
same shape as `enrich-student-counts-de.ts`/`-es.ts`. Source hierarchy: official university fees
page > official government dataset > official prospectus/PDF > trusted national portal > other
sources (verification only, never primary truth — explicitly, never write a QS/ranking-
aggregator's tuition estimate as DB truth). Fields per the founder's spec: tuition
international/domestic/undergrad/postgrad, estimated living cost, total cost of attendance,
currency, academic year, source URL/date, fee basis (annual/per-term/per-credit/programme-
specific/range) — **never collapse different cost concepts into one field or one number**; if
`university_statistics`'s current single `cost_of_attendance` column can't represent a
programme-specific or ranged figure honestly, that's a real schema question to investigate
(this table's current shape, plus whether `university_profile_metrics`' flexible-store pattern
already used for `qs_size_category`/`research_topics_top5` is the better fit for a
multi-concept cost figure) before writing a migration proposal to the founder backlog — don't
guess a migration is needed without checking the existing model first, matching Phase 9's own
review discipline. Safety: no auto-write on a fuzzy institution match, ambiguous cases go to a
manual-review fixture entry (not silently skipped, not silently guessed), validate unit/
currency/year, sanity-check implausible values against known real-world tuition ranges before
trusting them (the same discipline every student-count pipeline below already used).

**UK — pilot batch done 2026-08-18, 14/79 universities, genuinely investigated not just
started.** HESA (the obvious UK-wide dataset) is Cloudflare-blocked, already confirmed in an
earlier pass (see "Current state" above) — not re-attempted. Discover Uni
(`discoveruni.gov.uk`, the OfS/HESA-run public comparison site) is reachable (unlike HESA
itself — different Cloudflare config, real `200`s) but its public pages have no bulk-download
UI as of this check, only a per-course search tool. Went straight to individual official
university fee pages instead — the founder's own #1-ranked source anyway.

`scripts/acquire-university-statistics-uk.ts`: Oxford, Cambridge, Edinburgh, LSE, UCL,
Manchester, King's College London, Bristol, Birmingham, Leeds, Glasgow, Sheffield, Durham,
Nottingham. Written to `university_profile_metrics` (`tuition_international_annual`/
`tuition_domestic_annual`), deliberately NOT `university_statistics.cost_of_attendance` — that
column means IPEDS's US all-in cost-of-attendance estimate specifically, and UK tuition is a
different concept (no bundled living-cost estimate, and international fees are typically a
range across courses, not one number) that would be misrepresented by reusing it. **21 metric
rows written**: domestic (UK/Home) fee £9,790/year — the 2026/27 government fee cap —
independently confirmed live at 12 of the 14 (Glasgow's RUK rate wasn't independently
re-verified on its own page but is written anyway, being by this point an extremely
well-established cross-institution figure); international tuition as a range (`value_numeric`
= low end, `precision_state: "range"`, full range in `notes`) at 8 of the 14: Oxford
£37,380–£62,820, Cambridge £29,052–£70,554 (5 published course bands), Edinburgh
£29,600–£38,900, LSE £30,700–£39,900 (medium confidence — cross-cited via search results
rather than directly re-rendered live), Bristol £25,500–£49,700 (a real 503-row per-programme
table), Glasgow £27,720–£62,730, Sheffield £25,000–£50,925, Nottingham £20,000–£47,000 (a real
209-row per-programme table). Bristol/Sheffield/Nottingham/Edinburgh in particular came from
genuinely excellent sources — real static per-programme tables, scanned directly, no JS search
tool fought or guessed around.

**A real, named pattern, now confirmed at 6 of the 14**: UCL, Manchester, King's College
London, Birmingham, Leeds, and Durham each confirmed to have NO single published international
figure — fees are exposed only through an interactive per-course search tool (or, Birmingham,
quoted only per individual offer letter) with no static table. Recorded as a genuine negative
result (domestic fee still written, since that IS a single clean figure at every one of these),
not guessed at or skipped silently. A future pass wanting these specific universities would
need to either drive the search tool interactively
(course-by-course, a bigger job) or find a per-department static page.

**A real mistake caught and fixed before this reached `main`, worth naming precisely**: this
script's first version keyed its table entry as `UCL`, matching `universities.name` for the id
`cf8adcbd-...`. That row IS a known duplicate — `lib/universities/duplicate-supersessions.json`
already resolves it (Phase 2, this doc's line ~422): `University College London`
(`03c8faf1-...`) is the winner, `UCL` (`cf8adcbd-...`) the loser. Writing to `UCL` put real,
carefully-verified tuition data on a row `getSupersededUniversityIds()` excludes from every
browse/search/detail surface — permanently invisible, exactly the **"KFUPM/UCL mistake"** the
founder's own prompt named by example as the thing to avoid. Caught by cross-checking the
existing supersession registry directly rather than independently judging "which row looks more
complete" from scratch — which is also what happened, unnoticed, for the LSE entry below: it
happened to land on the correct (already-registered) winner row by the same "more complete
row" heuristic, not because that registry was actually consulted at the time. **Lesson,
stated plainly for next time**: before writing to a `universities.id` picked by name lookup,
check `isSupersededUniversityId()`/the supersession registry FIRST — don't reason about row
completeness from scratch when an authoritative answer already exists. Fixed: deleted the
stray metric row on the loser id, re-ran the script keyed to `"University College London"`.

**Not a new finding, just a reminder it already exists**: the "London School of Economics" and
"University of Warwick" duplicate pairs used by this pass (`cfd5cd77-...`/`cc117524-...` and
`0b204add-...`/`ad3ef0a4-...`) are ALSO already correctly resolved in the same
`duplicate-supersessions.json` — this pass's LSE entry happened to target the correct winner
row already, Warwick wasn't written to at all this pass. No new duplicate-registry gap here;
the gap was in this script's own process, not in the registry.

**UI wiring**: `app/(app)/universities/[id]/page.tsx`'s "Cost of attendance" StatCard now
shows, in order: US `cost_of_attendance` when present; else `tuition_international_annual`
(labeled "International tuition," phrased "From £X/yr" since it's always a range so far), with
the UK/Home rate in the caption when both exist; else `tuition_domestic_annual` alone, labeled
plainly **"UK Home tuition"** (never just "tuition," so it can't be mistaken for what an
international applicant would pay) — this last branch was missing in the first version of this
wiring (UCL/Manchester/King's College's acquired domestic-only data was invisible, a real
data-readiness gap caught in the same pass as the UCL row mistake, fixed together); else
"Unavailable". Verified live for Edinburgh (international + caption), Cambridge (international
range), and University College London at both its winner id and its (auto-redirecting) loser
id (UK Home tuition, correctly, post-fix). **Not yet wired into the explorer grid/cards or the
cost filter** — those still read `university_statistics` only, so a UK university with real
tuition data acquired this pass still shows no cost on its
explorer card and gets swept into the cost filter's "excluded because unavailable" count. A
deliberate scope cut this pass (the explorer's cost concept and this new metric need genuinely
distinct visual treatment, not a quick prop swap, per the same anti-conflation rule), not an
oversight — worth doing once more countries add real weight to this metric.

Remaining 65 UK universities queued, not attempted. Full gate green (`tsc`/lint/713
tests/build) after this batch.

**UK — second batch, 2026-08-18, 20/79 (+6: Exeter, Warwick, St Andrews, Loughborough,
Southampton, Queen Mary).** Same official-page-only discipline; three real negative results
this batch, recorded in the script's own header rather than silently skipped: Imperial College
London and Newcastle University both split fees to individual course pages with no overview
figure at all (not even a Home rate on Imperial's overview — only the year-over-year CPI
increase percentage); Cardiff University's overseas-fees page returned HTTP 403 to this pass's
fetch tooling specifically — a fetch-access failure, not a confirmed "no data" case, worth
retrying with different tooling before assuming it's the same class of gap as the JS-search-
tool universities above. St Andrews' Home/RUK fee is genuinely unpublished ("to be confirmed"
per the university's own page) — NOT defaulted to the £9,790 England cap the way Warwick's and
Loughborough's Home fees were (both cross-institution-confirmed rather than independently
re-verified on their own pages, same reasoning Glasgow's entry already used). Exeter and
Warwick both explicitly exclude Medicine from their standard range (Warwick: separately priced,
outside the range; Exeter: included since its own table lists it as one band among others, not
called out as different — the two universities structure their own fee schedules differently,
each followed as published rather than forced into one convention). 30 metric rows written
(`--apply`). Remaining 59 UK universities queued. Full gate green (lint/tsc/801 tests/build)
after this batch.

**Canada — quick source check done 2026-08-18, before switching countries: no bulk per-
institution win available, same manual-per-university shape as UK.** Statistics Canada's
Tuition and Living Accommodation Costs (TLAC) tables (37-10-0003 through -0006, -0045-01 — the
obvious candidate, and reachable, unlike HESA) are genuinely real official data, but published
at **province/field-of-study granularity, not per-institution** — confirmed by reading the
tables' own documentation and a StatCan "interactive tool" page for exactly this dataset
(itself marked "Archived Content," pointing to a newer version, but the underlying source
tables are unchanged: still provincial averages weighted by 2018 enrolment, not a
per-university breakdown). No comparable per-institution bulk file found this check (unlike
Germany's Destatis or Spain's ciencia.gob.es). So Canada needs the same per-university
official-page research as the UK batch above, not a different, faster pipeline.

**Canada — pilot continued, 2/27 universities, `scripts/acquire-university-statistics-ca.ts`.**
A genuine structural difference from the UK batch surfaced immediately: UBC and (confirmed but
not yet resolved to real numbers) McMaster bill tuition **per credit**, not a flat annual
figure. Caught a real mistake before it reached `--apply`: a first draft reused the UK batch's
`tuition_international_annual`/`tuition_domestic_annual` metric codes for this per-credit
data — exactly the "collapse different cost concepts" the founder's spec forbids, since the
detail page already renders those two codes as "£X/yr" (a per-credit figure under that code
would silently display as if it were annual). Fixed before any write: new, distinct
`tuition_international_per_credit`/`tuition_domestic_per_credit` metric codes, kept separate
from the annual ones. **Not wired into any UI yet** — deliberately; a per-credit figure needs
its own correctly-labeled display, not a relabeled copy of the annual one.

**UBC (University of British Columbia)**: real, live, directly-readable table (not a PDF) —
`https://vancouver.calendar.ubc.ca/fees/tuition-fees/undergraduate`, explicitly the 2026/27
calendar. International, per credit, students commencing 2026/27: $1,434.70 (Music, lowest) to
$2,222.61 (Commerce, highest). Domestic per-credit low end (most Year 1 programs): $206.69 —
recorded as a low anchor only, not a full domestic range, since this pass's focus was the
international figure. High confidence.

**University of Alberta**: turned out NOT to be per-credit — a real flat annual rate per
program band, same shape as the UK data (`CaTuitionEntry` now carries its own `feeBasis` per
entry rather than assuming one convention for the whole country). Source:
`https://calendar.ualberta.ca/content.php?catoid=69&navoid=22549`. **Explicitly 2025-26 data,
not 2026/27** — no 2026/27 page exists anywhere on that domain yet (Alberta uses a
cohort-guaranteed model where each entering class's rate locks for the program's duration, so
this is still real, current, verifiable data — just a year behind the rest of this batch, and
labeled as such in `stats_as_of` rather than silently presented as current). International
annual: $32,643.60 (Augustana/Saint Jean/Education/Native Studies/Nursing, lowest band) to
$47,756.40 (Engineering, highest standard band — excludes higher outlier professional programs
Pharmacy/Law/Dental Surgery, none of which are undergraduate first-entry degrees).

**A real, live UI bug found immediately after writing Alberta's data — caught by looking at
the page, not just trusting the write succeeded**: the detail page's tuition StatCard hardcoded
`£` and the label "UK Home tuition"/"UK/Home rate" unconditionally, both silently assuming
every `tuition_*_annual` figure is UK/GBP. Alberta's page rendered "From £32,643.6/yr" — wrong
currency symbol, plus a stray decimal from an unrounded value. Fixed in the same commit as the
Alberta data: a small unit-string -> currency-symbol map (`app/(app)/universities/[id]/
page.tsx`'s new `CURRENCY_SYMBOLS`/`currencyPrefix`, covering GBP/USD/EUR/CAD/AUD so far —
extend as new countries' tuition data lands), values rounded to whole currency units, and the
labels genericized to "Domestic tuition"/"Domestic rate" since this page serves every country,
not just the UK. Verified live both ways: Alberta now shows "From CA$32,644/yr", Edinburgh
still correctly shows "From £29,600/yr, Domestic rate: £9,790/yr" — the relabel didn't regress
the existing UK case.

**Western University and McMaster investigated, genuinely left unresolved.** Western: every
fee schedule found is PDF-only (`2026-27-Program-Specific-Tuition-Fees.pdf` and siblings), no
static HTML table or summary page. McMaster: confirmed per-credit billing (same shape as UBC),
but its actual rate table is an XLSX rendered through Microsoft's Office Online viewer
(`view.officeapps.live.com`) — the numbers live inside a canvas/iframe, not real page text this
pass's tooling could read. McGill and University of Toronto remain unresolved from the prior
pass too (see below) — not attempted-and-abandoned in either case, all four genuinely checked.
McGill: Quebec's tuition structure is real but complex (a base per-credit Quebec rate plus
separate out-of-province supplements, plus a cohort-guaranteed international rate), and
McGill's own international fee schedule is published only as a PDF with no readable static
page found; search-derived figures conflicted between sources ($31,836 vs $49,000, likely
different years or faculties). University of Toronto: fee schedules are fragmented per
constituent college (Trinity, Victoria, University College, St. Michael's, Innis, Woodsworth
each publish their own PDF) on top of per-faculty variation — all PDF-only, none readable live.
None of the four downloaded (file downloads need explicit user permission, out of scope for an
unattended pass) or written. 23 further Canadian universities queued, not attempted.

**Canada — second batch, 2026-08-18, 3/27 (+1: Waterloo).** New `feeBasis: "per_course"` added
to `CaTuitionEntry` — Waterloo bills per 0.5-unit course (its own real billing denomination,
kept distinct from UBC's per-credit figure via the `unit` string, never conflated). Explicitly
Fall 2025 data (no 2026/27 schedule found), same honest-about-staleness treatment as Alberta's
entry. $4,698.20–$6,919.40/course across standard faculties. Five more genuinely investigated
this batch, none written: Calgary (Calendar is the real source but not a static page, third-
party estimates for it conflict too widely to trust, needs dedicated navigation not attempted
here); Simon Fraser (structurally cohort-dependent — a real tuition-guarantee system where the
per-unit rate depends on the student's ENTRY YEAR, not just the current year — no single "2026/
27 rate" exists the way it does for every other entry in this file); Ottawa (official page
returned HTTP 402 to this pass's fetch tooling — fetch-access failure, not confirmed absent
data); Victoria (official page explicitly defers actual figures to the Board's June meeting/
Calendar, its own fee estimator tool was non-functional at check time); Queen's (no official-
domain fee page surfaced in search results at all this pass). 4 metric rows written
(`--apply`). Full gate green (lint/tsc/801 tests/build) after.

Full gate green (`tsc`/lint/713 tests/build) after this batch too.

**Australia — pilot started, 1/37 universities, `scripts/acquire-university-statistics-au.ts`.**
No single obvious national dataset to check first the way StatCan/HESA needed ruling out for
Canada/UK — went straight to official pages.

**University of Sydney**: a genuinely well-built source —
`https://www.sydney.edu.au/study/fees-and-loans/international-student-tuition-fees.html`, a
real table per faculty (13 total) with an explicit `2026 entry` column and separate
`Undergraduate`/`Postgraduate coursework`/`Postgraduate research` rows in the SAME table. Read
only the `Undergraduate` row across all 13 — not an unscoped min/max over the whole page, which
would have silently mixed undergrad and postgrad figures (checked and rejected exactly that
naive approach first). International, 2026 entry: A$49,200 (lowest faculty) to A$60,600
(highest). High confidence.

**UNSW Sydney investigated, genuinely left unresolved, worth naming as a lesson**: real
per-unit-of-credit tables exist (48 units of credit = one standard full-time year), but they
sit behind Undergraduate/Postgraduate JS tabs. A raw DOM scrape pulls all 33 underlying tables
regardless of which tab is "active," with no reliable per-table label distinguishing
undergraduate from postgraduate content — unlike Sydney's page, where the row labels made the
split trivial and safe. Tried simulating a tab click via JS; the tables still reported as
`offsetParent === null` (hidden) afterward, so even that didn't reveal a clean way to isolate
the right subset. Rather than compute a min/max across the mixed set (which would silently
blend two different concepts — a real conflation risk, not a hypothetical one), wrote nothing
for UNSW. **University of Melbourne**: 2026 fee tables are PDF-only
(`2026-International-Fee-Tables.pdf` and a companion course-tuition PDF); the international-
applications landing page shows only a $17,000 deposit figure, no rate table. Not written.

**Domestic fees deliberately not attempted for Australia** — Australian domestic students don't
pay a flat "domestic tuition" the way UK/Canadian students do; most hold a Commonwealth
Supported Place (a government-subsidised, field-of-study-specific "student contribution
amount," not a single figure comparable to what this pass has been recording as `domestic` for
other countries). Modelling that honestly needs its own research pass, not the UK/Canada
`domesticLow` field reused for a structurally different system — left out rather than forced.

36 further Australian universities queued, not attempted. Full gate green (`tsc`/lint/713
tests/build) after this batch too.

**Australia closed out for this pass, 2026-08-18 — a structural finding, not a tier problem.**
Checked one more candidate before moving to Germany: Deakin University (a real, well-regarded
mid-tier university, deliberately not a Group-of-8 research university like the 5 already
rejected). Same wall: `deakin.edu.au`'s own international-fees page states plainly that the
per-study-period fee "depend[s] on when you commenced your course" and directs to a per-degree
fee finder / estimator — no static aggregate table. This confirms the pattern isn't about
institutional prestige tier (Sydney is itself a Group-of-8 university and DID have a real
table) — it's that most Australian universities, regardless of ranking, route fees through a
per-course tool rather than publishing one. Closing Australia here per the founder's own "don't
force a country" instruction: 2/38 written (Sydney + none from this check), 6 genuinely
investigated and well-documented negatives (UNSW, Melbourne, ANU, UQ, Monash, Deakin), 32
queued but not worth further one-off attempts until a future pass is willing to drive the
per-course tools programmatically.

**Germany — done in one pass, 49/49 universities, a real "one law, many universities" case
found via the founder's own SCALABILITY CHECK instruction.** Unlike the UK/Canada/Australia,
German tuition isn't set per-institution — it's set by STATE LAW. Destatis (checked first, the
obvious bulk-data candidate) publishes per-institution student-count data but no per-institution
fee dataset, because there's no per-institution fee *to* dataset: Baden-Württemberg is the only
one of Germany's 16 states charging non-EU/EEA students tuition (€1,500/semester = €3,000/year,
state law `Landeshochschulgebührengesetz`, since WS2017/18); every other state's public
universities charge genuine, verified $0 tuition to domestic and international undergrads
alike. Confirmed directly on 5 of the 9 Baden-Württemberg institutions' own pages this pass
(Heidelberg, Stuttgart, Freiburg, Konstanz, Ulm all independently state the identical figure
and cite the same law); the remaining 4 (Tübingen, Mannheim, Hohenheim, KIT) have their own
confirmed official fee-page URL at the same statutory rate, not individually re-quoted —
flagged with `data_quality_flag: "current_search_cited"` rather than silently treated the same
as the 5 read directly. The 38 other public universities get a verified $0/$0, cited to the
national policy fact rather than a per-institution page (`source_type: "web_search"`, honestly
distinct from `"official_primary"`). 2 genuinely private universities in the spine — Constructor
University (Bremen) and Frankfurt School of Finance & Management — are explicitly excluded from
the state-law rule (private tuition is a real per-institution decision, not policy) and
researched individually instead: Constructor €20,000/year flat (own hosted Cost-of-Attendance
fact sheet, stable across 3 years of the same document found in search), Frankfurt School
€16,400/year flat (own "Academic Year 2026/2027" cost-of-attendance PDF). All 98 rows
(49 universities × domestic + international) written in one `--apply` pass —
`scripts/acquire-university-statistics-de.ts`.

**A real UI bug this batch surfaced, fixed in the same pass — found by looking at the live
page, not just trusting the write succeeded, same discipline as the Alberta currency bug**: the
detail page's tuition StatCard hardcoded the phrase "From X — Varies by course" for every
`tuition_international_annual` value, which was a safe assumption while every prior country's
data was a genuine range (`precision_state: "range"`). Germany's data is `precision_state:
"exact"` — a single flat number (€3,000, or a verified €0) with no course-to-course variation
to caveat — so the old copy would have told a TUM applicant their genuinely free tuition
"varies by course," which is simply false. Fixed in `app/(app)/universities/[id]/page.tsx`: the
"From "/"Varies by course" phrasing is now conditional on `precision_state === "range"`, and a
new `formatTuition()` helper renders an exact `0` as "Free" instead of "€0/yr" (0 is real,
verified data here, not a missing value — a truthy check would have wrongly hidden it, but this
codebase already used `!= null` throughout, so no silent-disappearance bug, just a wrong
caption). The metrics query also needed `precision_state` added to its `select()` — it wasn't
being fetched before. Verified live for all three new shapes: Heidelberg ("€3,000/yr" /
"Domestic rate: Free", no "varies" language), Technical University of Munich ("Free" / "Free"),
Constructor University ("€20,000/yr" / "€20,000/yr", no "From"/no "varies"); re-verified the
pre-existing UK range case is unaffected (Edinburgh still "From £29,600/yr" / "Varies by
course. Domestic rate: £9,790/yr"). Full gate green (`tsc`/lint/801 tests/build) after.

**Netherlands — done in one pass, 13/13 universities, a genuine hybrid: scalable for domestic,
real per-university research for international.** The statutory tuition fee ("wettelijk
collegegeld") is set annually by the Dutch government and confirmed directly on DUO's own page
(duo.nl, the government's student-finance executive agency) at **€2,694 for 2026-2027** —
applies uniformly to EU/EEA/Swiss/Surinamese students at every government-funded Dutch
university, all 13 of which qualify. Written as `tuition_domestic_annual` for all 13 — a real
"one government figure, many universities" win, same shape as Germany's state law. The
international side ("instellingscollegegeld") is NOT government-set — each university prices it
independently, and (unlike Germany) most price **per faculty**, not as one institution-wide
number; Nuffic (checked as a candidate bulk source) runs a scholarship database, not a
comparative fee dataset, so this half needed real per-university research like the UK. Resolved
9/13: Delft (€19,906, flat), Eindhoven (€18,600, flat), Wageningen (€18,300, flat, explicitly
confirmed uniform), Tilburg (€13,400, flat, search-cited — direct fetch 403'd), Amsterdam
(€17,500–34,700, Humanities to Medicine), Erasmus Rotterdam (€13,500–32,200, most faculties to
Medicine), Groningen (€14,000–32,000, 4 programme bands, search-cited), Twente
(€12,300–16,400, two tiers), Leiden (€14,300–30,200, most faculties to Medicine). 4 genuinely
unresolved, each investigated not skipped: Utrecht (general fee page links only to a PDF, no
static figure), Vrije Universiteit Amsterdam (confirmed to vary by programme, PDF-only
breakdown), Maastricht (a real low/high/top three-tier system exists but the tier boundaries
aren't on any static page found — only one specific surcharged tier, €20,109, was directly
confirmed, not representative enough to anchor a range on), Radboud (confirmed per-programme,
directs to individual programme pages, no general figure). 22 metric rows written in one
`--apply` pass — `scripts/acquire-university-statistics-nl.ts`.

**A real near-miss caught mid-research, before anything was written, worth naming as a
process lesson**: a first pass took Leiden's figure from one specific programme's page
(€18,700) as if it were Leiden's single general rate — it's actually just the Faculty of
Science's rate on that per-faculty schedule. Re-fetching Leiden's actual GENERAL bachelor's
tuition page (not a specific programme's page) surfaced the real range, €14,300–30,200, before
`--apply` ran. Prompted a second look at every other "clean single figure" candidate against
its own general overview page rather than a search-engine summary of one programme's page —
Utrecht failed that re-check (general page links to a PDF with no static figure) and moved from
"resolved" to genuinely unresolved as a direct result. Same discipline as the UCL
supersession-registry lesson earlier: check the authoritative thing directly, don't trust a
plausible-looking shortcut. No UI bug this time — the Germany pass's `precision_state`-aware
StatCard logic handled every new range/exact/domestic-only combination correctly without
further changes; verified live anyway: Amsterdam ("From €17,500/yr" / "Varies by course.
Domestic rate: €2,694/yr"), Delft ("€19,906/yr" / "Domestic rate: €2,694/yr", no "From"/no
"varies"), Utrecht ("Domestic tuition €2,694/yr" / "International fee not published..." — the
domestic-only fallback branch). Full gate green (`tsc`/lint/801 tests/build) after.

**France — 19/30 of this spine's French entries, done in one pass; the other 11 investigated
and confirmed to be a genuinely different case, not left out by oversight.** France sets a
national statutory fee by government decree, uniform across public universities — €178/year
for Licence (Bachelor's) for 2026-2027 for domestic/EU/EEA/Swiss students. Since décret
n° 2026-385 (19 May 2026), non-EU ("extra-communautaire") students at public universities pay a
differentiated national rate instead: €2,902/year, confirmed via multiple independent
university pages (Lyon 1, CY Cergy, Bordeaux, Brest) all describing the identical
decree/figure, plus the government's own FAQ page (fetch blocked, HTTP 403, cited as source
anyway — a Cardiff-class fetch-access issue). Universities may exempt up to 30% of subject
non-EU students from this rate based on personal circumstances (2026-27 transitional cap,
dropping to 25% in 2027-28) — €2,902 is still the real rate at least 70% of non-EU students
actually pay, same "a real sticker price can still have some students receiving a discount"
reasoning this project already applies to merit scholarships elsewhere. Written for 19
universities confirmed to be on this standard schedule — **38 metric rows in one `--apply`
pass** — `scripts/acquire-university-statistics-fr.ts`.

**The other 11 of this spine's 30 French entries were checked individually, not assumed onto
the national schedule, and each turned out to have a real, different, decree-independent fee
mechanism** — a materially higher rate of genuine exceptions than Germany's 2 private
universities or the Netherlands' 4 research gaps, and worth naming as its own finding: Sciences
Po (long-published income-based sliding-scale tuition, never on the national schedule); École
Centrale de Lyon (confirmed on its own page: cycle-ingénieur tuition is now literally
income-based, €1,613–4,113 depending on family taxable income — not a course-based range this
project's model can represent honestly); Institut National Polytechnique de Toulouse (an
"Institut" grouping several constituent schools, no single institution-wide figure surfaced,
genuinely fragmented); CNAM (fees set per regional training centre, confirmed via its own
fragmented site structure — Paris/Nouvelle-Aquitaine/etc. each separate — no single national
figure exists to write); École Polytechnique, Institut Polytechnique de Paris, Université PSL,
Université Paris Dauphine - PSL, École Normale Supérieure de Lyon (each a "Grand Établissement"
or part of one, with its own government-granted fee-setting autonomy, historically and
currently different from the standard schedule); ESCP Business School, ESSEC Business School
(private, real market-rate tuition, never subject to any public-university decree). None
guessed at or force-fit onto the €178/€2,902 schedule — each confirmed individually before being
excluded, matching the same "verified unavailable > fabricated available" discipline as every
other country's negative results, just a higher count of them for this one country. Queued for
a possible dedicated future pass — most are prestigious, high-student-interest institutions.
Verified live: Sorbonne University ("€2,902/yr" / "Domestic rate: €178/yr", no "From"/no
"varies" — the Germany-built `precision_state` logic needed no changes again); Sciences Po
correctly still shows "Cost of attendance: Unavailable" rather than a wrongly-applied national
figure. Full gate green (`tsc`/lint/801 tests/build) after.

**Switzerland — 7/11, done in one pass; a real two-tier system, each tier researched on its own
terms.** No single national or cantonal-uniform rate exists here, unlike Germany/France/
Netherlands. Tier 1: the "ETH domain" — ETH Zurich and EPFL, Switzerland's 2 federal institutes
of technology, share one federal policy set by the ETH Board. From fall semester 2025
(continuing through 2026-2027): CHF 730/semester (CHF 1,460/year) for Swiss/Liechtenstein
students; CHF 2,190/semester (CHF 4,380/year) for other foreign students — a threefold
increase, confirmed directly on ETH Zurich's own page and independently corroborated for EPFL
(the same ETH Board decision explicitly names both). Tier 2: every other university in this
spine is cantonal — each of Switzerland's 26 cantons funds and prices its own university
independently, researched individually like the UK. Resolved: University of Zurich (CHF
1,440/year domestic, base fee unchanged since 2012; international left unresolved — a new
"additional fee for foreign students" regulation takes effect 1 January 2026 but no static page
stated the actual amount); University of Basel (CHF 1,700/year, **same for domestic and
international** — Basel explicitly does not currently distinguish by nationality, unlike most
other Swiss universities); University of Geneva (CHF 1,000/year, also **same for both** — its
own site states this directly); University of Bern (CHF 1,700/year domestic, CHF 3,400/year
international — a real, *adopted* increase effective "ab Herbstsemester 2026," not a proposal,
confirmed via UniBE's own dedicated page plus multiple independent Swiss news outlets; today's
date falls right at this transition); University of Lausanne (CHF 1,400/year domestic, CHF
2,100/year international, 2025-26 rate, no newer figure found). Not attempted this pass, queued:
USI, University of Fribourg, University of St. Gallen, Zurich University of Applied Sciences
(a Fachhochschule — a genuinely different institutional tier, would need its own research).

**Worth naming as a real finding**: Basel and Geneva both currently charge domestic and
international students the identical fee — a genuine, verified fact, not a research gap — and
both have pending (not yet adopted) political proposals to introduce a higher international
rate, which this pass correctly did not use since it isn't law yet. Currency check done before
writing anything: figures are Swiss Francs (CHF), and this codebase's existing `currencyPrefix()`
already renders an unrecognized currency code as `"CODE "` (confirmed live: "CHF 4,380/yr") —
the standard convention for CHF, which doesn't commonly use a dedicated symbol the way £/€/$
do — so no detail-page change was needed for this country, unlike Canada's original hardcoded-£
bug. Verified live: ETH Zurich ("CHF 4,380/yr" / "Domestic rate: CHF 1,460/yr"); Geneva ("CHF
1,000/yr" / "Domestic rate: CHF 1,000/yr" — the same-fee case renders correctly, just
duplicated, which is honest rather than a bug). Full gate green (`tsc`/lint/801 tests/build)
after.

**Italy — 4/38, done for this pass; the real finding is the data MODEL, not a source.**
dati-ustat.mur.gov.it (flagged unreachable in an earlier session) was not re-hit. Universitaly
has no bulk tuition dataset either. Went to individual pages, and found something genuinely
different from every country so far: Italian PUBLIC university tuition is not a flat number or
even a course-based range — it's **ISEE income-based** (the same concept, "Indicatore della
Situazione Economica Equivalente," for domestic AND international students; non-EU students
use an equivalent foreign-income calculation, "ISEE Parificato"). A national ministerial floor
sets a "no tax area" below which tuition is €0, but sources disagreed on the exact floor
(€22,000 / €27,000 / €30,000 depending on source and possibly year) — not resolved to one
figure, not needed for what was written. Each university sets its own bands AND its own
**maximum** above that floor — no single national ceiling either. What every researched
university publishes clearly is that maximum, so that's what's written: **Politecnico di
Milano** (€3,898, students who miss the ISEE deadline are locked into this bracket), **University
of Milan** (€5,207, from its own signed 2026/27 fee regulation), **University of Pisa** (€2,900,
the university's own page literally says "varies between €0 and €2,900 based on your ISEE"),
**Bocconi University** (private — €17,000, but Bocconi runs its own separate income-based system,
Bocconi4Access, reaching down to €0 for the lowest-income bracket; not the public framework, a
private university choosing a similar shape independently).

**Schema check done before writing anything, per the founder's own instruction not to assume a
migration is needed**: `precision_state` has a check constraint
(`supabase/migrations/0038_canonical_entity_registry.sql`) allowing `'exact','approximate',
'lower_bound','upper_bound','range','category_only','unknown'` — `upper_bound` already exists
and fits exactly (a real ceiling, not a course-driven range, not a universal flat rate). No
migration proposal needed. Used for every Italy row.

**Public vs private kept strictly separate**: 4 of this spine's 38 Italian universities are
genuinely private and not subject to any public ISEE regulation — Bocconi, LUISS Guido Carli,
Università Cattolica del Sacro Cuore, Università Vita-Salute San Raffaele (the latter two are
NOT reliably flagged as private in `institution_type` for this spine — identified from outside
knowledge, not assumed public just because the column says "university"; worth a data-quality
note for whoever owns that field). Only Bocconi resolved this pass; LUISS's only sources found
were third-party aggregators, never luiss.it — not trusted, same discipline held throughout
this project.

**A real near-miss, caught before `--apply`, worth naming**: an initial draft had University of
Naples Federico II at €2,384 with a clean-looking regional-tax breakdown. A follow-up
site-restricted search of unina.it itself surfaced a DIFFERENT regional-tax figure than the
first pass found (€130/151/173 vs €125.50/146.50/167.50) and revealed the fee is actually
resolved through a calculator tool (calcolatrice.unina.it) — the same "no static figure, tool
only" shape as several Australian universities. Dropped from the batch entirely rather than
kept on a source that turned out to be aggregator-only and possibly stale — the same bar LUISS
was held to, applied to itself mid-research.

**A real UI bug found live, fixed in the same pass — this one a genuine regression, not a new
data shape's first exposure**: the detail page's tuition StatCard computed one `precisionState`
qualifier from the INTERNATIONAL figure and reused it for both the international value and the
domestic figure in the caption. This was invisible while every country's domestic figure
happened to be `"exact"` too, but Italy's income-based `"upper_bound"` case made the sharing
pattern obviously wrong, and re-verifying Edinburgh (UK) right after — international `"range"`,
domestic `"exact"` — caught it in the act: domestic had silently started rendering "From
£9,790/yr" instead of "£9,790/yr". Fixed by computing each figure's qualifier from its OWN
`precision_state` independently. While fixing it, extracted `formatTuition`/`currencyPrefix`/
`tuitionQualifier` out of the page into `lib/universities/tuition-format.ts` specifically so
this class of bug is unit-testable going forward, not just re-discoverable by manually
re-clicking through countries — `__tests__/universities/tuition-format.test.ts` pins the
regression down directly. Verified live after the fix: Politecnico di Milano ("Up to €3,898/yr"
/ "Income-based (ISEE) — most students pay less. Domestic rate: Up to €3,898/yr"), Bocconi
(same shape, €17,000), Sapienza (genuinely unresolved — "Cost of attendance: Unavailable", no
fabricated ceiling), Edinburgh re-confirmed correct post-fix ("From £29,600/yr" / "Domestic
rate: £9,790/yr", no stray "From"). Full gate green (`tsc`/lint/809 tests/build) after — one
build attempt transiently failed on a type error in the OTHER session's own uncommitted,
in-progress `lib/acquisition/image-storage.ts`/`scripts/acquire-university-images.ts` (neither
touched here); retried once and it was clean, consistent with those files being mid-edit by
that session at that exact moment, not a problem introduced by this work.

**Coverage report extended, a small permanent addition, not a one-off**: `npm run
report:universities` (`scripts/university-data-report.ts`) now includes a per-country tuition
table (known/missing/total/coverage%, sorted by missing count) plus a note explaining why the
US shows 0 there by design (its cost data lives in the separate `university_statistics.
cost_of_attendance` column, 128/131 covered) rather than as a real gap. This is the tool the
founder's new coverage-driven-selection instruction expects to be run before picking each next
country — see "Next" above for what it showed right after Italy.

**Spain — 10/29, done for this pass, the first country picked by the coverage report's ranking
rather than a fixed list.** `ciencia.gob.es` (the lead flagged in passing in the Canada script's
own header, never verified until now) does not itself publish a tuition dataset — checked
directly. The real pattern: Spanish public tuition is priced per ECTS credit, by REGION (one of
17 comunidades autónomas), not by institution and not nationally — every public university in a
given region charges the same per-credit price, set by that region's own annual decree. A
Spanish Grado is a standardised 240 ECTS over 4 years (60 ECTS/year, government-mandated, not a
guess), so `credit price × 60` is a legitimate annual estimate — written as `precision_state:
"approximate"` (another existing, already-allowed check-constraint value, same "check the
schema before assuming a migration" discipline as Italy's `upper_bound`). Two regions resolved,
both confirmed CURRENT for 2026-2027 specifically, not an older year silently carried forward:
**Comunidad de Madrid** (€18.46/credit, DECRETO 43/2022, 5 public universities in this spine)
and **Catalunya** (€17.69/credit, DECRET 96/2026 de 16 de juny — a 2026-dated decree, doubly
confirmed via the Generalitat's own announcement AND University of Lleida's own page, both
independently stating the identical figure; Catalunya has also recently consolidated to one
flat rate for every Grado field, simpler than Madrid, which still varies by field — the Madrid
figure used is the base/lowest tier). 20 metric rows written in one `--apply` pass.

**A real regional bonification found, correctly NOT modelled, worth recording since it changes
what the sticker price means**: Andalucía subsidises 99% of the cost of credits passed on first
enrolment — a real, large discount programme. Andalucía was not written this pass regardless,
not because of the bonification but because the only credit-price figure found (€12.62) was
dated 2025-26 with no confirmation it still holds for 2026-27 — the same "verify by academic
year" discipline that caught Leiden's near-miss in the Netherlands pass. Valencia (decree
confirmed to exist, no specific figure surfaced) and every other region not attempted. 6 private
universities in this spine's Spain list (Comillas, IE University, Universidad Europea, Universitat
Ramon Llull, Universitat Internacional de Catalunya, University of Navarra) are not subject to
any regional decree at all and were not researched — queued.

**UI**: added a fourth `tuitionQualifier()` shape, `"approximate"` → "~€X/yr" with "Estimated
from the region's official per-credit price," kept distinct from `"range"`'s "varies by course"
and Italy's `"upper_bound"`'s "income-based" wording — each says something different and true,
not a generic "not exact" catch-all. Verified live: Complutense Madrid ("~€1,108/yr"), Universitat
de Barcelona ("~€1,061/yr"), both domestic and international identical (no differentiation found
in either region's decree this pass, stated plainly in notes rather than guessed at). Full gate
green (`tsc`/lint/821 tests/build) after.

**China — investigated, deliberately NOT written, a real negative result, not a skip.** China
is the largest remaining zero-coverage pool (64 universities) so it was checked next per the
coverage report's own ranking. No provincial or national bulk source was found accessible to
this pass's tooling (China's price-bureau/NDRC-style provincial tuition-ceiling mechanism is
real in principle but no citable English- or Chinese-language page stating current figures
surfaced this pass). Worse: individual-university figures found for the same two flagship
universities (Peking University, Tsinghua University) genuinely CONFLICT by roughly 5-6× between
two source clusters — Chinese-language results (5,000-5,300 RMB/year) vs. English-language
study-abroad aggregator results (26,000-30,000 RMB/year). These likely represent domestic vs.
international tuition respectively (a real, large gap that does exist in China's dual-track
system) rather than being simply wrong, but **neither figure was confirmed on the university's
own .edu.cn domain this pass** — every source was a secondary aggregator (gk100.com, 6617.com,
globalscholarships.com, wentchina.com, cucas.cn), the same class of source this project has
consistently refused to trust alone (LUISS, Naples Federico II). Not written. China needs a
dedicated future pass with either working .edu.cn access or a confirmed official bulk source —
queued with reason code `source_unreachable` / `unverified_conflicting_sources`, not attempted
further this session per the founder's own "don't force a country" instruction.

**South Korea — 2/31, done for this pass, with two specifically-diagnosed blockers rather than
a vague "not found," per the founder's own explicit instruction to determine what would make
each unresolved case resolvable.** No national or regional price exists — Korea's Higher
Education Act Article 11 caps the year-over-year tuition INCREASE (1.2× the 3-year average
inflation rate, tightened from 1.5× for 2026, a real and current policy), not the base amount,
so it can't be used to derive a figure. Each university still publishes its own tuition,
varying by college within the institution (Humanities cheapest, Engineering/Natural Sciences
priciest) — the same course-based-range shape as UK/Canada/Australia/Netherlands. Resolved:
**Seoul National University** (public, ₩4,884,000-5,996,000/year across colleges, from SNU's
own fee-table PDF) and **Yonsei University** (private, ₩8,008,000-10,432,000/year, from
Yonsei's own PDF, with Engineering's figure cross-checked using BOTH semesters independently,
not just one doubled). Both PDFs themselves returned as unreadable garbled binary to this
pass's own WebFetch tool (the same failure class as Padova's Italy PDF) — rescued only because
a search engine's own text extraction had already indexed the numbers; a genuinely fragile path
worth naming, not assumed to work for every Korean university.

**Two specifically-diagnosed blockers, not silently skipped**, exactly matching what the
founder asked for: **KAIST** has a real, officially-documented near-total tuition waiver for
undergraduates (KAIST's own scholarship-policy page states the PRINCIPLE is full tuition
support for all bachelor's students, domestic and international, with only *partial* — not
full — support for continuing students whose *previous* semester GPA fell below 2.7; new
first-years default to full support since they have no previous semester). An official KAIST
document exists with columns literally labelled "tuition(A), scholarship(B), amount
collected(A-B)" — structurally the same shape as Italy's ISEE ceiling-vs-actual system, just
merit-conditioned instead of income-conditioned, and would use the same `upper_bound`
`precision_state` once resolved. Not written because the nominal 수업료(A) figure itself never
extracted from that binary PDF. **Unblocks with**: working PDF-to-text extraction for
`kaist.ac.kr/kr/html/footer/0802.html?...file_id=59190`, or an HTML equivalent if one exists.
**Korea University** — the exact right official page was found and confirmed live
(`korea.ac.kr/ko/582/subview.do`, "2026학년도 등록금 일람표," three real tuition PDFs linked)
but, unlike SNU/Yonsei, no search-engine-indexed rescue existed for its specific PDF this pass.
**Unblocks with**: the same PDF-extraction fix, applied to that specific document. 27 further
South Korean universities queued, not attempted.

**Japan — 17/22, done for this pass, the best single-adapter yield of this entire workstream.**
Japan's national universities (国立大学, a distinct legal category under the National University
Corporation Act) charge one MEXT-set standard amount, **¥535,800/year**, unchanged since 2005
— confirmed directly on the University of Osaka's own tuition page ("Undergraduate student
¥535,800," no domestic/international distinction stated anywhere on the page), independently
corroborated for University of Tokyo (explicitly no separate international rate). 16 of this
spine's 22 Japanese universities are true national universities; a 17th, Osaka Metropolitan
University, is technically a different legal category (a municipal/prefectural "public
university corporation," not "national") — checked specifically rather than assumed onto the
same rate just because it's publicly governed (the same caution that correctly excluded
several non-Go8 Australian universities from an assumed pattern earlier in this workstream),
and turned out to genuinely follow the identical ¥535,800 figure, confirmed via its own English
tuition page. The remaining 5 Japanese universities in this spine (Waseda, Keio, Ritsumeikan,
Sophia, Tokyo University of Science) are private, set their own tuition independently, not
researched this pass. 34 metric rows written in one `--apply` pass —
`scripts/acquire-university-statistics-jp.ts`. A small UI quality addition alongside this: JPY
and KRW now render with their real symbols (¥, ₩) instead of the generic code-plus-space
fallback, added to `lib/universities/tuition-format.ts`'s `CURRENCY_SYMBOLS` map now that real
data in both currencies exists. Verified live: University of Tokyo ("¥535,800/yr" / "Domestic
rate: ¥535,800/yr").

**Malaysia — investigated across 25 universities, deliberately not written, a genuine PDF-
gating finding, not a vague skip.** No MOHE-level bulk figure found (one search's own summary
claimed "According to the Ministry of Higher Education (2026)" but that framing wasn't traced
back to an actual MOHE page — not trusted on that basis alone). Checked the 5 major public
research universities individually, one at a time, same rigor as every other country: **UM**
(Universiti Malaya) — the exact right official fee pages found on `study.um.edu.my`, including
a specifically-titled "Fee Structure, UG, International" PDF — but every one of them is a PDF,
and this pass's WebFetch tool could not extract text from it (garbled binary, the same failure
class as Padova's Italy PDF and Korea University's PDF). **UPM** (Universiti Putra Malaysia) —
same story: an official PDF found directly on `eng.upm.edu.my` ("INTERNATIONAL UNDERGRADUATE
STUDIES FEES"), fetched, also unreadable binary. A consistent RM 12,000-22,000/year range
*was* found across two independent searches, but only ever attributed to third-party
aggregators, never confirmed on upm.edu.my's own readable content — the same "don't trust
aggregator-only, even when a real official PDF is known to exist somewhere" bar this project
held Naples Federico II and LUISS to, applied to itself here rather than relaxed just because
a range happened to look clean. **USM** (Universiti Sains Malaysia) — an official fee page
found on `admission.usm.my`, but the actual figure came back truncated mid-sentence in every
search attempt. **UTM** (Universiti Teknologi Malaysia) and **UKM** (Universiti Kebangsaan
Malaysia) — only aggregator-derived figures, describing whole-degree totals rather than clean
annual figures, no official-domain confirmation. Nothing written. **Unblocks with**: working
PDF-to-text extraction for Malaysian university fee documents specifically — the same fix
needed for KAIST's and Korea University's blockers in the South Korea section above; this
looks like a genuinely recurring tooling gap across several countries' PDF-only fee schedules
this session, worth a dedicated look if the pattern keeps recurring on the next country too.

**Russia — investigated across 6 major universities, deliberately not written, the pattern
this time is fragmentation and staleness rather than PDF-gating.** No national-level bulk
figure exists — international tuition at Russian universities is a real per-institution,
often per-programme decision, no equivalent of Japan's MEXT standard or Germany's state law.
Checked individually, each with a specific, different reason for staying unresolved: **Lomonosov
Moscow State University** — the only figure found (539,070 RUB/year) came from one specific
faculty's page (Faculty of Television, ftv.msu.ru), not a university-wide source — the same
"don't generalize one department's rate university-wide" caution that caught Leiden's
near-miss in the Netherlands pass, applied here before ever reaching `--apply`. **HSE
University** — the only figure found is for one named programme (the International Bachelor's
in Economics and Finance, 225,000-900,000 RUB, itself a discount-scaled range not a base rate),
and HSE's own page states 2026 figures aren't finalized yet — both programme-specific and
year-uncertain. **ITMO University** — a real near-miss caught before writing anything: a
search summary claimed a general "450,000-679,000 RUB" institution-wide 2026-27 range, but
directly fetching ITMO's own official bachelor's-programmes overview page
(int.itmo.ru/en/bachelors_programs) shows it explicitly states there is NO general figure —
fees are calculated per individual programme, with no static range published anywhere on that
page. The search-derived range was likely blended from several individual programme pages and
does not represent a real institution-wide figure — not written. **MIPT** — the only figure
found is explicitly stale (2021), search results themselves flagged this. **RUDN** and
**Bauman** — no official-domain figures found at all, aggregator-only vague estimates
(unipage.net, sulekha.com, unirank.org), each explicitly declining to give a number and
directing to "contact admissions" instead. Nothing written. Queued for a future pass with
either working PDF extraction (same blocker as Malaysia/Korea above) or a genuinely different
research approach — six for six individually-checked major universities returning the same
"no reliable general figure" result is a real, consistent finding about this country, not six
separate near-misses that might resolve with more searching.

**Saudi Arabia — 13/18, done for this pass, a real national policy for domestic students, a
genuinely per-institution one for international.** Domestic: Saudi Arabia has never charged
its own citizens tuition at public universities — confirmed directly on KFUPM's own page
("Saudi national students admitted directly to KFUPM receive government scholarships that
cover their tuition, making education tuition-free for domestic students"), framed as a
national government mechanism tied to admission itself, not a KFUPM-specific programme.
Extended to the other 12 confirmed-public universities in this spine as a national policy fact
— the same "confirm on a sample, extend to the legal category, flag it honestly" discipline
already used for Germany's Baden-Württemberg law and Japan's MEXT standard, not individually
re-verified per institution. International: genuinely different, and NOT the same blanket
story — the widely-repeated claim that Saudi public universities are "free for international
students too" turns out, on checking the actual mechanism, to run through a real competitive
government scholarship programme ("Study in Saudi," studyinsaudi.moe.gov.sa) — King Saud
University's own page explicitly states scholarships "are not automatic but require an
application process." KFUPM's own page gives the clearest real figure: SAR 20,000/year sticker
tuition, with a separate, competitive, needs/merit-based committee awarding 10-100% coverage —
not automatic. Written as `precision_state: "upper_bound"`, only for KFUPM (the other 12
public universities' international sticker prices weren't individually researched this pass).
A real supersession caught before writing: this spine's KFUPM duplicate pair ("King Fahd
University of Petroleum and Minerals (KFUPM)" winner, "KFUPM" loser) checked against
`duplicate-supersessions.json` first, same discipline as every country in this project. 4
private universities (Prince Mohammad Bin Fahd, Prince Sultan, Alfaisal, Effat) excluded, not
researched. 14 metric rows written (`--apply`).

**A real UI bug caught live, fixed in the same pass**: the `"upper_bound"` caption hardcoded
"Income-based (ISEE)" — correct wording for Italy, but factually wrong the moment a second,
differently-mechanised country used the same `precision_state`: KFUPM's page rendered "Maximum
— Income-based (ISEE)..." for a merit-scholarship system that has nothing to do with income or
Italy's ISEE system. Fixed by making `tuitionQualifier()`'s "upper_bound" copy deliberately
mechanism-agnostic ("Maximum — many students pay less based on aid or eligibility"), true for
Italy's income-based case and Saudi Arabia's merit-based case alike without naming either
mechanism specifically. `__tests__/universities/tuition-format.test.ts` updated to assert the
generic wording and explicitly check "ISEE" is absent, so a future country-specific term
doesn't quietly leak back in. Verified live after the fix: KFUPM ("Up to SAR 20,000/yr" /
"Maximum — many students pay less based on aid or eligibility. Domestic rate: Free"); Politecnico
di Milano re-checked, still reads correctly with the generic wording. Full gate green
(`tsc`/lint/821 tests/build) after.

**UK — third batch, 2026-08-19, 20→24/79.** Added Bath (a genuinely clean official three-band
table — Band 1/2/3 £25,400/£28,650/£32,000 international, £9,790 Home — the best UK
international source found across all three UK batches so far), plus York, Newcastle, and
Swansea (Home £9,790 only, each independently confirmed live; each joins the now-repeated
"Home is one published figure, international is course-specific with no overview table"
pattern — Newcastle's international gap was already noted in the second-batch note above, this
batch adds its Home figure, which that pass never captured). Cardiff attempted, blocked (HTTP
403 to this pass's fetch tooling, same as the second batch's note — not re-solved). Leicester,
Reading, Liverpool, Sussex, Dundee checked, no clean bulk figure found (per-course only or
figure not yet published for 2026/27) — not written, not guessed. 35 metric rows written,
`--apply` clean. Verified live: University of Bath ("From £25,400/yr" / "Varies by course.
Domestic rate: £9,790/yr"). 55 UK universities remain queued.

**UK — fourth batch, 2026-08-19, 24→25/79 (+1: Surrey).** Surrey publishes a genuinely wide
international course-band spread (£14,600 International Airline and Airport Management to
£48,400 Medicine Graduate Entry) — value_numeric set to the true lowest standard-course band,
consistent with this file's low-end convention. Queen's University Belfast checked and left
genuinely unresolved, worth naming: it publishes a real, different Home fee for
Northern-Ireland-domiciled students (£4,985) than for GB-domiciled students at the same
institution — collapsing that into one `tuition_domestic_annual` figure would misrepresent
whichever group isn't shown, and qub.ac.uk returned HTTP 403 to every URL tried (same block
class as Cardiff), so no live re-verification was possible either — not written rather than
guessed at or collapsed. Kent, Strathclyde, Aston: no single published international figure,
same repeated pattern. 37 metric rows written, `--apply` clean. Verified live: University of
Surrey ("From £14,600/yr" / "Varies by course. Domestic rate: £9,790/yr"). 54 UK universities
remain queued. Full gate green (`tsc`/lint/821 tests/build) after.

**Canada — third batch, 2026-08-19, 3→4/27 (+1: Simon Fraser).** Calgary, Ottawa, Dalhousie,
Victoria, Manitoba, Carleton all checked — no single official-page bulk figure found this pass
(per-course lookup tools, PDF-only schedules, or the fetch tooling itself blocked/paywalled) —
not written, not guessed from an aggregator (several of these have plausible-looking ranges
floating around student-news/aggregator sites — dalgazette.com, leverageedu.com, shiksha.com —
deliberately not used; not an official source per this file's own hierarchy). SFU is a real
addition: a third genuine per-unit billing system for this country (after UBC/Waterloo), same
"no assumed credit-load multiplier" discipline — basic rate $1,262.88/unit (2024/25+ entry
cohort), up to $1,492.13/unit for Beedie School of Business. 5 metric rows written this pass
(SFU + the 4 already-live entries re-confirmed idempotently), `--apply` clean, full gate green.

**Canada — fourth batch, 2026-08-19, 4→5/27 (+1: Université Laval).** A genuinely clean hit:
the official page found is Fall-2026/Winter-2027-specific (unlike several other entries in
this file still pinned to a stale year), a single uniform international rate of $933.53/credit
with no faculty variation stated. The page's own bundled multi-credit totals ($2,800.59 at 3
credits, $11,362.12 at 12, etc.) combine base tuition with foreign-student supplements and
admin/tech/transit fees — recognized as a different, non-comparable concept and not used; only
the clean base per-credit rate is recorded, consistent with every other CAD/credit entry in
this file. 6 metric rows written (Laval + the 5 already-live entries re-confirmed
idempotently), `--apply` clean, full gate green. A separate mandatory $900/year health/
hospital insurance fee also exists — not tuition, not recorded, same treatment as every other
country's administrative fees in this project. 22 Canadian universities remain queued.

**Australia — second batch, 2026-08-19, 1→2/38 (+1: University of the Sunshine Coast).**
Re-confirms this file's own header note: ANU, University of Queensland, Monash, Macquarie, and
Victoria University all re-checked independently this pass, same negative result as before
(per-course fee-tool only, no static table) — the "only Sydney has a real page-wide table"
pattern from the header holds for a 7th/8th/9th/10th/11th university now, not a fluke.
University of Canberra: same pattern, one concrete non-award-program figure ($23,500) but no
undergraduate-degree figure. USC (which rebranded to "UniSC" on a new domain since the header
was written, still stored as "University of the Sunshine Coast" in this spine) breaks the
pattern with a real official program-tier table: $21,000 (1-year Diploma, a different
qualification level, excluded — same discipline as Foundation-year exclusions elsewhere in
this file) up to $38,500 (Physiotherapy Honours); $28,500 (the true low end among actual
Bachelor's programs) used as `value_numeric`. 2 metric rows written (USC + Sydney
re-confirmed), `--apply` clean, full gate green. 36 Australian universities remain queued —
the smaller/regional ones (Charles Darwin, CQUniversity, Southern Cross, Federation-style
institutions) are now the more promising remaining targets, per the same "smaller schools
publish flatter fee tables" pattern already observed in the UK (Bath/Surrey) and Canada
(Laval) batches above.

**Australia — third batch, 2026-08-19, 2→3/38 (+1: Southern Cross University).** Charles
Darwin, CQUniversity, Federation University all checked: real 2026 fee schedules exist (found
real, current PDF filenames) but every one is PDF-only or a per-course tool, nothing this
pass's fetch tooling could read as a clean static page — same treatment as the header's
existing PDF-only negative results. Southern Cross University breaks the pattern with a single
flat annual figure, **$26,000 for most courses** (8 units/96 credit points standard load),
with a named exclusion list (Nursing Masters, two Veterinary bachelor's programs, Study
Abroad, English Language, HDR, non-award) — but flagged **MEDIUM CONFIDENCE**: this figure is
search-cited from the official domain's own "2026 International Student Guide" content, not
independently re-derived — three separate scu.edu.au fee pages were fetched directly this
pass and none of them surfaced the number on the page itself (it appears to live only inside
the PDF guide or behind a per-course JS tool this pass's tooling didn't reach), same
"medium confidence, search-cited" treatment this workstream already gave LSE and QUB. 3 metric
rows written (Southern Cross + Sydney + USC re-confirmed), `--apply` clean, full gate green.
35 Australian universities remain queued.

**Coverage, verified live via `npm run report:universities`**: 110/1019 (10.8%) going into
Italy → 124/1019 (12.2%) after Italy + Spain → 126/1019 (12.4%) after South Korea → 143/1019
(14.0%) after Japan → 148/1019 (14.5%) after a concurrent UK fourth batch (Surrey) and Canada
third batch (Simon Fraser University) — both found already written in their scripts mid-turn
(the same autonomous-continuation pattern documented earlier in this file for the UK third
batch), verified and gated exactly like every other batch before committing rather than
assumed already-applied — → **163/1019 (16.0%)** after Saudi Arabia (Australia also gained 2
more batches, 1→3/38, from further concurrent autonomous work, folded into the count above
without a documentation collision this time). Countries done so far this workstream: UK
(25/79), Canada (5/27), Australia (3/38), Germany (49/49), Netherlands (13/13), France (19/30),
Switzerland (7/11), Italy (4/38), Spain (10/29), South Korea (2/31), Japan (17/22), Saudi
Arabia (13/18). China, Malaysia, and Russia all investigated, deliberately not written (see
above).

After tuition progresses meaningfully: (1) India student counts (~33 remaining, AISHE >
annual report > official institutional stats > official facts page — see the India dead-end
note below, may need real per-institution page work this time), (2) the remaining 15 ambiguous
external-ID records (Phase 7 above), (3) resume `acquire:admissions` once Tavily's plan-limit
blocker clears (item 4 below), (4) admissions/application-system UI completeness audit (already
largely covered by Phase 10's P0E filter-coverage review, but a is/isn't-rendered pass matching
the founder's original P0.5 spec — check `admissions_url`/`application_system`/admission rate/
cost/student breakdown/research topics/institution type/size are each rendered SOMEWHERE across
explorer cards, detail page, and now the compare page, not just acquired into the DB — is still
worth a dedicated look once tuition data exists to actually populate the cost columns being
checked).

1. ~~Duplicate-id cross-registry check~~ — **already covered, confirmed 2026-08-18.**
   `check:university-spine-health`'s own "no external id claimed by >1 live university entity"
   check (built later the same session this item was queued) is exactly this query, run every
   time the health gate runs. Re-ran it standalone just to confirm: still `[PASS] clean`. Not
   a separate thing to build.
2. ~~Phase 11 — UI data-readiness audit~~ — **done 2026-08-18.** QS ranking display fix (see
   the ranking-display commit) was already done. Checked the rest by reading
   `app/(app)/universities/[id]/page.tsx` directly rather than guessing: `admissions_url`/
   `application_system` already rendered fine when present (verified live: MIT's page shows
   an "Admissions" link). But `university_profile_metrics` — the table `research_topics_top5`
   (923/925 coverage after this pass's OpenAlex re-run), `undergraduate_students`, and
   `postgraduate_students` all live in — **was never queried by this page at all**. All of
   that acquired, sourced data was invisible to every student, on every university, the whole
   time. Fixed: added the metrics fetch to the page's existing `Promise.all`, added a
   "Research strengths" section (topic chips + a `SourceBadge` pointing at the OpenAlex
   institution page — reuses the existing SourceBadge component, no new one), and an
   undergrad/postgrad caption under the "Student size" stat when both are present. Verified
   live against a university with each: University of Eastern Finland (real research-topic
   chips + correct source attribution) and MIT ("4,535 undergrad · 7,351 postgrad" under
   11,816 total). Both sections render nothing when the data's absent — most universities
   still don't have it, which is fine, matches every other stat on this page. Full gate green.
3. ~~Phase 6 — OpenAlex retry~~ — **done 2026-08-18**, see "Current state" above.
   `research_topics_top5` 30/1010 → 923/925.
4. Resume `acquire:admissions` once the Tavily plan-limit blocker (see "Current state") is
   resolved — 413 universities still missing `admissions_url`. Not a code blocker. Re-checked
   2026-08-18: still HTTP 432, unchanged.
5. ~~Student counts beyond the US: Germany~~ — **done 2026-08-18.** Found Destatis
   (Statistisches Bundesamt, the federal statistics office) publishes exactly the right table:
   "Statistischer Bericht - Statistik der Studierenden - WS 2024/2025", table 21311-12, broken
   down to individual Hochschule level (not just national/state totals) — downloaded and
   inspected the actual XLSX (`python3`/`openpyxl`, this environment already had it) rather
   than trusting the page copy alone. Genuinely abbreviated German institution names ("U
   Freiburg i.Br.", "U des Saarlandes Saarbrücken") don't string-match our spine's names
   (mixed native-German/English across this spine's own history) — hand-built and individually
   verified a name mapping for all 49 German universities against the extracted table
   (`scripts/enrich-student-counts-de.ts`, `DESTATIS_TOTALS`), the same explicit-override
   discipline `enrich-student-counts-us.ts` already uses for its hard cases, just for
   (almost) every entry instead of a handful. Sanity-checked several figures against known
   real-world institution sizes before trusting any of it (Köln/Münster large ~40-47k,
   Konstanz/Hohenheim small ~8-10k — all landed as expected) and cross-checked TU München's
   own Destatis row (53,970) against our already-stored 51,954 as an independent consistency
   check (close, same ballpark, different semester). Dry run reviewed, then `--apply`: **37/37
   written**, `total_students` coverage 320/1019 → 357/1019. 11 German universities left
   genuinely unresolved rather than guessed (RWTH Aachen and TUM have no clear top-level
   Destatis row under their spine name but already had a stored value anyway; Constructor
   University's only candidate row showed an implausibly low 536; TUHH not found at all).
   Full gate green after (lint/tsc/677 tests/build).
   
   **Italy — investigated 2026-08-18, a genuine dead end for now, don't re-attempt the same
   way.** MUR/USTAT (the right authority — Ministero dell'Università e della Ricerca) has an
   "Iscritti per ateneo" open-data resource that looks exactly right, but its actual host
   (`dati-ustat.mur.gov.it`, also aliased as the older `dati.ustat.miur.it` — same IP,
   `193.206.6.150`) times out at the TCP level on every attempt (`curl -v`: connection timeout,
   not a 403/Cloudflare challenge — a different failure class than HESA, same practical
   outcome). The parent site `ustat.mur.gov.it` IS reachable, but its per-university pages
   (e.g. `/dati/didattica/italia/atenei-statali/torino`) render enrollment figures via
   client-side charts — `WebFetch`'s HTML-to-text conversion gets the page's descriptive text
   but not the chart values, and reading 31 individual charts via real browser automation
   is a materially bigger job than this pass, not attempted. Re-check whether
   `dati-ustat.mur.gov.it` becomes reachable in a future session before trying anything more
   elaborate — the actual dataset is right there if the connection ever succeeds.

   **Spain — done 2026-08-18.** `ciencia.gob.es` (Ministerio de Ciencia, Innovación y
   Universidades) publishes a genuinely bulk, per-university XLSX:
   `https://www.ciencia.gob.es/dam/jcr:717ab000-0372-44e4-bec3-e49afcb2838b/MatriculadosTitulacion2015_2024.xlsx`
   (linked from the "Estadística de estudiantes universitarios" page — the portal's own SPA
   shell isn't fetchable directly, had to `curl` the specific sub-page's raw HTML to find this
   link). Two sheets, "Matriculados Grado" and "Matriculados Master", each one row per
   (Comunidad autónoma, Universidad, Rama, Titulación) with both a 2024-2025 "provisional
   avance" column and a finalized 2023-2024 column — used **the 2023-2024 column**, summed
   across both sheets grouped by `Universidad` (`scripts/enrich-student-counts-es.ts`,
   `ES_TOTALS`). This necessarily **excludes doctorate students** (no `Matriculados Doctorado`
   sheet in this file) — written as `precision_state: 'lower_bound'` (the true total is
   provably ≥ this figure, a systematic exclusion, not rounding noise — a more honest fit than
   `'approximate'`) and stated plainly in `notes`, not hidden. Sanity-checked several figures
   against known institution sizes first (Complutense Madrid and Sevilla both ~58k, consistent
   with their reputation as two of Spain's largest). One genuine ambiguity left unresolved
   rather than guessed: our spine's bare "Universidad Europea" (no campus qualifier) matches
   FIVE separately-branded campuses in the source (Madrid, Valencia, Canarias, del Atlántico,
   Miguel de Cervantes) — no way to know which one our single row means. Dry run reviewed,
   then `--apply`: **26/26 written**, `total_students` coverage 357/1019 → 383/1019. Full gate
   green after.

   **India — investigated 2026-08-18, also a genuine near-term dead end.** AISHE (All India
   Survey on Higher Education, the right authority) has TWO delivery mechanisms, both broken
   or heavy in a different way than Italy: (1) `dashboard.aishe.gov.in`'s "Higher Education
   Institution Directory" — loaded it in a real browser (not just `curl`/`WebFetch`) and it
   throws `ReferenceError: jQuery is not defined` in its own console, a genuinely broken page
   on the government's own site, not a fetch-tooling limitation; (2) `he.nic.in/aishereport`
   — a TLS cert-chain issue (`unable to get local issuer certificate`) plus the same hash-
   routed-SPA problem as the broken dashboard. The fallback is the "AISHE Book" national PDF
   report (e.g. `cdnbbsr.s3waas.gov.in/.../20240214825688998.pdf`) — reachable in principle,
   but a large unstructured national PDF with no guaranteed clean per-institution table the
   way Destatis's XLSX had, and extracting ~33 specific named universities' figures from it
   reliably would need real page-by-page inspection, not attempted this pass. **Pattern
   worth naming**: Germany and Spain both had a genuine bulk machine-readable file one or two
   clicks from their statistics ministry's own page; Italy and India both don't, so far —
   this may be true of the remaining un-investigated countries too. Don't assume the Germany/
   Spain experience generalizes; each country still needs its own honest check before
   assuming a script is buildable.
6. Migration 0043 + the 5 read-path filters (see Phase 2 above) — founder/DDL-access blocked,
   not code-blocked.
7. ~~The ~200-row external-ID-unresolved bucket~~ — **72-bucket worked through 2026-08-18,
   55 resolved.** Pulled the full `unresolved` array out of the fixture (not just the printed
   summary — `declaredName` + full candidate list per row) and went through all 72
   "ambiguous/no-exact-name-match" entries by hand. Root cause, confirmed by reading the
   matcher (`scripts/acquire-university-facts.ts`): it already checks every `nameVariants()`
   form against ROR's full `names` array (not just `displayName`), so a real gap here is
   never simple formatting — it's genuine German ae/oe/ue-vs-umlaut transliteration
   ("Universitaet" vs "Universität"), German-name-vs-ROR's-English-name-form ("Universität
   Heidelberg" vs "Heidelberg University"), or a legacy/short name ROR doesn't list at all
   ("Verona University" vs "University of Verona"). For 55 of the 72, individually fetched
   the proposed ROR record BY ID (not just trusted the unresolved log's truncated top-3
   preview — several of those previews were themselves misleading, e.g. Purdue/St. Gallen/
   "University of the Philippines" genuinely don't show the right answer in their top 3,
   which is exactly why those are NOT among the 55) and confirmed active status, matching
   country, and the declared name appearing in the record's own names before trusting it.
   Added as `MANUAL_ROR_OVERRIDES` in the acquire script — used only when the automatic
   matcher finds zero exact matches, never overriding a genuine ambiguous/multi-candidate
   case. Full-spine re-run: resolved 925 → 982/1019, ambiguous bucket 72 → 15. Reviewed with
   `--plan` (4832 external ids, up from 4556 — all city cross-checks still correctly
   withheld, no new duplicate-id conflicts), then `--apply`: 181 fact writes.
   `check:university-spine-health`'s external-id-uniqueness check still clean — deliberately
   did NOT add both Rutgers–New Brunswick and Rutgers–Newark to the same ROR id, which would
   have broken that invariant (multi-campus-vs-single-ROR-record is a genuine ambiguity, left
   unresolved rather than guessed which campus "owns" the shared id). Remaining 15 ambiguous
   + the political-status "Northern Cyprus" entries (ROR doesn't recognize it as a country, a
   product/policy question above this pass's remit) + a few country-mismatch/no-ROR-hit ones
   still queued — genuinely uncertain or requiring outside knowledge this pass didn't have.

~~Bocconi University's missing QS 2027 row~~ — **done this pass**, see Phase 5.

## University images — P0, new workstream, done 2026-08-18

A founder-directed interruption to the tuition/cost roadmap above: `/universities` cards and
the detail page were showing a generic building icon for every one of the 1010 live
universities, including MIT/Stanford/Oxford/Harvard/Cambridge — a real product-credibility
gap on one of the app's core discovery surfaces. Full pipeline built, piloted, scaled, and
returned to the queued roadmap above per the founder's own instruction (no new approval
wait). This section is the record; resume tuition/cost work from where "Next (queued...)"
left off above.

**Architecture decision, the one worth remembering:** no new migration, no new table, no new
columns. `universities.logo_url` already existed with nothing populating it (see
`types/database.ts`'s own comment on that column) — reused directly for verified logos.
Campus photo URL + provenance live in `university_profile_metrics` (this codebase's own
established flexible-store pattern, already used for `research_topics_top5`/tuition/student
counts) as five scalar metric codes: `primary_image_url`, `primary_image_status` (`verified`|
`official`|`wikimedia_verified`|`needs_review` — the founder's own proposed vocabulary),
`primary_image_license`, `primary_image_attribution`, `primary_image_checksum` (sha256 of the
original bytes, cross-university dedup). This is why the feature was never blocked by the
standing "no DDL access this session" constraint that blocked migration 0043 — worth
copying for any future fact that doesn't clearly need its own column.

**Storage:** new public Supabase Storage bucket `university-images`, created idempotently at
runtime via the Storage Admin API (`storage.createBucket`) — an authenticated HTTP call, not
a SQL migration, so it works under the same DDL-access constraint. One optimized WebP
derivative per university (`{id}/campus.webp`, `{id}/logo.webp`; sharp, downscale-only to
1920px wide, quality 82, EXIF-oriented-then-stripped) — no separate hero derivative; with
`next.config.ts` now allow-listing this one Supabase hostname under
`/storage/v1/object/public/**`, `next/image`'s own on-demand optimizer handles responsive
sizing for both the card and the detail hero from that single source. `logo_url` stays a
plain `<img>` (an arbitrary domain in principle); the new campus image uses real `next/image`.

**Source tiers** (`lib/acquisition/wikimedia.ts`, `opengraph.ts`, `source-authority.ts`'s new
`"image"` fact class, `scripts/acquire-university-images.ts`):
1. Manual override (pilot-only hand fixes, see below).
2. Wikidata P18 (image) → the Commons file it names → that file's own imageinfo
   (url/license/attribution), requested as a Commons-rendered thumbnail
   (`iiurlwidth=2000`) rather than the full original — Commons' own rate-limit error
   for this exact pipeline said as much ("use thumbnail images..."), and some
   originals are 50+ megapixel panoramas. The QID comes from `entity_external_ids`
   (`id_system='WIKIDATA'`), never guessed by name.
3. The official site's own `og:image`/`twitter:image`, accepted when the **page's**
   domain (not the image asset's own domain — real case: Stanford's og:image is
   served from `a-us.storyblok.com`, not `stanford.edu`) passes `sourceAuthority`.
Logos: Wikidata P154 only, no favicon/logo-scraping adapter (deliberate scope cut).
Every candidate is tried in order until one survives real validation (downloaded-bytes
dimensions via sharp — never a URL guess — landscape aspect 1.15–2.6, ≥800×450, checksum not
already claimed by a different university); a university can have a technically-present but
unusable Wikidata image (wrong aspect, too small) and still land on a good og:image instead
of `needs_review`, because resolution collects every tier's candidate rather than committing
to the first one found. `verifyPublicUrlServes` (a real HEAD request) gates the metric write
so `primary_image_url` is only ever written once the URL is confirmed to actually serve —
structurally, not by hope, why "broken: 0" is true.

**A real Wikimedia etiquette bug, worth remembering for any future Commons work:** the first
version of this pipeline sent no identifying User-Agent, and `upload.wikimedia.org` started
returning 429 "Too many requests... contact noc@wikimedia.org" mid-pilot — the *exact same*
request succeeded immediately once a descriptive UA (`Oryn-ImageAcquisition/1.0 (https://
oryn.app; <OPENALEX_CONTACT_EMAIL if set>) node`) was added. See
https://meta.wikimedia.org/wiki/User-Agent_policy. Now applied to every request the script
makes.

**A real spine data gap fixed in passing:** MIT's `universities` row (the canonical one,
`03167d0c-...`) had a `website_url` but no linked Wikidata id at all, despite MIT's
well-known Wikidata item (Q49108, confirmed via its own P18 claim — the MIT Dome, GPS
42.359083,-71.091667, matches MIT's real campus) plainly existing. Added one
`entity_external_ids` row (`id_system='WIKIDATA', external_id='Q49108'`,
`verification_state='source_verified'`) rather than special-casing an image override — fixes
MIT for any future Wikidata-dependent enrichment, not just this one.

**Pilot — all 16 of the founder's named flagships, done and verified live in-browser
2026-08-18:** MIT, Stanford, Harvard, Oxford, Cambridge, Imperial, UCL, LSE, ETH Zurich,
EPFL, Toronto, UBC, Sydney, TUM, NUS, Tokyo — **16/16 real campus images, 11/16 also got a
real logo.** Two required a hand-picked Commons override after automated tiers were
inspected and rejected (Oxford: its only P18 image is a 15050×5051 panorama, aspect 2.98,
over this pipeline's landscape ceiling, and ox.ac.uk publishes no og:image at all; Cambridge:
P18 is portrait, cam.ac.uk's og:image is only 590×288) — both are genuinely collegiate,
city-spread universities with no one obvious "campus building" photo, not a pipeline defect;
documented inline in `MANUAL_IMAGE_OVERRIDES` with the specific rejection reason for each.
Verified live in this session's browser (DOM/network inspection — see the note below on why
not literal screenshots): correct `<img>`/`next/image` natural dimensions on both the card
(e.g. Oxford 360×238 in a `sizes="(min-width:1024px) 360px,..."` slot) and the detail hero
(640×424 desktop, correctly reflowing to the mobile `aspect-[21/9]` at 375px), `object-fit:
cover` + `overflow:hidden` on both, the attribution/license caption rendering under the hero
("John Fielding · CC BY 2.0 · Source ↗"), zero broken-image icons, and a non-pilot country
(Turkey, 12 universities) correctly falling through to the plain icon with no crash. This
session's Browser-pane screenshot capture itself returned a blank white image on every
attempt regardless of tab/scroll/resize (page text extraction, network logs, and
`naturalWidth`/`naturalHeight` DOM inspection all worked fine throughout) — a tooling
artifact of this session, not a rendering bug in the app; a future session with working
screenshot capture should still do a quick pixel-level pass.

**Card research-topic cleanup, bundled into the same pass per the founder's spec:** raw
OpenAlex phrases ("Particle physics theoretical and experimental studies") no longer render
on cards. New `lib/universities/research-taxonomy.ts` (pure keyword-matched categorizer, 12
short buckets: Physics/Biology/Computer Science/AI/Economics/Engineering/Medicine/
Mathematics/Social Sciences/Business/Law/Arts & Humanities — deliberately rule-based, not an
AI call, for the same "don't block on Anthropic" reason the image pipeline avoided AI
vision) maps and de-dupes up to 3 short category chips for the card; a topic matching nothing
is dropped, never forced into a wrong bucket. The detail page's "Research strengths" section
is untouched — still the full, uncapped, raw OpenAlex list, which is the right level of
detail once a student has actually clicked in. Only `app/(app)/universities/page.tsx`'s
card-feeding logic changed; `UniversityCard`'s own rendering code didn't need to.

**Scaled to the full spine, 2026-08-18 — final coverage 708/1019 (69.5%) real campus images.**
Three `--apply` passes total (the pilot, then two full-scale runs), `primary_image_status`
breakdown: `wikimedia_verified` 522, `official` 184, `verified` 2 (the two hand-overridden
pilot cases, Oxford/Cambridge), `needs_review` 183, no status row at all (never found any
candidate) 128. Logos populated for 337/1019. Verified live in-browser post-scale (Peking
University, a first-full-scale-run addition, not a pilot one) — real bytes served
(`image/jpeg`, 59.6KB at the card's 750w variant), confirming the pipeline works correctly at
scale, not just for the 16 hand-checked flagships.

**A real bug found and fixed mid-scale, worth remembering for any future Wikimedia work:**
the first full-scale run (1010 universities) landed only 280 real images with a huge
`needs_review` bucket (562) dominated by "download failed or exceeded the size cap" — the
User-Agent fix from the pilot section above stops Wikimedia's 429 for an ISOLATED request, but
not under this script's sustained request volume; direct spot-check re-confirmed the exact
same candidate URL still 429'd after ~20 minutes of acquisition traffic, with Wikimedia's own
error text pointing at request rate ("too many requests... a less disruptive approach"). Fixed
with a single shared minimum-gap timer across every Wikimedia-host request in the process
(`throttleWikimediaHosts`, global not per-worker, so 5-way concurrency can't multiply the
effective rate) — 300ms recovered another 95 images with still-heavy "download failed" noise;
700ms recovered 317 more with that failure mode essentially gone from the tail, confirming
request rate (not bad data, not file size) was the real cause throughout. Also hardened
`downloadBuffer` to reject non-`image/*` content-types before handing bytes to sharp — a
handful of official-site `og:image` URLs turned out to be broken links answering 200 with an
HTML error page instead of a real 404, which sharp then threw trying to decode.

**Known limitations, stated plainly:** the remaining 183 `needs_review` + 128 no-candidate
(311/1019, ~30%) is a mix of: genuinely low-quality Wikidata P18 images (wrong aspect, too
small — the pipeline correctly rejects these rather than publishing a bad crop), universities
with no Wikidata QID and no usable `og:image` either, and a residual few that may still be
rate-limit-affected even at 700ms (worth one more `--apply` re-run in a future session before
assuming they're all genuine gaps — the script is idempotent and safe to re-run any time). No
AI-vision identity/quality check anywhere in this pipeline (deliberate, per the founder's own
"don't require it" instruction) — a Wikidata P18 claim is trusted once the QID itself is
already spine-verified, which is usually right but not infallible (a mis-tagged Commons file,
a crest mistaken for a building) at full scale; worth a periodic spot-check, not a blocker.
Official-site `og:image` discovery (Tier 3) remains noticeably less automatable than Wikidata/
Commons (Tier 2) for universities with no QID at all — expect that minority to need more
manual-override attention than this pass gave them.

**Files:** `lib/acquisition/wikimedia.ts`, `opengraph.ts`, `image-validation.ts`,
`image-storage.ts`, `source-authority.ts`'s `"image"` fact class,
`scripts/acquire-university-images.ts` (`npm run acquire:university-images -- [--pilot]
[--only <substring>] [--limit N] [--apply] [--force]`), `lib/universities/research-taxonomy.ts`,
`features/universities/detail-hero-image.tsx`. Tests: `__tests__/acquisition/{wikimedia,
opengraph,image-validation,image-storage}.test.ts`, `__tests__/universities/
research-taxonomy.test.ts`, extended `source-authority.test.ts`. Full gate green
(lint/tsc/801 tests/build) before and after the pilot `--apply`.

**Pushed further, same day — founder asked explicitly for 1019/1019 display-safe with real vs.
fallback coverage never conflated (P0A–P0T of a follow-up spec).** Two real fixes plus one more
`--apply` pass landed this round:

1. **Official-site sub-page discovery** — a homepage with no `og:image` at all (a real case:
   `web.mit.edu` has none) now tries `/about`, `/about-us`, `/campus`, `/visit`, `/gallery`,
   `/media`, `/newsroom`, `/press` in order, stopping at the first hit, before falling through.
   Same downstream validation applies regardless of which page it came from.
2. **A real crash found and fixed**: hitting dozens of arbitrary official-site hosts (not just
   Wikidata/Commons's well-behaved endpoints) means some server somewhere sends a malformed
   response — one did, and it crashed a ~900-university run partway through with a raw
   Node/undici socket-teardown assertion (`Parser.finish`/`TLSSocket.onHttpSocketEnd`), a
   failure mode below the fetch Promise itself that no per-call `try/catch` in this codebase
   could see. Fixed with process-level `uncaughtException`/`unhandledRejection` handlers that
   log and continue — verified safe specifically because writes are already incremental
   per-university and nothing here is shared mutable state a corrupted socket could poison (10
   such events logged-and-survived on the next full run, which then completed cleanly).
3. `lib/acquisition/image-storage.ts` generalized to take a bucket name and entity id as plain
   parameters (`ensureImageBucket`/`uploadEntityImage`) instead of hardcoding "university" —
   ready for a future opportunities/programme image pipeline to reuse directly. No schema
   change, no bucket created for anyone but universities yet.

**Final numbers (`npm run report:university-images`, new script — also generalizes the
reporting split the founder asked for: display-safe vs. real-verified are two different
questions, never collapsed into one):**
```
Total live universities: 1010
DISPLAY-SAFE:  1010/1010  (real 721, official-logo fallback 98, ORYN-icon fallback 191, broken 0)
PIPELINE:      real verified 721/1010 (71.4%), needs_review 180, no_candidate 109
needs_review reasons: too_small 106, portrait_or_near_square 52, extreme_panorama 13,
  download_failed_or_inaccessible 9
```
(1010, not 1019 — `getSupersededUniversityIds()` correctly excludes the 9 known duplicate-loser
rows from this count; the raw `universities` table still has 1019 physical rows.) Verified live
in-browser post-pass: a `needs_review` case (Fudan University — correctly renders the ORYN icon,
no broken image, no logo either) and a logo-fallback case (Bocconi University — correctly
renders its real logo, no campus photo yet) via DOM/network inspection (this session's screenshot
capture tool is unreliable when attached to an externally-run dev server — see the pilot
section above; `naturalWidth`/`naturalHeight`/network-200 checks are the actual evidence).

Display-safe was already 100% before this pass too — the card/detail fallback chain guarantees
it structurally, not by measurement — what moved is the real-verified share (69.5% → 71.4%) and,
more importantly, the *honesty* of the needs_review bucket: before the throttle fix (see the
scale section above) it was dominated by transient "download failed" noise; now it's
overwhelmingly genuine quality rejections (portrait/too-small/panorama Wikidata images this
pipeline correctly refuses to publish rather than crop badly). Diminishing returns confirmed
directly — a fourth `--apply` pass after the sub-page-discovery + crash fix added only 5 more
real images (716→721) vs. +317 on the pass that fixed the actual rate-limit bug — the founder's
"don't block on 1019 perfect sources" instruction is the right read of where this pipeline
now sits: safe to leave, safe to re-run again anytime for marginal gains, not worth chasing
further in this session.

**Explicitly NOT done, and why — read before touching `opportunities`:** the same follow-up
spec (P0E onward) asked for this image architecture to generalize across every ORYN discovery
entity — programmes, summer schools, competitions, scholarships, fellowships, internships,
providers — via a shared media model. Investigated (full report in-session, not filed as its
own doc): `opportunities` is a real, populated table (**52 live rows at investigation time,
growing in real time** — a session on `origin/oryn/programs-opportunities-intel` pushed a new
scholarship-category commit *during* this investigation), with its own `opportunity_category`
enum, its own canonical-entity linkage (`organization_entity_id`), and **zero image/media
columns anywhere** — confirmed via full migration grep. This branch's own header above already
states the boundary: `opportunities`/`opportunity_sources` are **not** in scope here, owned by
that parallel workstream. A migration-numbering collision between these two branches already
happened once (`0043`, resolved by renumbering). Building a new `entity_media` table or writing
opportunity image data myself right now would risk a second collision against a table someone
else is actively writing to, live, in the same database this session shares. What *is* safe and
done: the storage/adapter layer (`image-storage.ts`, `wikimedia.ts`, `opengraph.ts`,
`image-validation.ts`) is already entity-agnostic — the opportunities pipeline can import these
directly, unchanged, whenever that workstream is ready to pick up media. The architecture
choice it still needs to make (documented for whoever does it): clone the
`university_profile_metrics` EAV-rows-per-image pattern into an `opportunity_profile_metrics`
table, or build one genuine polymorphic table keyed on `canonical_entities.id` (which both
`opportunities.organization_entity_id` and `universities.canonical_entity_id` could share) —
nothing in the current schema forces either choice.

**Files added this round:** `lib/universities/image-coverage.ts` (pure `displayTierOf`/
`categorizeRejection` classification, unit tested — `__tests__/universities/
image-coverage.test.ts`), `scripts/university-image-coverage-report.ts` (`npm run
report:university-images`, `--list-needs-review` for per-university detail). Full gate green
(lint/tsc/821 tests/build) after every change in this round.

**Out-of-lane side quest, founder-directed mid-session, worth flagging explicitly since it
touches `opportunities`:** asked directly (not via the image spec) to add ~300 more programs.
Rather than fresh research, applied the 273-record corpus that had been sitting in
`supabase/seed_drive_batch1.sql` since 2026-08-15 (real, sourced, never fabricated —
title/description/category/official_url/source/confidence/status per record) and was never
live only because `SUPABASE_SECRET_KEY` was a placeholder at generation time — no longer true.
`scripts/import-opportunity-corpus.ts` (`npm run import:opportunity-corpus -- --apply`) parses
the seed file's SQL tuples directly (a small quote-aware parser — see the file for why a plain
comma-split doesn't work on this data), dedupes against `opportunities` using
`lib/opportunities/dedup.ts`'s own logic plus a title-similarity fallback (these rows carry no
`organization` value to combine with), and **re-checks the live table for a title collision
immediately before every single write** — `opportunities` was 52 rows at this handoff's earlier
investigation, 69 by the time this script ran minutes later, confirming the parallel
`programs-opportunities-intel` workstream was genuinely writing to the same table concurrently.
Result: **221/221 written, 0 failures**, live count 69 → **290**. Verified live: `/opportunities`
picked the new rows up automatically through the existing matching pipeline (no code change
needed there), real programs showing real "Strong match" reasoning (Breakthrough Junior
Challenge, Boston University Summer Term, İTÜ Lise Yaz Okulu, etc.). Still no image/media
column on `opportunities` — that gap (and the schema-choice question) is exactly as described
above, unchanged by this import. Pure DML, no migration, no schema touched.

## 2026-08-20: branch reconciliation, programme-catalog pipeline wired, admissions_url batch (24 top-ranked universities)

Session start: `oryn/programs-pipeline-reconciled` was ~50 commits behind `origin/main`
(missing the 2026-08-19 Counselor Core merge, two QS-ranking bugfixes, and a rescued
programme-catalogue pipeline) but carried 4 unmerged commits of its own. Reconciled per
`docs/MASTER-EXECUTION-STRATEGY.md` (reset same day, confirms this branch as the ongoing
Computer A data lane): merged `origin/main` cleanly (git auto-detected the stale-numbered
`0043_university_programs_enrichment.sql` as a rename to main's renumbered `0044`, no
conflict), found and fixed a pre-existing eslint bug in the process (`.next/**` ignore
didn't reach `.claude/worktrees/**`'s own build output, producing 50k false positives),
full gate green after — commits `9e3d338`, `ec84e28`.

**Wave 1 groups C/D/F applied** (`a3a7564`): re-fetched live `opportunities` (290 rows)
immediately before dedup, per this doc's own established practice — caught all 7 of group
C and 2 of group D as duplicates of the 2026-08-18 bulk import. 11 net-new rows.
`opportunities`: 290 → 301.

**Programme-catalogue pipeline wired** (`bf59310`): `lib/acquisition/programs.ts` +
`scripts/acquire-programs.ts` (rescued, previously uncommitted-elsewhere, landed on `main`
via the integration merge but never wired) got an `acquire:programs` package.json script
and a JSONL-emission adapter so its deterministic extraction output flows through the
existing, tested `npm run ingest:university-programs -- <path> --apply` path instead of
becoming a second write path. Live-verifying it against TU Delft and Trinity College
Dublin's real catalogue pages surfaced two real correctness bugs (fixed): a standalone
"Diploma" (TCD's "Diploma in Acting and Theatre") was being asserted as bachelor's-level
purely from page context, since `NON_BACHELOR_TOKENS` only excluded "Graduate Diploma";
and TCD's rule matched two non-programme nav pages ("Your Trinity Pathways", "Your Trinity
education") that happened to satisfy the URL pattern. Also found and fixed a real dedup
gap in `lib/programs/ingest.ts`'s `decideIngestion()`: it deduped by normalized name only,
so TU Delft's existing "Computer Science and Engineering" row and the catalogue's current
link text "Computer Science & Engineering - English" — same `official_program_url`, same
real programme — would have inserted as two rows. Added `programUrlKey()`-based dedup
(checked alongside the existing name key), a regression test using this exact case, and
updated `scripts/ingest-university-programs.ts` to populate both key types. 995/995 tests
(994 + 1 new), lint/typecheck/build clean.

Applied live via the real `decideIngestion()` logic (run against MCP-sourced university
data, since this environment has no local `SUPABASE_SECRET_KEY`): 133 extracted, 130
accepted / 3 duplicate (all 3 correctly caught by the new URL-based dedup — Delft's
Aerospace Engineering, Computer Science & Engineering, and Earth/Climate/Technology all
already existed under different display text). `university_programs`: 198 → 328 (Delft
4→15, Trinity College Dublin 0→119). Full `program_research_queue` audit trail written.
Committed as a follow-up once verified — see git log for the exact commit completing this
(a background session finished the chunked application + JSONL commit after this note was
written; check `git log -- data/research/university-programs/` for the exact SHA if it
matters later).

**Admissions URL batch — 24 top-QS-ranked universities missing `admissions_url`**: live
audit (`university_profile_metrics`, `universities` columns) showed 407/1019 (40%) had
`admissions_url`, with a long tail of top-60 QS-ranked institutions missing it entirely.
Selected the 25 highest-ranked misses; each URL verified by direct `WebFetch` of that
university's own domain (not guessed from a pattern) — Oxford, Cambridge, Caltech, UCL,
NTU Singapore, UPenn, Yale, CUHK, UNSW, UC Berkeley, EPFL, U Chicago, ANU, U Toronto, PSL,
Yonsei, UBC, UCLA, Michigan, CityU HK, Korea University, NTU Taiwan, Universiti Malaya,
Bristol — 24 written. **Zhejiang University skipped, not guessed**: its undergraduate
admissions process is genuinely fragmented across campus/institute (International Campus,
International College, ZIBS each have their own separate international-admissions page,
no single institution-wide undergraduate admissions URL found) — per this repo's
conflicting-source rule, left `admissions_url` null rather than picking one arbitrarily.
Two borderline picks used each institution's *international* applicants page rather than
a domestic-only one (ANU, National Taiwan University) since that's the more relevant
front door for ORYN's stated international-student audience — noted here in case a future
pass wants the domestic page instead. Every row also got a `university_sources` entry
(source_url, retrieved_at, confidence, raw_excerpt) — that table was previously very
sparse (29 rows for 1019 universities). `admissions_url`: 407 → 431. Applied via Supabase
MCP `execute_sql` (no local `SUPABASE_SECRET_KEY` in this environment); not yet run through
`npm run check:integrations` in this session — see that command's own output earlier this
session for the full current external-service status (Anthropic/Tavily/College Scorecard
all unconfigured locally, Supabase MCP and OpenAlex both working).

**Live coverage snapshot after this session's changes** (re-measured, not carried over from
an earlier doc): `universities` 1019, `admissions_url` 431/1019 (42.3%), `application_system`
77/1019 (7.6%, untouched this session — next candidate), `total_students` 383/1019 (37.6%),
`tuition_domestic_annual` 157/1019, `tuition_international_annual` 135/1019,
`primary_image_url` 721/1019 (70.8%), `university_programs` 328 rows. Program-catalogue
coverage remains the starkest gap: entire large markets (China 64 universities, India 37,
Australia 37, South Korea 31, Spain 29, Canada 27, Malaysia 25, Japan 22, Russia 21, Saudi
Arabia 18, Taiwan 16) have **zero** `university_programs` rows — highest-leverage next
target for that specific campaign.

**Admissions URL batch 2 — next 29 ranked universities (same session, continuing the
campaign)**: NYU, Amsterdam, Birmingham, UT Austin, UIUC, Paris-Saclay, Leeds, Glasgow,
UC San Diego, Universidad de Buenos Aires, Heidelberg, Uppsala, Copenhagen, U Washington,
U Alberta, Nottingham, FU Berlin, U Zurich, UCD, POSTECH, King Saud, KIT, Southampton,
Waterloo, Utrecht, St Andrews, IIT Delhi, Leiden, Pontificia Universidad Católica de
Chile — same rigor, each URL confirmed by direct fetch of that university's own domain.
Two fetches that came back as unverified guesses ("would likely be at...") were rejected
and re-verified via a second, real search+fetch pass rather than accepted on a first weak
answer (Birmingham, NYU). `admissions_url`: 431 → 460/1019 (45.1%). `university_sources`
provenance rows added for all 29.

**Admissions URL batch 3 — next 29 ranked universities**: Helsinki, Bath, Macquarie,
Universiti Sains Malaysia, Universiti Kebangsaan Malaysia, Oslo, Wisconsin-Madison, USP,
IIT Bombay, USTC, Exeter, UC Davis, Universiti Putra Malaysia, Liverpool, Vienna, NTHU
Taiwan, Western University, UNAM, Newcastle, Basel, USC, Wageningen, Groningen, TU Berlin,
Universiti Teknologi Malaysia, UNC Chapel Hill, York, WashU St Louis, Universitat de
Barcelona — same rigor. `admissions_url`: 460 → 489/1019 (48.0%), 82 universities total
across the three batches this session.

**Opportunities data-quality sweep (evidence-based, not fuzzy-matched)**: while cross-
checking Wave 1 group B candidates against the live table, spotted and verified three
junk/duplicate `opportunities` rows and removed them (0 `opportunity_matches`/
`saved_opportunities` referenced any of them, confirmed before deleting): "Breathrough
Challenge" (typo'd title, `unverified`, same `breakthroughjuniorchallenge.org` domain and
underlying competition as the properly-researched, `verified_current` "Breakthrough
Junior Challenge" — a raw-scrape duplicate, not a genuinely different opportunity);
"Young Investors Society" (title/description was literally just the organization's own
homepage URL restated — not a specific opportunity at all, and the real programme,
"YIS Stock Pitch Competition", already exists as a proper `verified_current` record);
"Immerse Education Competitions" (a hub/directory page whose own scraped description
is explicitly about "The Immerse Education Essay Competition 2026" — the same essay
competition already captured separately and correctly as "Immerse Education Essay
Competition"). Left one lower-confidence case alone rather than merging on assumption:
"iGEM High School Competition" vs "International Genetically Engineered Machine
Competition (iGEM)" have genuinely different official URLs (a HS-specific track page vs.
the general competition page) and could legitimately be parent/child rather than
duplicates — flagged here for a future pass with deeper verification, not auto-merged.
`opportunities`: 304 → 301 after the 3 deletions (net of the +3 from group B below).

**Wave 1 group B applied**: of the 5 records this session's research agent wrote to
`data/research/opportunities/wave1_2026-08-18_groupB.jsonl`, live-refetch-before-dedup
caught 2 as duplicates of the 2026-08-18 bulk import (AwesomeMath, BU RISE — matched by
`official_url`). 3 net-new: Rutgers Young Scholars Program in Discrete Mathematics,
Carnegie Mellon SAMS, Secondary Student Training Program (SSTP, University of Iowa).

**Admissions URL batch 4 — next 23 ranked universities**: Wuhan, Geneva, IIT Madras, UC
Santa Barbara, NYCU, Queen's Kingston, Cape Town, TU Dresden, Al-Farabi Kazakh National,
Wollongong, UCLouvain, Reading, Otago, Complutense Madrid, Waseda, Tel Aviv, Gadjah Mada,
Hamad Bin Khalifa, FAU Erlangen-Nürnberg, King Abdulaziz, IIT Kharagpur, Hebrew University
of Jerusalem, UCC — same rigor (IISc Bangalore dropped after repeated TLS/cert failures
rather than guessed). `admissions_url`: 489 → 512/1019 (50.2%) — crossed the halfway mark,
110 universities total across four batches this session.

**Parallel background campaigns launched this session** (per the founder's explicit
parallel-capacity directive): competitions dataset expansion landed clean (52 → 63,
commit `0222441`); student-count coverage landed clean (383 → 403 universities, commit
`7b2a548`); research/internship/scholarship opportunities still in progress as of this
note; the programme-catalogue batch 2 agent stalled once (10 min no-progress), was
resumed (found and fixed a real bug along the way — Waterloo's rule matched
"Bachelor of Arts"/"Bachelor of Science" as if they were named programmes, when the
official pages are purely descriptive hub pages with no "apply to X" language — contrast
kept deliberately against genuine admission-plan pages like "Physical Sciences", whose
own page says "Apply to Physical Sciences and choose one of these eight majors"), and a
second agent is now finishing the remaining Waterloo chunks plus backfilling a genuine
Edinburgh audit-trail gap found along the way (95 applied rows, only 5 had a matching
`program_research_queue` entry). Still uncommitted as of this note: the Waterloo
bachelor-of-arts/bachelor-of-science exclude fix in `scripts/acquire-programs.ts` — do
not edit that file until the finishing agent commits it.

**Admissions URL batch 5 — next 17 ranked universities**: Universidad de Chile, VU
Amsterdam, Harbin Institute of Technology, University of Bern, IIT Kanpur, American
University of Beirut, University of Twente, University of Gothenburg, Universidad
Autónoma de Madrid, University of Florida, University of Ottawa, University of
Strathclyde, University of Lausanne, ENS de Lyon, University of Lisbon, QUT, Victoria
University of Wellington — same rigor (IISc Bangalore and National Cheng Kung University
dropped after repeated fetch failures / insufficient evidence rather than guessed).
One incidental finding: ENS de Lyon's stored `website_url` (`ens-lyon.eu`) appears to be
wrong/outdated — the real official domain confirmed via search is `ens-lyon.fr`; the
admissions_url written here uses the correct domain, but the `website_url` field itself
was not corrected (out of scope for this campaign) — worth a future fix.
`admissions_url`: 512 → 529/1019 (51.9%), 122 universities total across five batches
this session.

**Admissions URL batch 6 — next 17 ranked universities**: Albert-Ludwigs-Universität
Freiburg, Université Paris 1 Panthéon-Sorbonne, University of Surrey, Université libre
de Bruxelles, University of Calgary, TU Darmstadt, University of Rochester, UC Irvine,
University of Maryland College Park, University of Minnesota Twin Cities, University of
Porto, University of Canterbury, UMass Amherst, Universiti Teknologi PETRONAS, University
of Göttingen, Universitat Pompeu Fabra, Vanderbilt University — same rigor. `admissions_url`:
529 → 546/1019 (53.6%), 139 universities total across six batches this session — over
half the corpus now has a verified admissions URL.

**All background campaigns from this session's parallel-capacity dispatch are now
complete and pushed**: competitions (`0222441`), student-counts (`7b2a548`), research/
internship/scholarship (`4720b40`), and Waterloo application + Edinburgh audit-trail
backfill (`d8ed48e` — Waterloo: 105 rows, 0 accidental duplicates confirmed; Edinburgh:
90 missing audit-trail rows backfilled honestly from live data with an explicit
reconstruction caveat, not fabricated as if they were the original research payloads).
The `scripts/acquire-programs.ts` bachelor-of-arts/bachelor-of-science exclude fix (see
above) is committed in this same checkpoint, since the finishing agent correctly left it
for whoever actually owned it rather than guessing.

**Migration 0043 data backfill — finished the one blocker Claude B flagged this
session**: the `duplicate_status`/`superseded_by_id` DDL has been live since 2026-08-19
evening (confirmed independently this session — DDL access clearly exists now, contrary
to the "blocked" narrative in `docs/founder-blocked-backlog.md`), but the actual data
backfill for the 9 known duplicate pairs had never run — all 9 loser rows still showed
`duplicate_status='canonical'`. This was not a fresh identity decision: the 9 pairs were
already ROR-verified and merged at the `canonical_entities` layer in an earlier session
(`docs/handoffs/claude-a-university-spine.md`'s own 2026-08-17/18 entries), and
`lib/universities/duplicate-supersessions.json` already encodes exactly this winner/loser
mapping as the existing application-layer suppression source of truth — this backfill
just applies that already-made decision at the schema level, per migration 0043's own
stated purpose. Ran 9 `UPDATE` statements (KFUPM, HKUST, University of Newcastle
Australia, Al-Farabi Kazakh National University, University of Warwick, MIT, LSE, UCL,
University of Technology Sydney), verified live: all 9 loser rows now show
`duplicate_status='superseded'` with the correct `superseded_by_id`, matching the JSON
file exactly. The JSON-file application-layer suppression (`lib/universities/canonical.ts`)
still works and was left untouched — this backfill makes the schema state consistent with
what the app was already enforcing, it doesn't require an app-code change to take effect
safely. `docs/founder-blocked-backlog.md` item about migration 0043 can now be marked
resolved by whoever owns that file next.

**Wave 1 group H applied** (summer programs — Europe/Turkey/international): of 8
candidates dispatched, 7 came back researched (Central European University Summer School
returned no record — presumed dropped by the researcher as unverifiable, consistent with
this campaign's no-forced-candidates rule; no CEU record exists in the group H JSONL to
investigate further). Live dedup re-check against `opportunities` before any write (per
this session's standing practice) surfaced two real findings, not simple net-adds:
- **Koç University** ("Summer Academy") — an existing row ("Koç Uni Yaz Okulu") already
  covered this program, but as a stale, minimal 2023-dated capture (URL
  `highschoolprograms.ku.edu.tr/2023-lise-yaz-okulu/...`, no organization/cost/dates,
  `verification_state='unverified'`, description was literally just the URL). Same
  real-world Koç HS summer program, not a distinct offering. Per this session's
  accuracy-and-freshness-over-blind-volume standard, this was **updated in place** with
  the freshly verified 2026 data (current URL, fees, dates, requirements,
  `verification_state='verified_current'`) rather than left stale or duplicated — a new
  `opportunity_sources` provenance row was added alongside. The separate "Koç University
  Research Program KUSRP" row was confirmed genuinely different (a research program, not
  the Summer Academy) and left untouched.
- **Boğaziçi University BOUN101** — skipped entirely, no insert. Two existing rows already
  cover it: one shares the exact same `official_url` as the new candidate
  (`buyem.bogazici.edu.tr/`), and the other (`.../course/boun101-lise-yaz-okulu`) carries
  a fuller 2025 course list (38 named courses) than this wave's own research could
  re-confirm, since the specific course page had already been taken down by the time of
  this research (the researcher correctly left cost/dates blank rather than reuse stale
  figures — see the JSONL record's own honest caveat). Inserting would have created a
  three-way duplicate with zero net new information. The separate winter-edition row
  (`boun101-online-kis-okulu`) is a genuinely distinct seasonal offering and was left
  alone, as was "UWC Türkiye" (a different-scope national-committee page, not a duplicate
  of the new "UWC Short Courses" global directory entry).

5 net-new rows inserted with `opportunity_sources` provenance (Copenhagen Business School
Summer University, AI Summer Week @ ETH Zurich, Bilkent University Summer Camp, ODTÜ/METU
Engineering Summer School, UWC Short Courses) + 1 existing row refreshed (Koç). Live count
after group H: 335 total opportunities, 232 `summer_program`. Tracker updated:
`data/research/opportunities/SUMMER_PROGRAMS_350_TRACKER.md`.

This closes out Wave 1 (groups A–H) of the 350-target summer-program campaign: 227 → 232
`summer_program` rows added/refreshed through this wave's own adds net of duplicates, atop
the pre-existing base. Continuing per the standing long-run/parallel-capacity execution
mode — next up: Wave 2 candidate pool (queued in the tracker's own "Wave 2+" section) and/or
the sparser data packages (`application_system` at 77/1019, program catalogs for
zero-coverage countries) as background campaigns while foreground work continues.

**Admissions URL batch 7 — 24 next-tier (unranked-tail) universities**: Hyderabad, New
Brunswick, Hawaiʻi at Mānoa, Nebraska-Lincoln, Tartu, Frankfurt School of Finance &
Management, Paris Dauphine-PSL, Stavanger, St. Gallen, Delhi, ESSEC, UNEC (Azerbaijan
State University of Economics), IIUM, Kaohsiung Medical, NSYSU, National Taipei
University of Technology, NJIT, Taiwan Tech (NTUST), Delaware, Iowa, Kansas, UC Santa
Cruz, UMBC, Ghana — same domain-restricted-search-then-verify rigor as prior batches.
National Taiwan Normal University (NTNU) was queued but not reached this batch — genuinely
not researched, not dropped for cause. Two `application_system` values added under the
existing country-gated rule (Phase 4): Paris Dauphine → **Parcoursup** (France institution,
its own page names Parcoursup as the primary route for baccalauréat/EU/prior-French-study
applicants) and NJIT → **Common App** (US institution, its own page states NJIT is a Common
App member). Deliberately left `application_system` null for several candidates whose own
pages named a portal only as one of multiple valid routes (Nebraska-Lincoln, Iowa — both
"our own application OR Common App") or a system outside the tracked/known list (Delhi's
CUET, UC Santa Cruz's UC-systemwide application) — consistent with the DCU/SJTU lesson
that a mentioned system isn't automatically *the* system.
`admissions_url`: 546 → **570/1019 (55.9%)**, `application_system`: 77 → 79/1019.

**Admissions URL batch 8 — 12 more unranked-tail universities**: Adam Mickiewicz
University (Poznań), Ain Shams University (Cairo), Ankara Üniversitesi, Anna University,
Auckland University of Technology, Bar-Ilan University, Ben-Gurion University of the
Negev, Bina Nusantara University (BINUS), Brno University of Technology, Cairo
University, Beihang University, Canadian University Dubai — this tier of the corpus (no
QS rank, weaker web presence, several in non-English-primary domains) is genuinely harder
to verify than the ranked tier batches 1-7 worked through; stopped at 12 rather than
padding to a round 20-25, consistent with quality-over-count. `admissions_url`: 570 →
**582/1019 (57.1%)**.

**Admissions URL batch 9 — 12 more universities**: Dartmouth College (a real, notable
gap in the earlier ranked batches — its QS-rank join must have missed it, worth a future
look at why), University of Essex, Goethe-University Frankfurt, École Centrale de Lyon,
Free University of Bozen-Bolzano, Federal University of Minas Gerais (UFMG), El Colegio
de México, Hasselt University, Czech University of Life Sciences Prague, DGIST, GIST,
IIT BHU Varanasi. Four new `application_system` tags under the country-gated rule:
Dartmouth → Common App (US), Essex → UCAS (UK), Goethe Frankfurt → uni-assist (Germany,
its own page names uni-assist as the preliminary admissions service for non-German-Abitur
applicants), École Centrale de Lyon → Parcoursup (France, its BSc Data Science page names
Parcoursup directly). `admissions_url`: 582 → **594/1019 (58.3%)**, `application_system`:
79 → 83/1019.

**Wave 2 groups I/J applied (summer programs)**: background agent research (16
candidates from the tracker's queued pool) returned 7 verified programs; live dedup
check immediately before insert caught one the agent's own JSONL-only dedup pass
couldn't see — WPI Frontiers had an exact `official_url` match to an existing row from
the 2026-08-18 bulk import — so 6 net-new landed: WYSE (UIUC Grainger), Case Western
Reserve Online Pre-College Program, Wharton "Future of the Business World", Penn
Medicine Summer Program for HS Students, Idyllwild Arts Summer Program, Boston
University Tanglewood Institute. Full drop list (9, all with cause) in the tracker.
Live: 340 total, 235 `summer_program`.

**Admissions URL batch 10 — 12 more universities**: Kingston University London, Johannes
Kepler University Linz, Julius-Maximilians-Universität Würzburg, Justus-Liebig-University
Giessen, Karl-Franzens-Universität Graz, Leibniz University Hannover, Linköping
University, LUMS (Lahore University of Management Sciences), Kyung Hee University,
Manipal Academy of Higher Education, Martin-Luther-Universität Halle-Wittenberg, Jilin
University. 4 new `application_system` tags: Kingston → UCAS (UK), and three German
universities (Würzburg, Hannover, Halle-Wittenberg) → uni-assist, each confirmed by its
own page explicitly naming uni-assist's VPD (preliminary examination documentation) as
required for non-EU applicants. `admissions_url`: 594 → **606/1019 (59.5%)**,
`application_system`: 83 → 87/1019.

**Program catalogue batch 3 — Universiti Sains Malaysia (USM) and IE University, closing
out two more zero-coverage countries (Malaysia, Spain)**: background agent extended the
deterministic `extractPrograms()` pipeline with two real fixes to `lib/acquisition/
programs.ts` — an href entity-decoding bug (USM's Joomla links render `&amp;amp;` in
query strings, corrupting the `id` param) and a new opt-in `CatalogueRule.
disableDefaultExcludes` (USM's `/index.php` front-controller URLs were being rejected by
the pipeline's default `/index` exclude pattern) — both covered by new regression tests.
61/62 USM programmes extracted (1 legitimately dropped for exceeding the name-length cap)
and 15/15 IE University programmes extracted cleanly. Tried and dropped this batch (docs
in `scripts/acquire-programs.ts`'s own header): ANU, University of Navarra (programme
name lives in a sibling heading, not the anchor text), HSE University (Vue SPA), UKM,
KFUPM, Yonsei GOSC, Zhejiang ICZU, NTU, IIT Delhi, Prince Sultan, Effat (nav-only or
per-college, no unified index), UAM (client-rendered), Universitat de Barcelona (403),
Alfaisal (404). Live dedup re-check before applying caught 9 USM rows the agent had
already applied directly; the remaining 67 (52 USM + 15 IE) were run back through the
real `decideIngestion()` logic (not reimplemented by hand) via a throwaway script feeding
it the live university/existing-program lookup data, then inserted. `university_programs`:
523 → **599 rows**. One judgment call flagged for visibility, not resolved further: USM's
own undergraduate index lists "Doctor of Medicine (MD)" and "Doctor of Dental Surgery
(DDS)" as first-entry-from-school degrees alongside its other bachelor's programmes —
included under the same catalogue_section evidence as the existing MBBS/MBChB precedent.

**Non-US tuition/cost acquisition — Taiwan and UAE, 9 verified rows**: background agent
found real official per-institution fee pages for 3 Taiwan universities (National Taiwan
University, Chang Gung University, National Taipei University of Technology) and 3 UAE
universities (Khalifa University, Zayed University, United Arab Emirates University),
writing to `university_profile_metrics` (`tuition_domestic_annual`/`_international_annual`/
`_per_credit`, in each page's own stated currency — never converted or assumed USD) rather
than `university_statistics.cost_of_attendance`, correctly following this session's own
established precedent that column is IPEDS's US-specific all-in concept, not a fit for
tuition-only non-US figures. Investigated and ruled out (not attempted-and-abandoned) two
bulk-source candidates: Taiwan's MOE/data.gov.tw only publish national averages, no
per-institution dataset; the UAE's Commission for Academic Accreditation regulates
licensure only — tuition is fully institution-set, so there is structurally no government
rate to find. Real negative results recorded for 8 further institutions whose official
pages couldn't be fetched (403s, empty JS-rendered pages, PDF-gated), not guessed around.
New `scripts/acquire-university-statistics-tw.ts`/`-ae.ts`, following the established
per-country script pattern (skip-if-exists, never overwrite). Data verified live in the
database (agent had direct Supabase MCP access in its sandbox, same as this session).

**Competitions/research/internship/scholarship batch 2 — 12 net-new**: background agent
researched 16 candidates; live dedup check before insert caught 4 exact duplicates the
agent's file-only check couldn't see (Diamond Challenge, John Locke Institute Global Essay
Prize, Journal of Emerging Investigators, and "Rise" — all matched on `official_url`;
Boston University's separately-named "RISE (Research in Science and Engineering)" is a
genuinely different program and was correctly left alone, not merged). 12 net-new landed:
National Economics Challenge, Scholastic Art & Writing Awards, DECA Competitive Events,
Science Olympiad (Division C), FIRST Robotics Competition, EUCYS, UK Chemistry Olympiad,
HOSA Competitive Events, ARML, Nuffield Research Placements, Davidson Fellows Scholarship,
Türkiye Scholarships. Several records honestly leave fields null with an explicit note
rather than guess (Nuffield's STEM Learning application portal and Türkiye Scholarships'
stipend/deadline pages both returned access errors on every fetch attempt). Regeneron STS
was deliberately not pursued — the agent judged it overwhelmingly likely already covered
and prioritized avoiding a probable duplicate over hitting a count, the right call given
no live-DB access from its sandbox to check directly. `opportunities` by category:
competition 63→**72**, internship 7→**8**, scholarship 7→**9**.

**Admissions URL batch 11 — 12 more universities, crossing 60%**: Multimedia University
(Malaysia), Northumbria University, O.P. Jindal Global University (India), NUST Islamabad,
Pusan National University, Radboud University, National Technical University of Athens,
Prince Sattam Bin Abdulaziz University, Princess Nourah bint Abdulrahman University,
Pontificia Universidad Católica Argentina, PUC-Rio, Peter the Great St. Petersburg
Polytechnic University. 2 new `application_system` tags: Northumbria → UCAS (UK),
Radboud → Studielink (Netherlands, its own page names Studielink as the national
enrolment system). NTUA's own admissions info for international candidates points
off-domain to the Greek Ministry of Education's own announcements rather than an
NTUA-owned application page — recorded its Undergraduate Studies overview page instead,
the closest genuinely NTUA-owned page to admissions. `admissions_url`: 606 →
**618/1019 (60.6%)**, `application_system`: 87 → 89/1019.

**Program catalogue batch 4 — Nanyang Technological University, Singapore, 65 new
programmes**: background agent's worktree turned out to be several commits stale
(missing batch 2/3 entirely); confirmed via `git merge-base --is-ancestor` it was a
clean ancestor with no unique commits of its own, fast-forwarded it losslessly before
starting — a real instance of the worktree-staleness gotcha this campaign has hit
before, handled correctly rather than risking a lossy merge. NTU's catalogue
(`ntu.edu.sg/education/degree-programmes`) matched via URL-path evidence
(`/education/undergraduate-programme/`) since the link text itself carries no degree
token — the same technique already used for TU Delft and IE University. A real bug
caught mid-verification: the agent ran a full liveness check on all 66 extracted URLs
before writing anything and found one of NTU's own published catalogue links 404s live
(`bachelor-of-accountancy-with-minor-in-strategic-communication`) — excluded from
`university_programs`, recorded as `outcome='rejected'` with the 404 detail in
`program_research_queue` rather than silently dropped or force-inserted. This agent had
Supabase MCP access and used it correctly: pulled a live snapshot of
`universities`/`entity_aliases`/`entity_external_ids`/`university_programs`, ran the
real `extractPrograms()`/`decideIngestion()`/`programUrlKey()` logic against it (nothing
reimplemented), and wrote both the accepted rows and the `program_research_queue` audit
trail — the more complete provenance path this session's own batch 3 had to skip for
budget reasons. 16 other candidates tried and dropped this round, grouped by failure
class in `scripts/acquire-programs.ts`'s own header comment for future sessions: bot-
protected (McMaster, Alberta, Monash, NUS — rechecked at a fresh URL, still blocked),
JS-driven finders with no server-rendered links (UBC, Auckland, Adelaide), empty SPA
shell (Peking University), catalogue is a PDF/Excel attachment not HTML (Shanghai Jiao
Tong, Fudan), card-grid with no anchor tags (Seoul National University), department-
subdomain directory not degree names (IIT Bombay), nav-only (KAIST, Korea University),
genuinely broken 404/private-IP-redirect (University of Delhi). None of the originally-
targeted zero-coverage countries (China, India, Australia, Japan, Korea, Russia, Saudi
Arabia, Taiwan) actually resolved this round — every candidate failed cleanly for a
documented reason; Singapore (NTU) is what landed instead. `university_programs`:
599 → **664 rows**.

**Admissions URL batch 12 — 12 more universities**: Rochester Institute of Technology,
Stony Brook University, Ruhr-Universität Bochum, TU Braunschweig, TU Bergakademie
Freiberg, Sofia University "St. Kliment Ohridski", Taipei Medical University, Symbiosis
International, SUSTech, South China University of Technology, Saint Joseph University of
Beirut, Taras Shevchenko National University of Kyiv. 1 new `application_system` tag:
TU Bergakademie Freiberg → uni-assist (Germany, explicit — "applicants have to apply...
via uni-assist"). RIT and Stony Brook both name Common App as one of two valid routes
(RIT: "Common Application or RIT Application"; Stony Brook: "SUNY Application and the
Common Application") — left `application_system` null for both, consistent with the
established caution that a mentioned system isn't automatically *the* system unless a
university's page names it as the sole or clearly primary route.
`admissions_url`: 618 → **630/1019 (61.8%)**, `application_system`: 89 → 90/1019.

**Wave 3 summer programs applied — 17 net-new**: background agent research (28 UK/Europe
+ US STEM candidates from the tracker's remaining queue) returned 20 verified; live
dedup check before insert caught 3 exact `official_url` duplicates the agent's file-only
dedup pass couldn't see (Durham Global Futures, TECHCAMP @ Politecnico di Milano, Warwick
Pre-University — all already live from earlier waves/imports). 17 net-new landed: St
Andrews, KCL, Bath "Step into Bath", Sorbonne, FU Berlin SommerUNI, Istanbul Bilgi HS
Summer School, Terp Young Scholars, Aggie STEM, CU Boulder PCDP, CO School of Mines,
NHSI Cherubs, Boys State, Vanderbilt PTY, WashU CPP, UVA Emerging Engineers, ASU Barrett
Summer Scholars, UT Austin WiSTEM. Full 8-item drop list (all with cause) in the
tracker. Notable research discipline: the agent caught a hallucinated WebSearch claim
that Istanbul Bilgi University had been "closed by decree," checked it directly against
the university's own homepage, found it false, and disclaimed it explicitly in that
record rather than trusting the AI summary. Live: 369 total, 252 `summer_program`.

## Night-research session, 2026-08-21 — program catalogue batch 5 + a live shared-checkout collision found and fixed

**Mandate for this session**: an "ORYN NIGHT RESEARCH" brief (university/program intelligence,
research-only, explicit "do not write directly to production Supabase" / "do not ingest
production" constraints — stricter than this doc's own earlier sessions, which wrote straight to
the live DB via Supabase MCP when it was available). Treated as continuing this exact DATA-A
lane (same branch), just file-output-only for this stretch rather than apply-to-live. No
Tavily/Anthropic/Supabase-secret-key credentials in this sandbox either (`check:integrations`:
all three "Missing credential", only anon-key Supabase + OpenAlex OK) — research done via
`WebSearch`/`WebFetch`/the Claude Browser pane, matching this doc's own established pattern for
credential-less sessions.

**Live coverage re-measured (read-only, via Supabase MCP `execute_sql` against
`qtcvcflzxbuagvvwahhu`) before picking a target, specifically to avoid re-researching ground
already covered**: `universities` 1019 rows; by country, `university_programs` coverage is
strikingly low exactly where ORYN's population is largest — **United States 131 universities /
only 9 with any programs**, **United Kingdom 79 / only 8**. Every other populous country (China
64/0, India 37/0, Australia 37/0, South Korea 31/0, Japan 22/0, Russia 21/0) is at or near zero
too, but those are the same countries the programme-catalogue batch 4 note above already
documented as bot-protected/JS-broken/PDF-only dead ends for a fetch-based approach — re-attempting
them blind was exactly what that note warned against. US/UK majors pages are comparatively
fetch-friendly (English, mostly server-rendered or renderable via the Browser pane) and are
ORYN's largest actual target market, so this session prioritized the highest-QS-ranked, zero-
program US/UK universities instead: a real, previously-undocumented high-leverage gap, not a
re-run of an already-explored dead end.

**Program catalogue batch 5 — Caltech, Cornell, Johns Hopkins, University of Chicago, 241
programs, all QS top-25 or top-100, all previously zero-coverage**:
`data/research/university-programs/independent_batch5_2026-08-21.jsonl`. Per-university method,
each fetched and read directly (not search-snippet-only):
- **Caltech** (26 majors): official Admissions majors/minors listing page, WebFetch asked
  specifically for anchor hrefs this time (first pass returned names only) — 24 of 26 majors
  resolved to their own individual page this way (e.g. `.../majors-minors/business-economics-
  and-management`, spot-verified live and real after a first cross-check against the wrong
  divisional sub-page wrongly suggested it might not exist). Explicit degree-type letters (BS)
  are NOT stated anywhere on the fetched page, so `degree_type` is left null rather than
  asserting the widely-known-but-unconfirmed-on-this-page fact that Caltech awards only the B.S.
- **Cornell** (81 majors): official Admissions majors listing page — WebFetch extracted a full
  name + college + individual-URL table directly in one pass, the highest-efficiency source of
  the batch.
- **Johns Hopkins** (74: 58 Krieger/Whiting + 16 Peabody): `e-catalogue.jhu.edu`'s interactive
  program explorer returned HTTP 403/empty to plain WebFetch (the exact "JS-driven, no server-
  rendered links" failure shape programme-catalogue batch 4 catalogued for other universities) —
  read successfully via the Claude Browser pane instead (real rendered session), full text
  extracted (106KB, saved and processed with a small Python filter rather than by hand) and
  narrowed programmatically to Bachelor's-level entries at Krieger/Whiting/Peabody only (JHU's
  explorer lists ~400 programs across 10 schools and every degree level unfiltered; graduate/
  certificate/other-school entries were excluded, not miscounted as majors). No stable individual
  program URL was captured from the explorer, so `official_program_url` = the catalogue page for
  every JHU record.
- **University of Chicago** (60 majors): `collegecatalog.uchicago.edu` (the registrar's own
  catalog domain) connection-reset on every attempt, plain WebFetch and Browser-pane navigation
  both — a real, distinct failure shape from the batch-4 list (not bot-protection, not JS, a
  transport-level failure on that specific host) worth recording so a future pass doesn't retry
  the same host blind. `collegeadmissions.uchicago.edu/academics/areas-study` (still uchicago.edu,
  still official_primary) has the same content and worked via the Browser pane. That page tags
  every program Major/Minor/Specialization/Joint/Interdisciplinary/Careers-in explicitly; only
  Major-tagged entries were kept — UChicago's own Biological Sciences sub-tracks (Cancer Biology,
  Immunology, etc.) and Middle Eastern Studies language specializations are real content on the
  page but are marked Specialization-only there, not independently declarable majors, so counting
  them as separate programs would have overstated the catalogue relative to UChicago's own
  classification.

Spot-checked before treating the batch as done (this doc's own established discipline): Cornell's
"Viticulture and Enology" (unusual-sounding, confirmed real and B.S.-conferring on its own page)
and Caltech's "Business, Economics, and Management" (first check hit the wrong divisional
sub-page and looked unconfirmed; a second, correctly-scoped search found the real page and
resolved it). Not run through `ingest:university-programs` even as a dry run — this sandbox has
no `SUPABASE_SECRET_KEY` either (confirmed: the script refuses to read or write anything without
it), so entity-name matching against `universities.name` was instead confirmed directly from the
same live read-only query above (all four `university_name` strings here are verbatim copies of
that query's own output, not retyped from memory).

### A live shared-working-directory collision, found and fixed this session

Not a git-history/branch-divergence collision (the kind [[project-oryn-parallel-sessions]] and
[[feedback-parallel-session-reconciliation]] already document) — a **literal shared filesystem
working directory**, live, mid-session. This session started in the main checkout (not a
worktree) on `oryn/programs-pipeline-reconciled` as instructed by its own git state, same as
apparently every other session's own starting assumption. Mid-session, a cross-session message
arrived from a `counseling-intelligence` session describing exactly this class of collision on
its own branch (two sessions both writing `docs/research/counseling-intelligence/*.md` in the
same directory, one overwriting the other's uncommitted work before either could commit — nothing
lost, both preserved in separate commits, but actively corrupting each other's in-progress files
going forward). Checking this session's own state in response found the main checkout's *current
branch had silently changed* to `oryn/counseling-intelligence-research` mid-session — some other
session had run `git checkout` in the same shared directory this session was about to commit
into. `git worktree list` at that point showed **eight** concurrent worktrees/checkouts across
this one repo (admissions-intelligence, counseling-intelligence-research ×2, integration-2026-08-
20, night-opportunities-research-2026-08-21, product-ux, programs-opportunities-intel, research-
turkey-schools) — a large coordinated multi-lane push, not an isolated incident, and this
session's own branch (`oryn/programs-pipeline-reconciled`) had no dedicated worktree of its own
yet, meaning it was the one still exposed to the shared main checkout.

Fixed the same way the peer session fixed its own version of this problem: `git worktree add
.claude/worktrees/programs-pipeline-night oryn/programs-pipeline-reconciled` (confirmed first via
`git worktree list` that this branch wasn't already checked out anywhere else), then moved this
session into it. No data was lost — the one file this session had generated before the branch
switch was untracked and copied out to the session scratchpad as a precaution before touching git
at all, then copied back into the new worktree. **How to apply, for any future session that lands
on this branch expecting the main checkout to be safe: check `git worktree list` before trusting
`git branch --show-current` in this repo right now — the main checkout is being actively
repurposed by whichever session doesn't yet have its own worktree, so "on branch X" at session
start is not a durable guarantee for the rest of the session.**
