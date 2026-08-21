# 01 — Development Taxonomy

**Answers:** What dimensions of student development are actually meaningful for counseling, and
how do they map onto the 9 shipped `ProfileDimension` values?

**Reuses, does not replace:** `ProfileDimension` (`types/database.ts`), `evidence_status`
(`supabase/migrations/0004_achievements.sql`), and every achievement table in
`0004_achievements.sql`/`0005_evidence_and_goals.sql`. Every claim below about "what's shipped"
was checked directly against those files and `lib/scoring/dimensions/leadership.ts`, not assumed.
See `00-overview.md` for the full non-duplication rationale.

This document covers five cross-cutting semantic layers that apply *across* all nine dimensions
(activity types, roles, time/duration, outputs, evidence provenance) before walking the nine
dimensions themselves — cross-cutting concepts belong once, not repeated nine times.

---

## 1. Activity taxonomy — what kind of thing is this evidence?

The mission brief's requested categories, reconciled against what's actually shipped:

| Evidence family | Shipped home | Gap |
|---|---|---|
| Course / course level | `courses`, `education_records` | Curriculum-relative rigor (is this the hardest course this school offers?) has no field — see §6 |
| Internal grade / predicted / final result | `grades`, `test_scores` | Predicted vs. final is a real confidence distinction (§5 evidence-provenance) not currently tagged at the row level |
| External exam / diploma | `test_scores`, `education_records` | — |
| Academic award | `awards` | Conflated with non-academic awards in one table — fine structurally (§8 awards_distinction explains why) |
| Club membership, student government, community org | `activities` (`activity_category`) | — |
| Project | `projects` | No `activity_category`-style typing for *kind* of project (technical/creative/research-adjacent/civic) |
| Research | `research_experiences` | Best-modeled table in the schema — see §4 |
| Internship | `work_experiences` (`employment_type = 'internship'`) | — |
| Volunteering | `volunteering_experiences` | — |
| Leadership | attribute (`is_leadership_role`) on `activities`, not a category | Correct modeling choice — leadership is a role you hold *within* an activity, not a separate activity type. See §3. |
| Entrepreneurship | `projects` (revenue/users/live_url fields) or `activities` (`category = 'other'` in practice) | No `activity_category` value for entrepreneurship specifically; founders currently have to pick `'other'` or force-fit `'community_org'`/`'academic_program'` |
| Employment | `work_experiences` | — |
| Competition | `activities` (`activity_category = 'competition_team'`) *or* `awards` for the result | A competition *entered* and a competition *result* are different rows in different tables with no required link — flagged hard in §8 and again in `02-opportunity-development-mapping.md` |
| Summer program | `activities` (`activity_category = 'summer_program'`) | — |
| Publication | `research_experiences.output_type` | Only reachable through research. A published creative-writing piece, journalism byline, or open-source library has no clean home — see §4 output taxonomy |
| Presentation | `research_experiences.output_type` | Same gap — a non-research presentation (e.g. a MUN speech, a TEDx-style talk) has no field |
| Arts performance | *(none)* | Genuine gap. Would currently be forced into `activities` with category `'other'`, losing anything performance-specific (venue, audience size, jury/audition process) |
| Athletics | `sports_experiences` (`supabase/migrations/0026_sports.sql`, `is_captain`, `team_entity_id`) | Already a dedicated, well-modeled table — mirrors the leadership pattern (`is_captain` alongside team_entity_id, not a free-text "role"). Not a gap. |

**Takeaway:** ORYN's schema is closer to complete than the mission brief assumes for academics,
research, sports, and standard extracurricular categories. The genuine, verified gaps are: (a) no
first-class home for arts performance/exhibition, (b) no first-class home for non-research
publication or presentation, (c) no `activity_category` value for entrepreneurship, and (d) no
required link between a competition *entered* (`activities`) and its *result* (`awards`). All four
are carried into `10-open-questions.md` as concrete, scoped proposals — not silently absorbed.

---

## 2. Role taxonomy — what was the student's relationship to the activity?

Mission-requested roles: participant, member, team member, founder, co-founder, president,
captain, research assistant, independent researcher, intern, volunteer, organizer, mentor.

**What's shipped today:** no table has a structured `role` field. What exists instead is a set of
per-table proxies:

- `activities.is_leadership_role` (boolean) + `activities.organization_scope` (free text) — role is
  inferred from a flag plus prose, not stored as a value.
- `sports_experiences.is_captain` (boolean) — same pattern, sport-specific.
- `work_experiences.employment_type` — distinguishes *kind of employment*, not role-within-it.
- `research_experiences.independence_level` (free text) — closest thing to a role field, but
  unstructured.

**RULE-COUNSEL-001:** Role is not a leadership/non-leadership binary. "Founder," "president of an
existing 40-year-old club," "team member," and "research assistant" are four different evidence
patterns that a single `is_leadership_role: true/false` boolean cannot distinguish, and *founding*
specifically is evidence for **two** dimensions at once (leadership *and* entrepreneurship) in a
way a pure leadership flag under-credits. Until role is a structured field, treat
`organization_scope` free text as a weak, unverified signal for founder-vs-joined status — never
as a confirmed fact the way a boolean column would be.

**RULE-COUNSEL-002:** "Captain," "president," and "founder" are titles, not evidence of
substance — this generalizes the principle `lib/scoring/dimensions/leadership.ts` already encodes
correctly for the `leadership` dimension (title alone contributes a small, capped bonus; duration,
scope, and people-led carry the real weight) to *every* dimension a role touches, including
`execution_project_depth` and `entrepreneurship`. A "founder" with no `live_url`/`repo_url`/
`users_reached`/`revenue_amount` on the linked project is exactly the "President" case from
`leadership.ts`'s own doc-comment, restated for a different dimension.

**Mentor / organizer** are the two mission-requested roles with no shipped analogue anywhere
(a student who mentors younger students, or organizes an event/competition rather than competing
in it, has no field to say so — they'd be entered as a generic `activities` row indistinguishable
from participation). Carried to `10-open-questions.md`.

---

## 3. Time / duration semantics

Mission-requested fields: start date, end date, ongoing, hours/week, weeks/year, duration,
academic year, grade level at time of activity.

**Shipped:** `start_date`, `end_date`, `ongoing`, `hours_per_week`, `weeks_per_year` exist
identically across `activities`, `awards` (dates only), `research_experiences`,
`volunteering_experiences`, `work_experiences`. `monthsBetween()` (`lib/scoring/math.ts`, used by
`leadership.ts`) already derives duration from `start_date`/`end_date`/a reference date — duration
itself is not a gap.

**RULE-COUNSEL-003 — false precision on `hours_per_week` × `weeks_per_year`:** These two fields
multiply naturally into an implied total-hours figure, and that arithmetic is tempting to score
directly. Don't. Both fields are self-reported estimates with no upper sanity bound in the schema
(nothing stops `hours_per_week = 40` on a school-term club). Treat the product as a coarse
*ordering* signal (roughly none / light / moderate / substantial commitment) rather than a precise
quantity, and never display it as a computed total-hours figure back to the student or a counselor
as if it were measured, not estimated.

**RULE-COUNSEL-004 — the one genuinely missing field: grade level at time of activity.** No table
captures the student's grade/year level when an activity happened — only calendar dates. This
matters because the *same* activity means something different at different ages (see
`03-recommendation-timing.md` in full), and because a student's `graduation_year`
(`profiles`) lets ORYN derive *approximate* grade level from `start_date` only if the curriculum's
grade-to-age mapping is known and consistent — which it often isn't across the countries in scope
(a "10th grade" US student and a "Year 11" UK student are not the same age-stage, and Turkish
`lise` numbering differs again). Deriving grade-at-time-of-activity from dates is an **unsafe
inference** across curricula (see `08-unsafe-inference-rules.md`) unless the curriculum's specific
grade/age mapping is encoded — it is not, today. This is the single highest-value schema gap this
research identified; detailed in `10-open-questions.md`.

**"Ongoing" needs a freshness signal, not just a boolean.** `ongoing = true` is a point-in-time
claim that goes stale — nothing re-confirms it. An activity marked ongoing with `updated_at` from
eight months ago is a different confidence tier than one confirmed last week. See
`05-redundancy-saturation.md` and `execution_project_depth` below (§8.9).

---

## 4. Output / artifact taxonomy

Mission-requested outputs: paper, poster, prototype, software, portfolio, exhibition,
presentation, business/product, social-impact outcome.

**Shipped, and genuinely good:** `research_experiences.output_type` — a real enum (`none`,
`presentation`, `poster`, `school_journal`, `preprint`, `peer_reviewed_publication`, `other`), not
free text. This is the most precise piece of output modeling in the schema and should be the
*template* for fixing the gaps below, not replaced.

**Shipped, but loosely typed:** `projects` has `outcome_summary` (free text), `users_reached`,
`revenue_amount`, `repo_url`, `live_url` — enough to distinguish "shipped with a checkable
artifact" from "described only," but no `output_type` enum the way research has one. A prototype,
a piece of software, a business, and a social-impact outcome are all just "a project" today,
differentiated only by which optional fields happen to be filled in.

**Not shipped at all:** portfolio (as an artifact — e.g. a design/art portfolio), exhibition,
arts performance output. These have no field anywhere, matching the activity-taxonomy gap in §1.

**RULE-COUNSEL-005:** A URL field being populated (`repo_url`, `live_url`, `output_url`) is
evidence *an artifact exists and is checkable*, not evidence of its quality, reach, or reception —
ORYN can safely say "produced a checkable output" and must not infer "produced a *good*" one from
the URL's mere presence. Quality inference from an unvisited link is out of scope for any counselor
logic — verifying content at a URL is a human/AI-review task, not a scoring one, and is explicitly
not proposed anywhere in this package.

**RULE-COUNSEL-006:** Free-text `outcome_summary` describing impact ("reached thousands of
users," "went viral") is a claim, not a verified outcome, regardless of `evidence_status` — see §5.
`evidence_added` means a document was attached to *something* on this record, not that the specific
numeric claim in the description was checked against it.

---

## 5. Evidence / provenance model — the verification axis

**Shipped:** `evidence_status` (`self_reported` | `evidence_added` | `verified` |
`verification_rejected`), defined once (`0004_achievements.sql`) and reused identically across
every achievement table, plus `evidence_files` (polymorphic `linked_table`/`linked_id`,
`verification_status` reusing the same enum, `file_path` or `external_url`,
`uploaded_at`). Read the state machine precisely, because it is easy to over-trust:

- `self_reported` — the default. A text entry with no attached file or link.
- `evidence_added` — a file or URL has been attached. **This is a completeness state, not a trust
  state.** Nothing in the shipped pipeline reviews the attached document's content — `PHASE_STATUS.md`
  confirms evidence upload "moves `evidence_status` to `evidence_added` — never `verified`." An
  unrelated PDF attached to the wrong field would still read as `evidence_added`.
- `verified` — per `AGENTS.md` §11, this status must never be set merely because a file exists;
  it requires an actual verification process. As of this research pass, no verification workflow
  is visible in `lib/counselor/**` or the achievements pipeline — `verified` appears to be a
  reserved future state, not yet reachable in the product. Treat any `verified` row encountered
  as trustworthy *if* it occurs, but do not assume the pathway to reach it is exercised yet;
  confirm in `10-open-questions.md`'s follow-up rather than asserting it here as fact.
- `verification_rejected` — a verification attempt was made and failed. Distinct from
  `self_reported`: this is a *negative* signal (someone tried to verify and could not), not an
  absence of a signal. **RULE-COUNSEL-007:** `verification_rejected` must never be silently
  treated the same as `self_reported` in any downstream scoring — a rejected verification is worse
  evidence than no verification attempt, and collapsing the two loses that.

**The mission asks for a richer state set** (`student_reported` / `document_verified` /
`official_result` / `organizer_verified` / `school_verified` / `unknown`) than the shipped
four-value enum carries. Reconciling without proposing a breaking schema change: the shipped enum
answers *"has this been checked, and how did the check go"* (a workflow-state question); the
mission's richer list answers *"checked by whom, against what"* (a provenance-source question).
These are different axes, not competing versions of the same one. **Recommendation (non-binding,
detailed in `10-open-questions.md`):** the richer list is best added as an optional
`verifier_type` attribute on `evidence_files` (e.g. `self` | `document` | `organizer` |
`school` | `official_third_party`), layered *on top of* the existing `verification_status`, not
replacing it — additive and reversible, per the mission's own architecture principle. Until that
field exists, **RULE-COUNSEL-008:** never present an `evidence_added` row to a student or
counselor with language implying *who* confirmed it — the schema does not yet know.

---

## 6. The commitment / depth axis

Cuts across every dimension below. A single ladder, from weakest to strongest evidence pattern,
independent of *which* dimension the activity feeds:

1. **Exposure** — one-off or very short engagement (a single workshop, a one-day event, an
   initial visit). Weeks/months not applicable; `ongoing` false, short or absent duration.
2. **Participation** — recurring engagement over a defined period, not leading it. Regular
   attendance, `hours_per_week`/`weeks_per_year` populated, no `is_leadership_role`.
3. **Sustained commitment** — participation continuing across a substantial duration. This
   research does not hardcode a universal threshold (e.g. "6 months") as a bright line — rigor
   varies by activity type and by how much of a school year is realistically available (see
   `04-profile-gap-framework.md`'s context model) — but treats "spans at least one full
   academic term with regular hours" as the working reference point pending real usage data.
4. **Contribution** — identifiable output or deliverable within the activity, not just attendance
   (ran a specific project within a larger club, authored a specific report).
5. **Leadership** — formal or de facto responsibility for others or for outcomes. Maps directly to
   `is_leadership_role`/`is_captain` plus the substance fields `leadership.ts` already weighs
   (duration, people led, scope).
6. **Creation** — originated the activity/organization/project rather than joining an existing
   one. Strongest tier; see §2's founder/co-founder discussion. Not mutually exclusive with
   leadership — creation is usually also leadership, but the reverse isn't true (an elected
   president of an existing club has leadership without creation).

**RULE-COUNSEL-009:** These six levels are not a single numeric scale to sum or average across a
profile — a student with one "creation"-level activity and nothing else is not equivalent to a
student with six "exposure"-level activities, even if some naive point-summation would make them
land near the same total. Depth-axis reads must stay per-activity, feeding into whichever
dimension(s) that activity addresses, never flattened into one cross-profile "commitment score."

---

## 7. The nine dimensions

Each entry: definition, what legitimately feeds it (mapped to real schema), the naive-but-wrong
read, its specific depth ladder, and rules minted. Cross-references to `lib/scoring/dimensions/`
scorers are noted where one is shipped.

### 7.1 `academics`

**Definition:** sustained, verifiable academic performance and rigor relative to what was actually
available to the student — not a raw grade number in isolation.

**Feeds it:** `education_records`, `courses` (curriculum, level), `grades`, `test_scores`.

**Naive-but-wrong read:** comparing raw grade numbers across curricula without normalization
(`AGENTS.md` §7 already prohibits this explicitly for university-side comparisons; the same
prohibition applies student-side). Also: course *enrollment* with no recorded grade reading as
either strength or weakness — it's a completeness gap, not a performance data point.

**Depth ladder:** single-year snapshot → multi-year rigor trajectory (is course difficulty
increasing over time, not just grades staying flat) → external validation (standardized test,
external exam board result) confirms internally-reported grades independently.

**RULE-COUNSEL-010:** Never numerically compare or combine grades from two different grading
scales without an explicit normalization step; if normalization metadata is absent, the comparison
is `unknown`, not an average or a midpoint guess.

**RULE-COUNSEL-011:** A course record with no grade is missing data, not a zero — must never
silently lower a computed score the way an actual low grade would.

### 7.2 `intellectual_curiosity`

**Definition:** evidence the student pursues understanding beyond what's required — self-directed,
not compliance-driven.

**Feeds it:** `academic_program`/`online_program`/`conference` participation,
self-directed projects with no external grading requirement behind them, research exposure short
of full independent research (§7.4), `student_interests` *only when linked to instantiating
evidence*.

**Naive-but-wrong read:** a long `student_interests` list with no corresponding activity is a
stated preference, not a developmental signal — and attending a selective summer program is
retroactively weak evidence the *underlying* curiosity predates the program; the selection process
that got them in is a separate signal (achievement) from the curiosity that (maybe) motivated
applying.

**Depth ladder:** stated interest (no evidence) → exposure (attended, no follow-through) →
sustained self-directed pursuit (reading, small independent projects) → originated inquiry (asked
an own question and pursued it, e.g. an EPQ-shaped independent project regardless of which table
it happens to be filed under).

**RULE-COUNSEL-012:** A `student_interests` row with zero linked activity/project/research
evidence must never by itself raise this dimension's score — see also `04-profile-gap-framework.md`
on why a stated-but-unactioned interest is informative for *goal tracking*, not for *strength
scoring*.

### 7.3 `leadership`

**Definition:** genuine responsibility for people or outcomes — substance, not title.

**Feeds it:** `activities` where `is_leadership_role = true`, weighted by `people_led`,
`organization_scope`, and duration. Already scored (`lib/scoring/dimensions/leadership.ts`):
title contributes a small, capped bonus (3 of up to ~56 raw points before capping/diminishing);
duration up to 12; people-led log-scaled up to 10; scope +4; diminishing returns after the third
leadership role at a 0.4 factor, so five shallow roles cannot outscore one substantive one. **This
already correctly implements the mission's explicit "do not infer leadership from title alone"
requirement** — worth stating plainly so a future session doesn't "fix" something that isn't
broken.

**Naive-but-wrong read (the part that's *not* yet covered):** founding vs. joining an existing
structure is not distinguished (§2) — a founder of a brand-new club and the third successive
elected president of a 40-year-old one can currently produce similar `leadership.ts` inputs if
duration/scope/people-led happen to match, even though founding is the strictly rarer, harder-to-
fake signal.

**Depth ladder:** member → delegated task ownership within a group → elected/appointed formal role
→ founding role. (This is the commitment axis, §6, specialized for this dimension.)

**RULE-COUNSEL-013** *(restates existing code behavior as an explicit rule so it survives future
edits)*: title text alone is capped near-zero contribution; duration, people led, and
organizational scope carry leadership's real weight. Any future change to
`lib/scoring/dimensions/leadership.ts` that increases the title-alone weight should be treated as
a regression against this rule, not a neutral tuning change.

**RULE-COUNSEL-014:** Founding status is currently unrecoverable from the schema
(`organization_scope` is free text) — until a structured role field exists (§2), do not attempt to
infer founder-vs-joined from description text with any confidence above `low`.

### 7.4 `research`

**Definition:** structured inquiry — exposure, methodology, and independence are three different
things that happen to often correlate but must be read separately.

**Feeds it:** `research_experiences` (the best-modeled table in the schema: `mentor_name`,
`field`, `methodology`, `independence_level`, `output_type`).

**Naive-but-wrong read:** "did research" claimed with no methodology or output populated reading
the same as a fully described independent project. The mission is explicit that **publication
should not be required** for a strong score — but "no output yet, project still active,"
"concluded with a defined next step," and "concluded with nothing produced" are three different
confidence states current schema cannot distinguish (only `output_type = 'none'` vs. not, with no
"why none" signal).

**Depth ladder:** attended/shadowed (exposure) → assisted with data collection under close
direction (structured exposure) → owned a sub-question under mentorship (guided independent) →
owned the full question, design, and execution independently → presented or published the result.

**RULE-COUNSEL-015:** Read `independence_level` (free text today) as a genuine gate on how strongly
a `research_experiences` row feeds this dimension, not as decorative detail — "shadowed a lab" and
"designed and ran an independent study with remote mentor check-ins" are different evidence tiers
even when every other field (duration, hours) matches.

**RULE-COUNSEL-016:** `output_type = 'none'` is not automatically a weaker row than one with an
output — an active, well-described, in-progress independent research effort can be stronger
evidence than a shallow effort that happened to produce a poster. Do not let output-type presence
alone dominate this dimension's read; independence and methodology matter at least as much.

### 7.5 `entrepreneurship`

**Definition:** founding and executing, not ideating.

**Feeds it:** `projects` with `revenue_amount`/`users_reached`/`live_url`/`repo_url`, founder/
co-founder roles on `activities`.

**Naive-but-wrong read:** an idea or plan with no execution artifact scoring the same as a shipped
one — this is spec Phase 6.4's "reward execution more than idea creation" applied literally.
Equally naive: reading `revenue_amount` as a magnitude to rank students by, rather than as one
binary-ish corroboration that real execution occurred (see §4, RULE-COUNSEL-006).

**Depth ladder:** idea only → prototype/MVP → live with any users → live with measurable traction
(repeat users, revenue, growth over time, not a single snapshot) → sustained across multiple
periods, not shut down the moment a grade was received.

**RULE-COUNSEL-017:** An entrepreneurship-flavored project with none of `live_url`, `repo_url`,
`users_reached`, `revenue_amount` populated is a plan, not executed entrepreneurship, regardless of
description language.

**RULE-COUNSEL-018:** `revenue_amount` and `users_reached` are corroborating signals that
execution happened, not magnitude-scored outcomes to rank profiles by — a $50 and a $5,000 project
both clear the "this was real" bar; treating the raw number as proportionally more score is the
same false-precision risk the mission warns against for impact claims generally (§ "Impact /
output" in the mission brief).

### 7.6 `community_impact`

**Definition:** sustained service to others — depth and relationship, not hours totals.

**Feeds it:** `volunteering_experiences` (`cause_area`, `hours_per_week`, `weeks_per_year`),
`community_org` activity category.

**Naive-but-wrong read:** summing hours across many unrelated one-off events as if equivalent to
the same total concentrated in one cause. NACAC-aligned holistic-review guidance treats
depth/consistency as more informative than breadth for this exact category (see `sources.json`
entry on NACAC holistic review, `confidence: medium` — general finding, not this-specific-claim
sourced). "People served" is a self-reported estimate in every case current schema can produce;
nothing corroborates it externally.

**Depth ladder:** one-off event → recurring but shallow (occasional shifts, no single-org
continuity) → sustained regular commitment to one cause/org → designed or led a service initiative
(overlaps `leadership`) → externally corroborated outcome (rare; flag confidence honestly when
absent, which is nearly always).

**RULE-COUNSEL-019:** Total volunteering hours summed across many unrelated one-off entries is a
weaker signal than the same total concentrated in one `cause_area`/organization — never rank two
students by raw summed hours alone.

**RULE-COUNSEL-020:** Beneficiary/"people served" counts are self-reported estimates regardless of
`evidence_status` — an attached document (`evidence_added`) confirms *a document exists*, not that
the specific number was independently checked. Never present such a figure without that qualifier.

### 7.7 `awards_distinction`

**Definition:** where a result landed on a recognition ladder, relative to the selectivity of what
it was measured against. Two independent axes, both currently compressed into one free-text
`level` field.

**Feeds it:** `awards` table.

**Naive-but-wrong read:** treating "award" as one tier. The mission is explicit that
participation/qualification/finalist/honorable-mention/award/winner/national/international
recognition are meaningfully different — full ladder built out in
`02-opportunity-development-mapping.md` (this is that document's central contribution; not
duplicated here). The second, easily-missed naive read: an award with no link back to the activity
or competition that produced it is unfalsifiable from ORYN's side — nothing to cross-check hours
invested or activity category against.

**Depth ladder:** *is* the recognition ladder (§ full treatment in doc 02) crossed with a
selectivity/scope axis (school / regional / national / international, and roughly how large the
entrant pool was).

**RULE-COUNSEL-021:** An award's strength depends on selectivity/scope *and* result-tier as two
independent facts — "national award" from an unspecified-size, unspecified-scope competition should
be read at `medium`, not `high`, confidence until scope is clarified, even though the word
"national" appears in the record.

**RULE-COUNSEL-022:** An `awards` row with no discoverable link to an originating `activities`
entry is a lower-context, harder-to-corroborate data point — treat with one confidence tier lower
than an equivalent award that does link back to a described activity.

### 7.8 `career_exploration`

**Definition:** purposeful investigation of a career direction — sustained focus, not breadth of
one-off exposure.

**Feeds it:** `work_experiences` (internships), `summer_program`/`conference`/`student_program`
activities, `career_goals`.

**Naive-but-wrong read:** counting distinct one-day "career taster" events as equivalent to one
sustained internship — mirrors the community_impact hours-totaling trap (§7.6) in a different
dimension. Separately: a `career_goals` row is a stated intention; nothing in the schema currently
links a goal to the activities/opportunities pursued because of it, so a goal's mere existence
(and age) says nothing about whether it's being acted on.

**Depth ladder:** one-off exposure event → multiple unrelated exposure events (breadth, still
shallow) → one sustained focused exploration (internship, multi-month shadowing) → career_goal
actively linked to concrete pursued actions over time.

**RULE-COUNSEL-023:** A `career_goals` row with no plausibly-connected activity, project, work
experience, or saved/applied opportunity is a stated intention, not a demonstrated exploration
pattern — its age (how long it's been "active") must never imply progress on its own.

**RULE-COUNSEL-024:** Count distinct *sustained* explorations, not total career-exposure event
attendance — several unrelated one-day events do not sum into the same signal as one focused,
multi-week-or-longer exploration.

### 7.9 `execution_project_depth`

**Definition:** cross-cutting by design (spec §6.4) — not *what* was attempted, but whether it was
finished and is checkable. The dimension that exists specifically to separate claims from shipped
reality.

**Feeds it:** `projects` primarily, plus any activity/research/entrepreneurship entry with a
describable, checkable output.

**Naive-but-wrong read:** `ongoing = true` with no `end_date`, no populated output field, and no
recent `updated_at` movement reading the same as an actively-progressing effort. Equally naive:
complexity claimed in free text ("built a machine learning model") counting the same with or
without a corroborating `repo_url`/`live_url` — for *this specific dimension*, description text is
close to the weakest possible evidence, precisely because the dimension's purpose is separating
claims from artifacts.

**Depth ladder:** idea/plan → in progress, no output yet → completed with a describable output →
completed with an externally checkable output (URL) → completed with evidence of external use
(users_reached; no generic "adoption" field exists beyond that one project-specific column — see
`10-open-questions.md`).

**RULE-COUNSEL-025:** An `ongoing = true` record with no `end_date`, no populated output field, and
no recent `updated_at` movement should be read as *stale*, not as *actively strong* — evidence of
execution decays when nothing has changed for a long time with no shipped result. (This research
does not compute a specific staleness threshold or decay function — flagged as a scoring-logic
follow-up in `10-open-questions.md`, consistent with `05-redundancy-saturation.md`'s similar
treatment of `REDUNDANCY_DECAY`.)

**RULE-COUNSEL-026:** A complexity or impact claim in free-text description carries materially less
weight for this dimension than the same claim accompanied by a corroborating URL — description is
a claim about evidence, not evidence.

---

## 8. External validation and two structural principles

*(Added during reconciliation with a second session that independently researched this exact
document from a different angle — external admissions evidence and a full read of every
`lib/scoring/dimensions/*.ts` scorer, vs. this document's schema/migration-first grounding. Both
versions are preserved in git history — this session's at the commit noted in
`docs/handoffs/research-counseling-intelligence.md`, the other's at `51b1978`. This section folds
in what that research verified and added that this document didn't already cover, rather than
leaving two competing documents for the founder to manually diff. Every scorer file claim below
was independently re-verified against `lib/scoring/dimensions/*.ts` by this session before being
stated here — not copied on trust.)*

**The 9-dimension taxonomy is independently corroborated by the outside evidence, not just
internally consistent.** The Common Data Set (the shared reporting template ~1,700 US
institutions use) rates 19 admission factors across academic and nonacademic categories; NACAC's
State of College Admission survey ranks curriculum rigor and grades above every other factor,
with extracurriculars/essays/recommendations providing supporting context. MIT's own official
admissions page states "We don't expect applicants to do a million things. Choose quality over
quantity" and names eight applicant qualities (mission alignment, collaborative spirit,
initiative, risk-taking, hands-on creativity, intensity/curiosity, balance, community character) —
independently confirmed by direct fetch of `mitadmissions.org/apply/process/what-we-look-for/`
during this reconciliation (`sources.json` SRC-007). None of this argues for a 10th dimension; it
argues the existing 9 are well-chosen. Two structural principles from that research are genuinely
additive to what this document had:

**Principle 1 — breadth dimensions vs. depth dimensions is a real, code-verified split, not just
an intuition.** `intellectual_curiosity.ts` and `career_exploration.ts` both explicitly skip the
diminishing-returns aggregator (`scoreCommitments`) that every other dimension uses — by design,
per their own doc-comments, because breadth (distinct subjects, distinct activity categories) is
the thing being rewarded, so more distinct exploration should never be penalized the way five
shallow *commitments* would be under a depth dimension. **RULE-COUNSEL-901:** a counselor must be
able to recommend an exploratory/breadth-building action without treating it as inherently
lower-value than a depth-building one — which one is higher-value depends on whether the student
has explored enough yet to know what to commit to (`03-recommendation-timing.md`'s territory),
not on a fixed hierarchy where depth always outranks breadth.

**Principle 2 — "major/field alignment" is a relevance axis, not a development dimension, and the
codebase already correctly keeps it separate.** `fieldAlignment` (`lib/counselor/config.ts`
scoring weights) and `relevanceScore` (`lib/opportunities/matching.ts`) already implement this as
a distinct axis from the 9 `ProfileDimension` scores. **RULE-COUNSEL-902:** never fold
field/major alignment into the 9-dimension taxonomy as if it answered "how strong is this
evidence" — it answers "how well does this evidence match what the student says they want," a
different question. A strong research program in an unrelated field is still genuine `research`
dimension evidence, just poorly targeted; both facts should reach the counselor, not be merged
into one number.

**Two verified, code-confirmed data points worth citing precisely** (both independently re-read
by this session in `lib/scoring/dimensions/`, not taken on trust): `awards.ts` maps award level
text to points via regex tiers — international/global/world → 15, national → 11,
state/regional/provincial → 7, school/local/district → 3, unrecognized wording → 4 default (never
punished for phrasing) — a concrete illustration of this document's own RULE-COUNSEL-021
(selectivity/scope as an independent axis), now with the actual shipped numbers.
`entrepreneurship.ts` scores only the subset of `projects` where `role` matches `/founder/i` or
`revenue_amount` is set — meaning one real venture legitimately scores against both
`entrepreneurship` and `execution_project_depth` at once through the *same underlying row*. **This
is correct modeling, not double-counting** — the redundancy unit should be the dimension, not the
underlying activity, since a single piece of evidence can genuinely demonstrate two different
things. Directly relevant to whoever writes `05-redundancy-saturation.md`.

**One gap this document's schema-first approach missed and the other session's scorer-first
approach caught:** neither `writing/communication` nor `creative production` (non-technical
creative work — writing, art, design, music, film) has any dedicated evidence path anywhere in
the codebase — not a table (this document's §1 finding), *and* not a scoring modifier in any
scorer (the other session's finding, reading the code itself rather than the schema). Both
independently point at the same real gap from different directions, which raises confidence it's
genuine rather than an artifact of either session's method. Carried forward for whichever session
writes `10-open-questions.md`.

*(New rules this section mints — RULE-COUNSEL-901/902 above — are deliberately numbered in a
900-range block reserved for this reconciliation pass, to avoid colliding with the other session's
own new worktree, which mints forward from `034`. See `data/research/counseling-intelligence/rules.json`.)*

## 9. Cross-dimension evidence matrix

Which dimensions a given schema table's rows can plausibly feed — not exclusively (most rows feed
more than one dimension; a founding leadership role feeds both `leadership` and
`entrepreneurship`, an independent research project with a live web tool feeds both `research` and
`execution_project_depth`):

| Table | Primary dimension(s) | Secondary, when evidence supports it |
|---|---|---|
| `education_records`, `courses`, `grades`, `test_scores` | `academics` | `intellectual_curiosity` (unusually rigorous elective choices) |
| `activities` (general) | varies by `activity_category` | `leadership` (if `is_leadership_role`) |
| `activities` (`is_leadership_role = true`) | `leadership` | `entrepreneurship` (if founding), `community_impact` (if a service org) |
| `awards` | `awards_distinction` | the dimension of the underlying activity, when linkable |
| `certifications` | `academics` or `career_exploration`, depending on field | — |
| `projects` | `execution_project_depth` | `entrepreneurship` (if product-shaped), `research` (if research-shaped and not filed under `research_experiences`) |
| `research_experiences` | `research` | `intellectual_curiosity`, `execution_project_depth` (if it has output) |
| `volunteering_experiences` | `community_impact` | `leadership` (if organizing/leading the effort) |
| `work_experiences` | `career_exploration` | `execution_project_depth` (internship with real deliverables), `academics` (rare, e.g. research-lab technician role) |
| `sports_experiences` | *(not currently a scored dimension — see below)* | `leadership` (if `is_captain`) |
| `student_interests` | none directly (§7.2 RULE-COUNSEL-012) | signals *where to look* for corroborating evidence elsewhere |
| `career_goals` | none directly (§7.8 RULE-COUNSEL-023) | same — a lens for interpreting other tables, not a scoring input itself |

**Observation, not a rule:** `sports_experiences` has no clean home in the current 9-dimension
taxonomy — athletics maps weakly to `community_impact` (team contribution) or `leadership`
(captaincy) but a purely athletic achievement with no leadership/service angle currently has
nowhere to register at all. This is either a real gap or an intentional scope decision (athletics
may simply not be a counseling-relevant signal for academic admissions in most target
geographies except as a minor holistic-review contextual note) — flagged as a genuine open
question, not resolved here. See `10-open-questions.md`.

---

## Rules minted in this document

RULE-COUNSEL-001 through RULE-COUNSEL-026 (26 rules), plus RULE-COUNSEL-901/902 added during the
reconciliation pass in §8. Full registry, cross-referenced with source document section and any
supporting `sources.json` entries, lives in `data/research/counseling-intelligence/rules.json`.
