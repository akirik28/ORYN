# ORYN current product capability map

Compiled 2026-08-20 by Claude B (Computer B / PRODUCT-COUNSELOR-UX-INTEGRATION workstream,
branch `oryn/counselor-data-quality-v1`), from direct code/schema reads — `supabase/
migrations/*.sql`, `lib/`, `app/(app)/**`, `features/`, `__tests__/` — not from prior docs.
Existing docs under `docs/` (`feature-inventory.md` 2026-08-16, `current-state.md` 2026-08-19,
`counselor-core-plan.md`, `data-readiness.md`, etc.) were cross-checked, not trusted, and are
flagged below wherever they're now measurably stale — several predate commits already on this
branch (`08ddf0f`, `f6c353f`, `036792f`, migration `0047`).

**Readiness key**: `Working` (code-complete, no missing credential/migration) · `Env-blocked`
(code-complete, needs a credential/migration) · `Content-empty` (works, no real data yet) ·
`Partial` (some but not all of the sub-area is built) · `N/A` (confirmed absent).

Five fixes were made and shipped *during* this audit rather than only documented — see
`git log` on this branch (`cb630c5`, `5cdf1bd`, `072313d`, `6b715ac`) — noted inline where
relevant.

---

## 1. Student

| Area | Data exists? | API exists? | UI exists? | Works? | Real/placeholder | Issues |
|---|---|---|---|---|---|---|
| Identity | `profiles`: first_name/last_name/display_name/birth_year/country/city (0002) | `app/(app)/settings/actions.ts` — display_name, location only | Settings forms | Partial | Real | `first_name`/`last_name`/`birth_year` have **no write path anywhere** (never set by onboarding or settings) — dead columns, only read as a display-name fallback |
| School | `profiles.school_name`+`school_entity_id`; `education_records.school_name`+`school_entity_id` | onboarding (profile-level, once) + profile CRUD (per-record) | Onboarding step 1 + profile Education section | Working | Real | Two independent, never-synced "school" facts — not a bug, worth knowing |
| Education / grades / courses | `education_records`, `courses` (0003): `overall_gpa`+`gpa_scale` (numeric, preserves native scale — no forced /4), `grade_value`+`grade_scale` (free text) | Full CRUD | Profile Education/Coursework sections | Working | Real | `grade_value`/`grade_scale` never normalized against `gpa_scale` — acceptable, avoids the false-precision cross-system comparison the spec prohibits |
| AP / IB / A-Level | `courses.level` enum (`ap`/`ib_hl`/`ib_sl`/`a_level`/...), **independent** of `education_records.curriculum` (`turkish_curriculum`/`ap`/`ib`/...) — two separate enums, no FK/CHECK tying them together (grepped every migration) | Same as courses | `COURSE_LEVEL_OPTIONS` (`features/profile/field-config.ts:271-282`), explicitly documented as "the one rigor ontology, not a second parallel one" | Working | Real | **Confirmed by design, not accidental**: a student can have `education_records.curriculum='turkish_curriculum'` and a `courses` row with `level='ap'` simultaneously, in both schema and UI — no cross-field validation exists, so Oryn also never flags an internally-contradictory course mix. Was previously undermined by a UI bug (see Fixed below) |
| Standardized tests | `test_scores` (0003): test_name/score/max_score/`subscores jsonb` | Full CRUD | Profile Test scores section | Working | Real | `subscores` jsonb column has **no write path** — dead column |
| Interests | `student_interests` (0005) | **Write-once**, onboarding only | Onboarding `InterestsStep` only | Partial | Real | No update/add/delete surface exists after signup — confirmed via grep |
| Majors / target field | Not modeled as its own entity | — | — | N/A | N/A | Proxied via `student_interests` and per-university `target_universities.program_id`; no standalone "intended major" |
| Career goals | `career_goals` (0005) | Full CRUD | Profile Goals section | Working | Real | — |
| Target universities | `target_universities` (0007) + cached `admission_model_v1` outlook columns | Full CRUD, resolves through `canonicalUniversityId` to avoid saving a superseded duplicate | `/universities/[id]`, dashboard | Working (outlook content-empty until `university_statistics` populated) | Real | — |
| Activities / leadership | `activities` (0004): `is_leadership_role`/`people_led`/`organization_scope`/`category` | Full CRUD | Profile Activities section | Working | Real | **Fixed this session** (`cb630c5`): `category` defaulted to `"club"` instead of the column's own DB default `"other"` — any activity saved without touching that dropdown was silently miscategorized |
| Research / publications | `research_experiences` (0004); publication = `output_type='peer_reviewed_publication'` + free-text `output_url`, not its own entity | Full CRUD + AI research-idea generator | Profile Research section | Working (generator env-blocked without `ANTHROPIC_API_KEY`) | Real | No journal/DOI/co-author fields — matches migration 0004's stated modeling assumption |
| Competitions | Not a table — split across `activities.category='competition_team'` and `awards` | Respective CRUD | Respective sections | Attribute only | Real | No entity links a competition's participation row to its result/award row |
| Awards | `awards` (0004) | Full CRUD | Profile Awards section | Working | Real | — |
| Internships / work | `work_experiences.employment_type='internship'` | Full CRUD | Profile Work section | Working | Real | — |
| Volunteering | `volunteering_experiences` (0004) | Full CRUD | Profile Volunteering section | Working | Real | Missing `STORY_NOTES_FIELD` present on every sibling achievement type — likely oversight |
| Projects / entrepreneurship | `projects` (0004); entrepreneurship is a derived scoring signal (`lib/scoring/dimensions/entrepreneurship.ts`: `role` matches `/founder/i` or `revenue_amount` set) | Full CRUD | Profile Projects section | Working | Real (no fake data), but heuristic is narrow — a real founder who doesn't type "founder" scores 0 on this dimension |
| Athletics | `sports_experiences` (0026, first-class table) | Full CRUD | Profile Sports section | Working | Real | Same curriculum-style select-default bug existed here (`level`) — **fixed this session** (`cb630c5`) |
| Certificates / evidence | `certifications` (0004) + `evidence_files` (0005) | Certifications via profile actions; evidence upload/delete/signed-URL via `app/(app)/documents/actions.ts` | Profile Certifications + `/documents` | Working | Real | `verification_status` enum has `verified`/`verification_rejected` states that are **never reachable by any code path** — only `self_reported`/`evidence_added` are ever written. Matches spec's "Future status: Verified" framing (not a bug, the verification pipeline doesn't exist yet) |

**Fixed this session**: `features/profile/dynamic-form-fields.tsx`'s `<Select>` silently
pre-selected `options[0]` for *any* nullable field with no matching DB default —
`education_records.curriculum` (nullable, no default) visually showed "AP" pre-highlighted on
every Add Education Record dialog regardless of the student's actual curriculum, the exact
US-centric-default failure mode this product is supposed to avoid. Now shows a real
placeholder for an unset value (`cb630c5`).

---

## 2. Counseling

Verified against `lib/counselor/*.ts` (index/pipeline/state/gaps/candidates/eligibility/
scoring/evidence/config/types) and `lib/scoring/*`. `docs/counselor-core-plan.md` is a
pre-implementation planning doc — several items it lists as broken/missing are already fixed
in current code; treat it as history, not spec.

| Area | Data exists? | API exists? | UI exists? | Works? | Real/placeholder | Issues |
|---|---|---|---|---|---|---|
| Profile analysis (facts) | 10 raw tables via `assembleScoringFacts` | `computeCareerProfile()` | Profile/dashboard | Fully deterministic, zero AI | Real | — |
| Strengths | Implicit only (`strongestScore`/`spreadFromStrongest` in `gaps.ts`) | No dedicated function/type | Never printed as its own concept | Partial | Real | No first-class "strengths" API — only inferred from gap math |
| Gaps | `profile_scores` | `rankDimensionGaps()` | Dashboard "Biggest Gap", Advisor strip | Deterministic | Real | Single source of truth (replaced 3 prior duplicated copies per docs) |
| Candidate generation | opportunities, university_requirements, completeness checklist | `generateCandidateActions()` | Feeds priorities panel | Deterministic, 3 verified sources only | Real | — |
| Eligibility filtering | age/country/citizenship/grade/verification/cycle_status | `evaluateCandidateEligibility()` — genuine 3-state `known_eligible`/`known_ineligible`/`unknown` | Warning badges on cards | Deterministic, defensive against missing migration 0047 columns | Real | This is the **correct** reference implementation — the separate, less-rigorous eligibility path on the main `/opportunities` page was fixed to match its philosophy this session (`5cdf1bd`) |
| Ranking | — | `rankCandidates()`, weights in `config.ts` | Ordered priorities / "worth considering" | Deterministic | Real | Weights are hand-tuned heuristics, explicitly documented as non-scientific |
| Explainability | — | `buildRecommendation()`'s `why[]` | `why` bullets on each card | Templated from real fields, never free LLM text | Real | Optional LLM narration layer exists but the deterministic pipeline never calls it — opt-in only |
| avoid_for_now / "don't do this" | `RecommendationClass` enum incl. `avoid_for_now`/`deprioritize` | `rankCandidates()` | `InsightCard variant="avoid"` | Deterministic (score ≥75 + matches strongest gap) | Real | Copy reuses gap-severity language even for a strength ("a minor current gap (92/100)" instead of "already strong") — no dedicated strength-phrased template |
| Evidence / confidence | `evidence[]` + `confidence: BoundedLevel` | `CounselorRecommendation` type | Verification badges, warnings | Real, test-asserted never to leak raw description text | Real | — |
| Opportunity matching integration | `opportunity_matches`, `saved_opportunities` | Reads only `eligible=true` + `verified_current` | Opportunity preview cards | Real; `applied`/`not_interested` hard-excluded | Real | — |
| University targeting integration | `target_universities`, `university_requirements` | `getRequirementCandidateInputs()` | "Requirement Check" | Real, reuses `lib/requirements/evaluate.ts` | Real | Only `not_met`/`unknown` become candidates — correct |
| Weekly plan | `weekly_plans`, `weekly_actions` | `generateWeeklyPlan()` | `/plan`, dashboard | **Requires `ANTHROPIC_API_KEY`**, no deterministic fallback | Real, AI-dependent | An outage produces an error state even though Counselor Core's own AI-free ranked candidates already exist and could substitute — not wired as a fallback |
| Recommendation history | `ai_recommendations` (user_response/feedback/completed_at) | Only written by weekly-plan persist | Dashboard "avoid" card reads it | Deliberately not used by Counselor Core (plan doc's own decision: recompute on read) | Partial | Counselor Core's own do/consider/deprioritize/avoid_for_now output has **no dismiss/reject UI and is never persisted** — "don't re-recommend" only works for opportunities (via `saved_opportunities.status`), not requirement/profile-task candidates |

**FACT / ASSESSMENT / RECOMMENDATION**: genuinely separate, never collapsed. FACT = raw
records → structured `ReasonCode{code,detail}` citing the actual record. ASSESSMENT =
`DimensionScoreRow`/`ProfileGap` — a 0-100 score + confidence + severity label, never a free
string. RECOMMENDATION = `CounselorRecommendation` — title/class/`why[]`/`evidence[]`/
confidence/warnings. The optional LLM layer is explicitly barred from seeing raw
scores/breakdowns "so the model never sees numbers it could misquote back with false
precision."

**Scores that could be confused with admission probability**: two exist, both explicitly
disclaimed in UI copy, neither inside Counselor Core — `CareerProfileResult.overallScore`
("Oryn's own development assessment, not an official admissions...") and
`AdmissionOutlookResult.compositeScore` (maps to 5-tier labels, optional range always ≥10pts
wide, confidence capped at "medium," explicit "not a guarantee" copy).

**Fixed this session** (`072313d`): `profiles.completeness_percent` — which directly gates
`lib/admissions/persist.ts`'s admission-outlook data-confidence ("high" at ≥60%) and the AI
advisor's stated "Profile completeness: X%" context line — was computed from a 15-item
checklist that weighted headline/About/3+skills/featured-item/contact-info identically to
academic details, activities, goals, and target universities. Split into a counseling-scoped
score (10 items) that now feeds those two consumers, versus the unchanged, still-broad
Profile Strength UI checklist.

---

## 3. Opportunities

Verified against migrations 0008/0041/0045/0047, `lib/opportunities/*`, `lib/counselor/*`,
`app/(app)/opportunities/*`. `docs/data-readiness.md` and `docs/research-handoff-
opportunities.md` are stale by roughly an order of magnitude on live counts — don't cite them.

| Area | Data exists? | API exists? | UI exists? | Works? | Real/placeholder | Issues |
|---|---|---|---|---|---|---|
| Summer programs / competitions / internships / research / scholarships / volunteering | One `opportunities` table, `category` enum | Shared pipeline | Shared card/detail | Working | Real (Tavily+AI discovery when keyed; hand-verified batches in git history) | Coverage is uneven by category — internships/research/volunteering are thin on "recommendation_ready" rows per recent commits; not a code defect |
| Publication opportunities | **No such category exists** — task's own list names a category ORYN doesn't have | N/A | N/A | N/A | N/A | Flag to product if expected as a distinct offering |
| Saved opportunities | `saved_opportunities`: status enum (saved/applied/not_interested) + reason | `setOpportunityStatus` | Card dropdown | Working | Real | — |
| Applications linkage | **No FK** — `applications` (university tracker) has no `opportunity_id` | N/A | N/A | N/A | N/A | An opportunity marked `applied` is a bare flag, never surfaced in the university application checklist system |
| Deadlines | `deadline`/`application_open_date`/`cycle_status` (0041) | Read via card/detail | Deadline/cycle badges | Working, never fabricated | Real | Not wired into a central cross-product deadline engine beyond this surface — not verified here |
| Discovery job | `discoverOpportunitiesForQuery` | Admin trigger only | — | Works with `TAVILY_API_KEY`+`ANTHROPIC_API_KEY` | Real, degrades honestly | New rows insert directly as `active` — no pre-publish review gate |
| Deduplication | Two parallel implementations | `dedup.ts` (live-gating ingestion) vs `duplicates.ts` (offline audit tool, `scripts/audit-opportunity-duplicates.ts`) | N/A | Both tested | Real | Different similarity heuristics with a documented miss rate (e.g. near-duplicate titles scoring ~0.2 similarity) |
| Images | **None** — no image column on `opportunities` at all | N/A | N/A | N/A | N/A | Text-only cards throughout; deliberately deferred (university images shipped first per `docs/handoffs/claude-a-university-spine.md`), not degraded |
| Source / provenance | `opportunity_sources` + denormalized `source_url`/`source_confidence`/`last_verified_at`; `verification_state` (5-way) | `SourceBadge` | Detail page | Working | Real | Opportunities use `verification_state`, not `verification_status` — don't conflate with `evidence_files`' unrelated `EvidenceStatus` enum |

**Eligibility vs. fit — fixed this session** (`5cdf1bd`): the main `/opportunities` surface
(For You + Browse + detail) previously used a plain boolean that silently folded "the fact
needed to check a restriction isn't on file" into `eligible: true` with no caveat, and never
evaluated citizenship or grade at all despite `eligible_citizenships`/`eligible_grades`
existing on the schema since migrations 0047/0041 — a citizenship- or grade-restricted
opportunity a student doesn't qualify for could render as an "Exceptional match" with zero
warning, anywhere outside the separate, already-correct Counselor Core eligibility path
(`lib/counselor/eligibility.ts`, untouched, still the more rigorous of the two). Now checks
citizenship and grade too, and distinguishes known-ineligible (hard exclusion, unchanged) from
restriction-exists-but-fact-missing (stays `eligible: true`, now carries an explanatory note
and a distinct "Eligibility unknown" badge). Fit (relevance × profile-need → `matchScore`) was
already correctly kept in a separate field from eligibility in both the old and new code —
that part was never the bug.

---

## 4. University

Verified against migrations 0006/0016/0038/0043/0044, `lib/universities/*`,
`lib/requirements/*`, `lib/admissions/*`, `app/(app)/universities/**`.

| Area | Data exists? | API exists? | UI exists? | Works? | Real/placeholder | Issues |
|---|---|---|---|---|---|---|
| Canonical identity | `canonical_entities` (0038): entity_type incl. `university`, verification_state, FKs from `universities` | `search_canonical_entities()`, `resolve`/`merge` SQL fns | EntityCombobox (per `f6c353f`) | Working | Real | — |
| Duplicate / alias handling | `entity_aliases` (trigram-indexed); `universities.duplicate_status`/`superseded_by_id` columns exist per migration 0043 | `merge_canonical_entities()` merges identity only | `lib/universities/canonical.ts` + generated `duplicate-supersessions.json` (9 pairs) | Working functionally | Real data, **architecture drift**: migration 0043 exists as a file but has **never actually been applied live** (no DDL access) — the live fix is an app-layer JSON file, not the schema columns it claims to populate. A fresh migration-driven DB would have the columns but an unpopulated/stale mapping unless the generation script is re-run against it |
| Programs / majors catalog | `university_programs` (0006 + 0044 enrichment): `verification_state`, `source_url`, dedup unique index | Plain select, `.eq("verification_state","verified_current")` | Detail page Programs section | **Working, fixed this session** — `036792f` confirmed accurate (previously fetched all verification states while UI claimed "verified") | Real | **Not capped** — no `.limit()` in the query, full verified set renders grouped by subject; card-level research-topic chips now explicitly labeled "Research focus" so they can't read as a majors list |
| Tuition | `university_programs.tuition_amount/currency` (per-program, mostly unpopulated) + `university_profile_metrics.tuition_international_annual/tuition_domestic_annual` with `precision_state` | Query joins both | Stat cards | Working | Real, sourced | Deliberately never blends US `cost_of_attendance` (IPEDS) with UK/intl `tuition_*_annual` — documented rule, citing a real prior regression where the two got conflated |
| Student count | `universities.student_size`, `university_profile_metrics` counts, QS size-band fallback | Direct select | Stat cards | Working | Real | Falls back to a labeled coarse S/M/L/XL band, never implied exact, when no precise count exists |
| Admissions statistics | `university_statistics` (admission_rate, SAT/ACT ranges, graduation_rate, cost_of_attendance) | Direct select, latest `stat_year` | Stat cards | Working | Real | US-heavy coverage (cost_of_attendance ~128/1019, US-only) |
| Images | `university_profile_metrics` (primary_image_url/license/attribution), `universities.logo_url` | `lib/universities/image-coverage.ts` | 3-tier fallback: real → logo → Oryn-branded icon, each falling through on `onError` | Working | Real, never a fabricated photo | — |
| Map coordinates | `universities.latitude/longitude` (0016) | Direct select | World map explorer | Working | Real, nullable — never fabricated, simply doesn't render a pin without a source | — |
| Target-university relationship | `target_universities`, 8-state status enum, cached outlook columns | `addTargetUniversity`/`updateTargetUniversityStatus` | `SaveUniversityButton`, all 8 statuses wired | Working | Real | Self-heals stale duplicate references via `canonicalUniversityId()` at read time |
| Requirement checking | `university_requirements`, `student_requirement_evaluations` | `assembleRequirementFacts`/`evaluateRequirement` | Requirement Check section | Working, deterministic, no AI | Real | Explicitly refuses to compare GPAs across grading scales |
| Admission outlook | `target_universities.outlook`/`estimate_range_*`/`outlook_confidence` | `computeAdmissionOutlook()`/`explainOutlook()` | "Your outlook" section | Working | Real | **Strongest-adherence area found in this whole audit**: 5-tier categorical label, an optional wide range only when real `admission_rate` data exists (never single-point, whole percentage points, confidence capped at "medium"), mandatory strengths/gaps/unknowns explanation, explicit "not a guarantee" copy |

**Notable issues**: (1) the migration-0043 drift above is real and worth resolving —
apply 0043 once DDL access exists, or update the stale "never applied" comments if that's
since changed; this is Claude A's data/migration lane, flagged here rather than fixed by
Claude B. (2) Cost-concept separation (never blending `cost_of_attendance` with
`tuition_*_annual`) is a good pattern worth replicating elsewhere data has two incompatible
"amount" concepts. (3) `docs/university-surface-audit.md`, `docs/live-db-reconciliation.md`,
and `docs/handoffs/claude-a-university-spine.md` track closely with actual code for the areas
checked here — unlike several other docs, these appear current rather than stale.

---

## 5. Social

Verified against migrations 0023/0024/0027/0030/0031/0036, `lib/social/*`,
`app/(app)/connections/`, `/messages`, `/admin`, `/u/[id]`.

| Area | Data exists? | API exists? | UI exists? | Works? | Real/placeholder | Issues |
|---|---|---|---|---|---|---|
| Connections (mutual-consent, not follow) | `connections`, `connection_status` enum, order-independent unique pair | `sendConnectionRequest`/`respondToConnectionRequest`/`removeConnection` | `/connections` | Working | Real | Re-verifies target is public server-side after migration 0024's leak fix; response re-checks status since RLS alone can't know it |
| Mutuals / People You May Know | Derived, no dedicated table | `lib/social/mutual-connections.ts`, `people-you-may-know-query.ts` | Connections page | Working, deterministic (no AI) | Real | Candidates filtered to `is_public=true` only — correct minor-safe behavior |
| Feed | **None** | — | — | N/A | N/A confirmed absent | Matches the explicit "do NOT build a social feed" spec instruction |
| Public profile `/u/[id]` | `public_profiles` view, narrow column whitelist | `getPublicProfile` etc. | `/u/[id]` | Working | Real | Requires auth to view any profile (`grant ... to authenticated`, never `anon`) |
| Messaging | `messages`, denormalized so history survives disconnect | `sendMessage`/`markConversationRead` | `/messages` | Working | Real | INSERT RLS requires a live accepted connection + not blocked, re-checked server-side + rate-limited (60/10min); read/send split so history stays readable after disconnect |
| Block / report | `blocked_users`, `message_reports` | `blockUser`/`reportMessage` | In-thread | Working | Real | Block gates messaging only, not profile visibility — documented as deliberate |
| Moderation admin | `message_reports` + status/reviewer/note | `updateReportReview` | `/admin` | Working but minimal | Real | No suspension/ban capability exists at all — explicitly scoped out as a separate, undecided product question |
| Profile views / Profile Strength | `profile_views` | `recordProfileView`/`getProfileViewCounts` | Own `/profile` only, never `/u/[id]` | Working | Real | **Fixed this session** (`6b715ac`): INSERT RLS didn't gate on the viewed profile being public/connected — any authenticated user could record a view against an arbitrary private profile UUID via a direct Supabase call. Written, syntactically reviewed, not yet applied live (same DDL-access constraint as migrations 0043/0046) |

**Minor-safe check**: no public-by-default surface found — `profiles.is_public` defaults
`false`, the public view grants to `authenticated` only, phone visibility can't be set public
under 18. Messaging is connection-gated at the RLS layer, not just hidden in UI (a later,
explicitly founder-approved scope change from the original "no public messaging in V1" brief,
already self-documented in `docs/known-issues.md`).

---

## Cross-cutting notable issues (not area-specific)

- Two parallel "avoid_for_now" systems that don't share state: Counselor Core's deterministic
  one (never persisted, no reject UI) and the LLM Weekly Plan's one (persisted, shown on
  dashboard).
- `evidence_files.verification_status`'s `verified`/`verification_rejected` states are
  unreachable by any code path — the verification pipeline (spec's eventual human-review step)
  doesn't exist yet. Correctly never claimed in UI copy.
- Several `docs/*.md` files are measurably stale relative to this branch's own recent commits
  (`08ddf0f`, `f6c353f`, `036792f`, migration `0047`) — treat any doc as a lead to verify
  against code, never as ground truth, until a fresh integration checkpoint is written.
