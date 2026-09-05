# Schema exists, nobody consumes it — full audit, 2026-09-05

The inverse of today's earlier [migration-vs-live-schema audit](migration-vs-live-schema-audit-2026-09-05.md).
That one measured code that exists with no matching live column. This one measures the
opposite: live, populated columns that no application code ever reads, so real data a
researcher or the system collected never reaches a student's or parent's screen. CEO's framing:
two real instances surfaced by accident today (`university_profile_metrics.stats_as_of`,
`profiles.target_geographies`, both already fixed) — this is the deliberate sweep before
assuming there aren't more.

**Method**: every non-structural column across 15 student-facing tables (`opportunities`,
`opportunity_matches`, `universities` + 4 subtables, `profiles`, `profile_scores`,
`target_universities`, `applications`, `application_requirements`) — 333 columns total — was
checked two ways: (1) live fill rate, queried directly against `information_schema`/the tables
themselves, and (2) whether its value is ever consumed by application code, traced forward
(not just "does a `.select()` string mention it" — does the fetched value actually reach a
render, a response, or an AI prompt). Five parallel passes did the code-tracing; one mistake is
disclosed and corrected below rather than hidden. Internal-plumbing tables
(`external_sync_jobs`, `provider_health`, `ai_usage`) were out of scope per the assignment.

**One correction, disclosed rather than smoothed over**: the first pass (`opportunities`/
`opportunity_matches`) was handed a hand-typed column list that turned out to have 14 phantom
names (columns that don't exist — `age_max`, `hours_per_week`, `priority_score`, etc., mostly
names that exist on *other* tables) and was missing 13 real ones. The other four passes were
told to self-derive their column lists from the migration files directly and did, catching
this exact class of error themselves. The phantom findings are discarded below, not reported;
the 13 missing real columns were checked separately and are included.

## Headline: two direct hits on the product spec itself

**`opportunity_matches`** stores exactly the fields AGENTS.md Phase 12 mandates be shown —
"Eligibility, Relevance, **Profile Need**, Deadline urgency, **Effort**, **Confidence** — do
not call this one opaque AI score" — and none of the three reach a screen:
- `profile_need_score` — 2039/2039 rows (100%), computed every refresh, fetched via
  `select("*")`, never dereferenced.
- `match_confidence` — 203/2039, same shape.
- `effort_estimate` — 0/2039, always written as literal `null` — never had a value to lose.

**`target_universities.academic_fit_score` / `profile_fit_score`** are exactly what AGENTS.md
Phase 16 mandates — "Academic Fit 0-100 / Profile Fit 0-100" — computed and persisted every
time an outlook calculates (`lib/admissions/persist.ts`), even fetched back through the
parent-safe RPC (`get_parent_child_target_universities`) — and then silently dropped in the
mapping layer (`lib/parent/university-detail.ts`) before reaching any UI. Zero display, student
or parent side. 5/20 filled where an outlook exists.

These aren't incidental gaps — they're the exact fields the product's own founding spec named
as required, built, computed, and then never shown.

## Cross-cutting patterns (worth fixing as a class, not one column at a time)

**1. Selected via query, never dereferenced downstream** — the cheapest class to fix, since the
data is already on the wire; this is a consumption bug, not a query-shape or backfill problem.
Found **eight separate times**:
`opportunity_matches.match_confidence`, `opportunity_matches.profile_need_score`,
`profile_scores.calculated_at`, `university_profile_metrics.data_quality_flag`,
`university_statistics.retrieved_at`, `university_rankings.verified_at`,
`university_rankings.data_quality_flag`, `university_sources.source_type` +
`university_sources.confidence`.

**2. A fully-built, fully-tested feature with zero production callers** — found **three
times**, each a real, non-trivial module:
- `lib/universities/counseling-adapter.ts`'s `buildUniversityCounselingView` — 60+ unit test
  call sites, zero route/page callers.
- `evaluateRequirementGroup()` (`lib/requirements/evaluate.ts`) — the "any ONE of N
  alternatives satisfies this requirement" mechanism migration 0056 built specifically for
  Edinburgh's 4-route English-proficiency case. Zero production calls; the live path evaluates
  requirements one at a time instead.
- `getDataStatusDistribution()` (`lib/admin/queries.ts`) — a real per-status breakdown across
  universities/requirements/deadlines, built for exactly the admin catalog-health view
  AGENTS.md Phase 51 specs. No admin page imports it.

**3. Canonical-entity linking columns, wired for one purpose, never extended to siblings** —
`school_entity_id` on `profiles` genuinely drives schoolmate-matching
(`lib/social/people-you-may-know-query.ts`); `canonical_entity_id` on `universities` genuinely
powers alias search. But the identically-shaped `country_entity_id`/`city_entity_id` /
`organization_entity_id` columns on `opportunities`, `universities`, and `profiles` are all
0-filled and 0-consumed everywhere. Same migration effort, same column shape, only some of it
was ever finished.

**4. A real reader permanently starved by its own writer** (mirror-image of the main pattern —
not "nobody reads it," but "someone reads it and there's never anything there"):
- `opportunities.source_verified_at` — 0/422 filled, but a full reverification pipeline
  (`lib/opportunities/reverification/run-job.ts`) has a real, carefully-gated write path
  ("only write once the run is CONFIRMED, P1 only") and **four** live read sites already
  wired and waiting (`dashboard/page.tsx`, `home-strip.ts`, `digest/build.ts`,
  `parent/panel-data.ts`). This is a job-activation gap, not an abandoned column — worth
  routing to whoever owns that job's trigger, not the same fix as the others below.
- `application_requirements.title` — genuinely read (`lib/ai/student-context.ts` feeds it to
  the AI advisor's prompt), but the only write path always inserts `title: null`; the code's
  own 2026-09-02 comment already documents "100% of live rows have title IS NULL" — still true.

## LIST 1 — populated live, NOT READ (wasted work: someone filled it, nobody shows it)

**opportunities**: `funding_available` (12/422) · `start_date` (64/422) · `end_date` (67/422) ·
`application_open_date` (14/422) · `image_attribution` (65/422) · `image_source_url` (65/422) ·
`normalized_title` (422/422 — computed for every row, only referenced in a comment about a
possible *future* dedup use).

**opportunity_matches**: `match_confidence` (203/2039) · `profile_need_score` (2039/2039) — see
headline above.

**universities**: `external_ids` (1019/1019) · `last_changed_at` (995/1019 — read only to
decide *whether* to notify, the timestamp itself never shown) · `data_confidence` (1019/1019)
· `data_status` (1019/1019).

**university_profile_metrics**: `data_quality_flag` (6284/6284 — selected on the live detail
page, never dereferenced) · `notes` (3084/6284) · `scope` (6284/6284, write-side dedup key
only).

**university_statistics**: `stat_year` (3/133, separately tracked — 0132 fixes its index) ·
`retrieved_at` (133/133 — `SourceBadge` uses `updated_at` instead).

**university_sources**: `source_type` (198/198) · `confidence` (198/198) · `raw_excerpt`
(198/198) — all selected via `select("*")` on the student page, none destructured; the parent
page doesn't even select them, only a row count.

**university_requirements**: `data_status` (write-only) · `last_checked_at` (22/1550) ·
`research_record_id` (1266/1550 — migration's own comment: "not read by product UI," by
design, not a bug).

**university_deadlines**: `application_cycle` (377/470) · `retrieved_at` (470/470) ·
`cycle_year` (294/470) · `source_type` (444/470) · `research_record_id` (444/470) ·
`data_status` (write-only).

**university_rankings**: `overall_score` (449/1009) · `source_published_at` (1009/1009) ·
`notes` (1009/1009) · `verified_at` (1009/1009 — selected, dropped, see pattern #1) ·
`data_quality_flag` (1009/1009 — same).

**university_programs** (the worst single table — 17,046 rows, 6 fully-populated columns
completely unconsumed): `data_confidence` (17046/17046) · `secondary_subject_tags`
(17046/17046, only reachable via the dead `buildUniversityCounselingView`) · `source_url`
(17046/17046) · `source_type` (17046/17046) · `verified_at` (17046/17046) · `notes`
(17046/17046) · `normalized_name` (17046/17046, legitimately backs a DB uniqueness index —
internal purpose, not pure waste) · `language_of_instruction` (11593/17046) · `campus`
(11130/17046) · `delivery_mode` (6715/17046) · `international_eligible` (1159/17046) ·
`admissions_url` (2309/17046, only consumer is an offline audit script).

**target_universities**: `academic_fit_score` / `profile_fit_score` (5/20 — see headline) ·
`outlook_model_version` / `outlook_calculated_at` (5/20 each, internal staleness-check only) ·
`notes` (4/20, no UI — contrast `applications.notes`, which does have one).

**profiles**: `last_name` (4/11) · `profile_scores.calculated_at` (72/72, see pattern #1).

## LIST 2 — empty, NOT READ (maybe never needed, or backfill genuinely pending)

**opportunities**: `access_channel` (0/422) · `country_entity_id`, `organization_entity_id`
(0/422 each — pattern #3) · `opportunity_matches.effort_estimate` (0/2039, always literal
`null`).

**universities**: `country_entity_id`, `city_entity_id` (0/1019 — pattern #3) · `selectivity`
(4/1019) · `academic_tier`, `academic_tier_local_name` (0/1019 — **this is your own opening
example**; already tracked from yesterday's `docs/bugun-dogrulama-2026-09-04.md`, independently
reconfirmed live today, not a new finding — column exists, migration applied, genuinely 0
backfilled, and yes, correspondingly unread).

**university_statistics**: `last_changed_at` (0/133).

**university_requirements**: `unmet_consequence`, `scope`, `verified_at`, `group_role`,
`clause_ref` (all 0/1550 — `group_role`/`clause_ref` are the dead requirement-groups feature,
see pattern #2).

**university_deadlines**: `scope`, `last_checked_at` (0/470).

**university_programs**: `duration_years`, `tuition_amount`, `tuition_currency` (0/17046 —
confirmed superseded: `lib/universities/tuition-format.ts`'s own comment says tuition now lives
entirely in `university_profile_metrics`) · `full_time_part_time` (0/17046, not even referenced
by the live ingestion pipeline) · `kilavuz_kodu`, `ucas_code` (0/17046 — migration's own
comment: "backfill is separate, not-yet-done work," a known pending task, not a bug).

**profiles**: `country_entity_id`, `city_entity_id` (0/11 — pattern #3) · `terms_accepted_at`
(0/11 — technically consumed by a DB trigger chain that terminates in an export-excluded table
nothing displays; effectively dead from a product standpoint).

## Special / nuanced — didn't fit either list cleanly, worth reading anyway

- **`profiles.curriculum_other_text`** — 0/11 filled (small N, so this may just mean no live
  student picked "Other" yet), but every real *read* of this field name in the codebase is
  wired to the `education_records` **twin column** the same migration (0109) also created —
  never the `profiles` one, even though onboarding writes the `profiles` column specifically.
  A wrong-twin wiring bug, not simple neglect — if a student ever does populate it, nothing
  would show it today regardless.
- **`profiles.show_gpa`** — 11/11 "filled" (boolean with a default, so this only means every
  row has *some* value, not that anyone opted in) — dead on both ends: no UI writes it, and the
  GPA-display code it's supposed to gate never checks it either. A half-built feature.
- **`profiles.onboarding_step`** — 4/11, write-only, but the code's own comment says this is a
  deliberate diagnostic breadcrumb, not meant to gate anything. Included for completeness per
  the "search hard, name it either way" instruction, not presented as a bug.
- **`university_statistics.cost_currency`** — read correctly on the compare page, but
  selected-and-dropped specifically on the browse *card* path — a surface-specific gap, not a
  column that's dead everywhere.
- Several columns resolved to **READ only as a filter/gate** — the value decides what appears
  on screen (or whether a notification fires) without the value itself ever being printed as
  visible text: `opportunities.status`/`verification_state`, `universities.duplicate_status`,
  `universities`/`university_statistics.last_changed_at` (notification trigger, name-only
  body), `university_requirements.evaluation_gate` and siblings. Scored READ per "does it
  change what the student sees," not forced into NOT READ — flagging the judgment call
  explicitly rather than hiding it.
- **`university_requirements.data_confidence`** looked like a strong NOT READ candidate at
  first glance and is the opposite: a 6-hop chain (`lib/counselor/scoring.ts` →
  `lib/ai/weekly-plan.ts`'s `rankPlanActions` → `lib/plan/persist.ts`'s priority ordering) that
  genuinely changes the display **order** of the dashboard's "This Week" top-3 actions — a
  founder-directed fix from 2026-09-02. The kind of chain a lazy grep would miss entirely;
  included here as a positive example of the search discipline this audit was asked to apply.

## What's NOT in here

Every column in the audited tables reached a definite READ / NOT READ verdict — no genuine
UNCLEAR cases survived the search discipline the assignment required (a couple of borderline
filter/gate judgment calls are flagged explicitly above rather than hidden in either list).
`applications` and `application_requirements` are fully wired — no findings, not because they
weren't checked, but because nothing was found. Not re-litigating `stats_as_of` /
`target_geographies` (already fixed today) or `academic_tier` (already tracked, confirmed
unchanged, see List 2).
