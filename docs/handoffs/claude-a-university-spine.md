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

## Next (queued, not yet started)

**Active priority as of 2026-08-18, per explicit founder direction — supersedes the general
enrichment ordering below until it progresses meaningfully**: global tuition/cost-of-attendance
acquisition for the ~890 non-US universities still showing "Unavailable" (`university_statistics`
is 128/1019, US-only — see Phase 10's P0K numbers). Country order: **UK next**, then Canada,
Australia, Germany, Netherlands, France, Switzerland, Italy (web-accessible sources only, per
the Phase 3/"Next" note below that MUR/USTAT times out), Singapore, Hong Kong, then other
high-count countries — reorder for efficiency if a better bulk source turns up elsewhere, same
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
