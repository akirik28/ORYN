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
- Latest commit on this branch: `3397186`. This is a continuation session (session 2) picking
  up after the first session's own "session complete" checkpoint — see git log for the full
  first-session commit list; this session's own commits in order: strategic-expansion batch (9
  institutions from Claude B's missing-university handoff + the École Polytechnique/Institut
  Polytechnique de Paris identity ambiguity — see `docs/handoffs/claude-a-to-claude-b.md` for
  the full per-institution dossier), `eca81c8` (admissions apply-loop crash fix + `--apply-from`
  resume path), `694caa1` (US student-count enrichment via College Scorecard bulk file),
  `17a52c5` (ranking display added to the university detail page), `a24f368` (Phase 9 schema
  decision + Bocconi confirmed), `0e60f4b` (health gate extended to 9 checks), `3397186`
  (application_system taxonomy +8 systems).
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
- World map's "Asia · 0" region count — checked `lib/data/regions.ts` before assuming a bug: it
  derives strictly from `SUPPORTED_COUNTRIES`'s own curated `region` field, and only Europe has
  a drill-down projection built (the file's own header comment says so explicitly). Matches the
  product spec's own V1 geographic focus (US/UK/Europe/Turkey — Asia was never a named v1
  region) — confirmed intentional, not a gap, nothing to fix.
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

## Next (queued, not yet started)

1. Duplicate-id cross-registry check (see Phase 7 above) — a standalone query, not yet run.
2. Phase 11 — UI data-readiness audit, partially done: QS ranking display was missing from
   the university detail page entirely (only the Explorer card showed it) and is now fixed —
   see the ranking-display commit. Still not checked: whether `admissions_url`/
   `application_system` and the new undergraduate/postgraduate student counts render anywhere
   a student would actually see them, and whether the audit generalizes across world regions
   (only spot-checked via Bocconi/Italy so far, not a systematic multi-region pass).
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
   
   **India (33 missing), Italy (31), Spain (27) still queued, not started.** Same methodology
   (find the national statistics office's own bulk dataset, verify live, hand-map genuinely
   abbreviated/translated names, never guess) should generalize, but each country's own
   source needs the same live investigation Germany and the US each got — don't assume any of
   them publish institution-level data as cleanly as Destatis did. UK/HESA investigated and is
   a genuine dead end (Cloudflare-protected) — don't re-attempt it the same way.
6. Migration 0043 + the 5 read-path filters (see Phase 2 above) — founder/DDL-access blocked,
   not code-blocked.
7. ~~The ~200-row external-ID-unresolved bucket~~ — **current breakdown captured 2026-08-18**
   from the same full-spine re-run as item 3: 94 unresolved of 1019 (was ~203, but against a
   smaller/different spine, not directly comparable) — ambiguous/no-exact-name-match 72,
   country mismatch 5, no ROR hit 1, other 16. The 72-bucket is the one that might have real
   KFUPM/UCL-style manual-search wins in it, but is a large individual-investigation effort,
   not one query — left queued rather than started this pass.

~~Bocconi University's missing QS 2027 row~~ — **done this pass**, see Phase 5.
