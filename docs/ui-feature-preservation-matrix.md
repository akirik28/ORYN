# ORYN UI feature-preservation matrix

Purpose: prove that the incoming UI-simplification redesign can make ORYN dramatically
simpler to use **without silently deleting working capability**. Compiled 2026-08-20 by
Claude B from `docs/current-product-capability-map.md` (itself code/schema-audited, not
doc-sourced) — this file adds the product-triage judgment (primary/secondary, progressive-
disclosure candidate, AI-friction-reduction candidate, removal risk) that the capability map
deliberately left out.

**How to use this**: before removing or hiding a capability in the redesign, find its row.
"Secondary" + "Can be progressive: yes" means hide-by-default is fine. "Primary" + "Risk if
removed: high" means it must stay reachable, even if visually demoted. Nothing below is a
recommendation to keep everything equally visible — that would defeat the redesign's purpose.
It is a checklist to consult when deciding what "simpler" is allowed to mean.

**Columns**: Current data source | Current UI | Needed in final product? | Primary/Secondary |
Progressive-disclosure candidate? | Can AI reduce the friction instead of hiding the field? |
Risk if silently removed.

---

## Student profile capabilities

| Capability | Data source | Current UI | Needed? | Primary/Secondary | Progressive? | AI can reduce friction? | Risk if removed |
|---|---|---|---|---|---|---|---|
| School/graduation year/curriculum | `profiles` | Onboarding step 1 | Yes | Primary | No — this gates everything downstream | Already AI-assisted via CV import | High — nothing else works without it |
| Native-scale GPA (value+scale) | `education_records.overall_gpa/gpa_scale` | Education section | Yes | Primary | Show simplified, let "add scale" be a secondary field | CV extraction could infer scale from context | High — collapsing to a fake /4.0 is a trust violation, not simplification |
| AP/IB/A-Level courses | `courses.level` | Coursework section | Yes | Secondary for a 14-year-old, Primary for an 11th/12th grader nearing applications | Yes — show only once curriculum/grade suggests it's relevant | Yes — "Improve with AI" pattern already exists; extend to course suggestion from transcript text | Medium — losing this loses the exact signal admissions officers weight most for rigor |
| Class rank | **No column exists** | N/A | **No** — do not add it | N/A | N/A | N/A | None — it was never built, correctly |
| Standardized tests | `test_scores` | Test scores section | Yes, but never mandatory | Secondary | Yes — many students genuinely have none yet | Presence-only scoring already avoids penalizing absence | Low if hidden by default, High if made to feel required |
| Activities/leadership | `activities` | Activities section | Yes | Primary | No | "Improve with AI" already exists | High — core counseling signal |
| Research/publications | `research_experiences` | Research section | Yes | Primary for STEM/research-track students, Secondary otherwise | Yes | AI research-idea generator already exists (env-blocked without `ANTHROPIC_API_KEY`) | High for the students it applies to |
| Awards | `awards` | Awards section | Yes | Primary | No | No | Medium |
| Projects/entrepreneurship | `projects` | Projects section | Yes | Primary | No | No | Medium-high — entrepreneurship dimension depends entirely on `role`/`revenue_amount` text, has no other signal source |
| Volunteering/work/internships | Respective tables | Respective sections | Yes | Secondary | Yes, can consolidate visually | No | Low-medium |
| Sports | `sports_experiences` | Sports section | Yes | Secondary | Yes | No | Low |
| Certificates/evidence | `certifications`, `evidence_files` | Certifications + `/documents` | Yes | Secondary | Yes | No | Low — evidence is spec-explicit optional |
| Interests | `student_interests` | Onboarding only (no post-signup edit surface — a real gap, not a UI-simplification question) | Yes | Primary (feeds matching/scoring) | N/A — the gap is *no* progressive access, not too much | Could be inferred/suggested from added activities | High — fix the missing edit surface regardless of redesign, this predates any simplification decision |
| Career goals / target field | `career_goals`, `student_interests` | Goals section | Yes | Primary | No | Could suggest from activity pattern | High — recommendations trace to goals per spec |
| Target universities | `target_universities` | Universities pages, dashboard | Yes | Primary | No | No | High |
| Skills/headline/About/featured (Professional Profile pack) | `skills`, `profiles.headline/about`, `featured_items` | Profile Strength section | Yes, but genuinely secondary | Secondary | Yes — this is precisely what should collapse behind progressive disclosure | No | Low — confirmed this checkpoint: excluding these from counseling-completeness scoring didn't remove the feature, just fixed what it feeds |
| Contact info | `contact_info` | Settings | Yes | Secondary | Yes | No | Low |

## Counselor capabilities

| Capability | Data source | Current UI | Needed? | Primary/Secondary | Progressive? | AI can reduce friction? | Risk if removed |
|---|---|---|---|---|---|---|---|
| Gaps ("Biggest Gap") | `lib/counselor/gaps.ts` | Dashboard, Advisor | Yes | **Primary — this is the product's core differentiator per the founder spec** | No | N/A, already deterministic | Critical |
| Strengths | `lib/counselor/strengths.ts` (added this checkpoint — was previously implicit-only) | Being wired into dashboard this checkpoint | Yes | Primary | No | N/A | High — "your strongest area" is explicit spec copy |
| Prioritized next actions (do/consider/avoid_for_now) | `lib/counselor/scoring.ts` | Advisor priorities, dashboard (fallback being added this checkpoint) | Yes | **Primary — the whole "what should I do next" promise depends on this being visible, not buried** | No — max 3 primary actions is already the spec's own simplification rule | N/A, deterministic | Critical |
| "Don't do this" / avoid_for_now | `RecommendationClass` enum | `InsightCard variant="avoid"` | Yes | Primary — explicitly named a differentiating feature in the spec | No | N/A | High |
| Explainability ("why this matters") | `CounselorRecommendation.why[]` | Card bullets | Yes | Primary | No — collapsing the "why" defeats the trust principle | N/A | High |
| Evidence/confidence badges | `CounselorRecommendation.evidence[]/confidence` | Verification badges | Yes | Secondary display, Primary underlying guarantee | Yes — can be a hover/expand rather than always-visible | N/A | Medium — hide the badge, never hide the underlying honesty (i.e. never let a low-confidence rec render identically to a high-confidence one) |
| Weekly plan (AI) | `weekly_plans` | `/plan`, dashboard | Yes | Secondary to Counselor Core's own deterministic priorities (per this checkpoint's fix — Counselor Core now works without it) | Yes | Already AI | Low now that a deterministic fallback exists — was High before this checkpoint |
| Recommendation dismiss/history | Partial — only opportunities have it | No UI for requirement/profile-task dismissal | Should exist, doesn't yet | Primary once built | N/A | N/A | Not a redesign question — a real gap to close regardless |
| Career Profile overall score | `profiles.profile_strength_score` | Dashboard header block | Yes | Primary | No | N/A | High — spec's own example homepage leads with this |
| Profile completeness % | `profiles.completeness_percent` (fixed this checkpoint) | Profile Strength section | Yes | Secondary (a diagnostic, not a headline number) | Yes | N/A | Low |

## University capabilities

| Capability | Data source | Current UI | Needed? | Primary/Secondary | Progressive? | AI can reduce friction? | Risk if removed |
|---|---|---|---|---|---|---|---|
| University search/browse | `universities`, canonical entities | `/universities`, world map | Yes | Primary | No | Alias-aware search already reduces friction | High |
| University detail: overview/stats | `university_statistics`, `university_profile_metrics` | Detail page stat cards | Yes | Primary | No | No | Medium |
| Programs/majors catalog | `university_programs` | Detail page Programs section | Yes | Primary for a student who's picked a university, Secondary on the browse card | Yes on the card (chips), No on detail page (full list is the point) | No | Medium-high — this checkpoint's own fix exists specifically because a shrunk/wrong programs view actively misleads |
| Tuition | `university_profile_metrics`, `university_statistics.cost_of_attendance` | Stat cards | Yes | Primary | No | No | Medium |
| Admission outlook + explanation | `lib/admissions/outlook.ts` | "Your outlook" section | Yes | **Primary — spec's own example homepage leads with a University Outlook block** | The explanation panel (strengths/gaps/unknowns) can progressively disclose, the outlook label itself should not | No | High — this is the single most spec-compliant surface found in the whole audit; simplifying its *presentation* is fine, hiding the mandatory explanation is not |
| Requirement check | `university_requirements` | Requirement Check section | Yes | Primary once a university is targeted | Yes — irrelevant before targeting | No | Medium |
| Target-university status tracker | `target_universities` | `SaveUniversityButton`, 8 statuses | Yes | Primary | The 8-state granularity could progressively simplify to fewer visible states with the rest reachable | No | Medium — don't lose statuses from the schema, fine to reduce visible buttons |
| Images | `university_profile_metrics` | Cards, hero | Yes | Primary (trust/credibility signal) | No | No | Medium — a card with no real image reads as unfinished |
| Map explorer | `universities.latitude/longitude` | World map | Yes | Secondary (browse's a valid alternative) | Yes | No | Low |

## Opportunity capabilities

| Capability | Data source | Current UI | Needed? | Primary/Secondary | Progressive? | AI can reduce friction? | Risk if removed |
|---|---|---|---|---|---|---|---|
| Personalized "For You" matches | `opportunity_matches` | `/opportunities` For You tab | Yes | Primary | No | Already the point of the feature | High |
| Match reasoning (relevance/profile-need, not one opaque score) | `computeOpportunityMatch` | Card reason text | Yes | Primary | No — spec explicitly says don't collapse to one opaque number | N/A | High — spec Phase 12 is explicit about this |
| Eligibility badge (now 3-way honest, fixed this checkpoint) | `lib/opportunities/matching.ts` | Card + detail badges | Yes | **Primary — this checkpoint's fix exists precisely because silently hiding "unknown" is a trust violation** | No | No | Critical — do not regress this in the redesign |
| Browse-all + filters | `lib/opportunities/browse.ts` | Browse tab | Yes | Secondary to For You | Yes | No | Low |
| Save/applied/not-interested + reason | `saved_opportunities` | Card dropdown | Yes | Primary (feeds "don't re-recommend") | No | No | Medium |
| Deadline urgency | `opportunities.deadline`, `cycle_status` | Deadline/cycle badges | Yes | Primary | No | No | Medium |
| Source/provenance badge | `opportunity_sources`, `verification_state` | Detail page | Yes | Secondary display, Primary guarantee (same pattern as counselor evidence above) | Yes | N/A | Medium |

## Social capabilities

| Capability | Data source | Current UI | Needed? | Primary/Secondary | Progressive? | AI can reduce friction? | Risk if removed |
|---|---|---|---|---|---|---|---|
| Connections | `connections` | `/connections` | Yes, but explicitly not the product's focus (spec Phase 7: "do not let it outrank counselor/data quality") | Secondary | Yes | No | Low |
| People You May Know | Derived | Connections page | Yes | Secondary | Yes | Already deterministic-scored | Low |
| Public profile | `public_profiles` | `/u/[id]` | Yes | Secondary | Yes | No | Low |
| Messaging | `messages` | `/messages` | Yes | Secondary | Yes | No | Low |
| Feed | **Does not exist** | N/A | **No — spec explicitly prohibits this** | N/A | N/A | N/A | None |
| Profile views / "Profile Strength" social widget | `profile_views` | Own `/profile` only | Optional | Secondary | Yes | No | Low |

---

## Net read for the redesign

The material that must survive being visually demoted, reorganized, or hidden behind a click
— but must never actually disappear or be silently defaulted to a wrong value — clusters
almost entirely in **Counselor** (gaps/strengths/priorities/avoid-for-now/explainability) and
the two places this checkpoint found and fixed active trust violations (**opportunity
eligibility**, **admission outlook explanation**). Nearly everything in the **Professional
Profile pack** (headline/about/skills/featured/contact) and most of **Social** is genuinely,
safely collapsible — that's not a loss, it's exactly the kind of simplification this product
needs, and this checkpoint's completeness-scoring fix already treats it that way internally.
