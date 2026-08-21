# Counselor-Loop QA Report — Deterministic Engines, 4 Personas

**Assignment:** ORYN multi-agent coordination ("Org Leader"), 2026-08-21, under founder-delegated
coordination authority. Branch: `oryn/counselor-loop-qa` (isolated worktree). No schema/migration/
production-DB/merge touched — this is read + execute + report only.

**What was actually run, and what wasn't:** `scripts/qa-counselor-loop.ts` (committed alongside this
report) constructs 4 synthetic, hand-built personas in-memory and calls `computeCareerProfile`,
`computeCompleteness`, `computeAdmissionOutlook`, `computeOpportunityMatch`, and
`evaluateRequirement` directly — no database, no network, no AI. Full raw console output is in
`counselor-loop-qa-raw-output.txt` alongside this file. **Not run**: anything requiring
`ANTHROPIC_API_KEY` (advisor chat, weekly-plan generation, CV extraction) — confirmed empty per the
assignment, out of scope for this pass entirely, not attempted.

**Opportunity data used for matching is synthetic**, not a live pull from the `opportunities`
table — this session has no database credentials. 4 hand-built opportunity fixtures, one per major
category, with deliberately varied `eligibleCountries`/`fields` to exercise the matching logic.
Treat the *matching logic's behavior* as verified; the *specific opportunities* as illustrative only.

## Personas

Grounded in `AGENTS.md` Phase 49's own 4 archetypes, with Persona A made Turkey/YKS-track
specifically (per the assignment's instruction, and because the counseling-intelligence research
lane's own top finding this month is that this exact profile shape is where geography-blindness
would do the most damage). Full field-level construction is in the script; summarized:

- **A** — 16yo, Turkey, Turkish national curriculum, 92/100 GPA, no AP/IB/A-level courses (not
  offered on this track), one TYT practice score, one unremarkable club, nothing else.
- **B** — US, solid-not-exceptional academics, an 18-month founder-led venture with real
  revenue/users, an elected leadership role with real scope (40 people, 1,200-student school),
  zero research. This is `AGENTS.md`'s own Phase 8.3/39 worked example, reconstructed as data.
- **C** — UK, 3 A-levels, a 10-month mentored research project with real methodology and a poster
  output, an international-tier award, deliberately thin leadership/community_impact.
- **D** — 14yo, one course, one club, otherwise empty. Tests graceful degradation only.

## Defects found, most important first

### 1. `computeAdmissionOutlook` has no geography/admissions-system input at all — `lib/admissions/outlook.ts:60-87`

**The single highest-value finding, and it is a defect in running code, not just a documented gap.**
The function signature (`AdmissionOutlookInputs`, lines 33-40) takes exactly three fields:
`profileStrength`, `admissionRate`, `dataConfidence`. There is no parameter for target country,
admissions-system type, or anything the counseling-intelligence research package's own top finding
(RULE-COUNSEL-228, RULE-COUNSEL-242, and the peer branch's `17-dimension-weighting-by-target.md`)
says the outlook *must* condition on. Every persona, run against every selectivity tier including
"unknown," returned `extreme_reach` — for Persona A specifically, a 92/100-GPA Turkey-track
student would, under YKS, be evaluated almost entirely on exam score with a small grades-linked
OBP component (already established, sourced, and cross-verified this same month) — not on this
9-dimension "profile strength" construct at all. The function cannot currently produce anything
other than a US-holistic-style read for any student, regardless of where they're applying.

**Concrete failure scenario:** A Turkey-YKS-track student with a genuinely strong TYT/AYT practice
score and a 92/100 GPA is told `extreme_reach` for a moderately-selective Turkish state university,
when the actual determining fact (their exam placement rank) isn't represented anywhere in the
inputs this function accepts.

### 2. `scoreAcademics`'s rigor and GPA signals only recognize Anglo-American/IB shapes — `lib/scoring/dimensions/academics.ts:5-14, 36-45`

Two related gaps, both confirmed by real persona runs:

- **Rigor** (`RIGOR_WEIGHT`, lines 5-14): only `ap`/`ib_hl`/`a_level`/`dual_enrollment` score
  weight 1, `ib_sl` scores 0.75, `honors` scores 0.5. `regular` and `other` score 0. Persona A
  (Turkish national curriculum) has no possible way to earn `course_rigor` points at all — the
  `CourseLevel` enum itself has no value representing rigor *within* a non-Anglo-American/IB
  curriculum (e.g. a Turkish Fen Lisesi's advanced track). Result: `course_rigor` contributed 0 of
  a possible 35 points to Persona A's academics score, not because the student lacks rigor, but
  because the schema has no way to record it for this curriculum.
- **GPA** (lines 36-45): reads only `educationRecords[].overall_gpa`/`gpa_scale` — never
  `courses[].grade_value`/`grade_scale`, despite `Course` having those fields. Persona C (UK
  A-level, no single "GPA" reported — realistic, since UK students don't typically have one) got
  `gpaPoints = 0` out of 45 purely because the scorer never looks at per-course grades, which is
  where a UK student's actual, real academic signal (predicted/achieved A-level grades) would live.
  Persona C's `academics` score of 15/100 is a direct, measurable consequence.

**Failure scenario:** any student on a curriculum track without a single reported GPA and without
AP/IB/A-level coursework gets an academics score built almost entirely from `testing_presence`
(max 20 points) — structurally incapable of reflecting real rigor for a large share of ORYN's
stated non-US target geography.

### 3. `computeRelevanceScore`'s substring matching produces false-positive matches — `lib/opportunities/matching.ts:126-130`

```
const overlapCount = interests.filter((interest) =>
  fields.some((field) => field.includes(interest) || interest.includes(field))
).length;
```

**Concrete failure scenario, reproduced live:** Persona A has interest `"Computer Science"`. A
US Chemistry Olympiad opportunity has `fields: ["chemistry", "science"]`. Neither field is
chemistry-related to "Computer Science" in any real sense, but `"computer science".includes("science")`
is `true` — the substring check matches, `overlapCount = 1`, `relevanceScore = (1/1)*100 = 100`. The
harness's actual output: `US Chemistry Olympiad ... relevance=100`, a maximal false-positive score.
This will affect **any** "X Science" interest (Computer Science, Data Science, Political Science,
Environmental Science, ...) against **any** opportunity merely tagged `"science"`, regardless of
subject match. Substring containment is the wrong comparison for this; it needs word-boundary or
exact-token matching.

### 4. "Weakest 3 dimensions" tie-breaking is array-declaration-order, not semantic — `lib/scoring/index.ts:19-29` (`DIMENSION_SCORERS` order) composed with any "sort by score, take bottom N" consumer

Not a bug in one function alone, but a real composition risk: for a sparse profile, many
dimensions legitimately tie at score 0 (Persona A: 6 of 9 dimensions were exactly 0; Persona D:
7 of 9). Any code that sorts ascending and takes the bottom N (as this QA harness's own
`weakestDimensions` computation does, and as the real "biggest gap" UI almost certainly does too)
will silently prefer whichever dimensions happen to appear earlier in `DIMENSION_SCORERS`
(`academics, intellectual_curiosity, leadership, research, entrepreneurship, community_impact,
awards_distinction, career_exploration, execution_project_depth`) — not any dimension actually
more or less deserving of "gap" status. For Persona A this meant `leadership` narrowly "won" the
tie over `awards_distinction`, purely by array position, despite both being equally and genuinely
zero. Whoever implements gap-selection for real should use a documented, deliberate tie-break
(e.g. stated goal alignment, or explicit "insufficient data" framing below a confidence floor), not
inherit array order by accident.

### 5. Unweighted 9-dimension average likely under-represents realistically-focused strong students — `lib/scoring/index.ts:46`

`overallScore = clampScore(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)` —
a flat average across all 9. Persona B (the founder's *own* Phase 8.3/39 worked example — a
genuinely strong, focused profile: student council president over 1,200 students, an 18-month
venture with real revenue) scored `academics=66, leadership=29, entrepreneurship=30,
execution=35`, but an **overall of 21**, because the same average also includes `research=0,
awards_distinction=0, career_exploration=4` at full weight. `AGENTS.md`'s own dashboard mockup
(Phase 7) shows "Career Profile: 77" as an illustrative *good* score. No real student is likely to
have deep, populated evidence in all 9 dimensions simultaneously (the product spec itself expects
students to specialize — that's the whole premise of gap-finding). This isn't necessarily "wrong,"
but it's a real design-behavior gap worth the founder's attention: as built, `overallScore` will
read as surprisingly low for exactly the kind of focused, strong profile the product's own
example imagines, unless something downstream (not in this pass's scope) reweights or contextualizes
it before display.

## What worked correctly (confirmed, not assumed)

- **No crashes on sparse data.** Persona D (14yo, one course, one club) ran cleanly through every
  engine, returned low-but-sane numbers, no exceptions, no NaN/undefined leaking into output.
- **Cross-curriculum GPA comparison correctly refuses to convert.** `evaluateRequirement` against
  Persona A's 92/100 GPA and a 4.0-scale rule returned `needs_manual_review`, not a fabricated
  numeric conversion — exactly the behavior the code's own comment (`evaluate.ts:100-106`) commits
  to, confirmed by actually running it, not just reading the comment.
- **Opportunity eligibility country-gating works**, including in both directions (Persona A
  correctly excluded from a US-only internship; Persona B and C correctly excluded from
  country-restricted opportunities outside their own).
- **Research scoring genuinely doesn't require publication** — Persona C's `research=30` came from
  duration + methodology + mentor + independence bonuses with `output_type` only `"poster"`, never
  reaching for the `peer_reviewed_publication` bonus tier, matching `AGENTS.md` Phase 6.5's stated
  intent and the code's own comment.

## Explicitly out of scope for this pass (not tested, not claimed working)

- Advisor chat, weekly-plan generation, CV extraction, essay outlines, or anything else requiring
  `ANTHROPIC_API_KEY` — confirmed empty, not attempted, not inferred to work or not work.
- `lib/counselor/**` (the `do`/`consider`/`deprioritize`/`avoid_for_now` recommendation logic,
  `CATEGORY_DIMENSIONS`-consuming candidate ranking) — outside the assigned file list; the
  dimension *inputs* to that layer are now verified, the layer itself is not.
- Anything requiring the live `opportunities`/`profile_scores`/other tables — no DB credentials
  this session; all inputs here are synthetic fixtures, not the real rows the Org Leader's own
  earlier count (`profile_scores = 0`, etc.) referred to.
- The `isSameCountry`/`COUNTRY_ALIASES` Türkiye↔Turkey bridge — code-reviewed, not stress-tested,
  since every fixture in this pass used consistent spelling. A live profile is already on record
  (per the code's own comment, `matching.ts:32-35`) as having hit this with `country = "Türkiye"`.

## Files in this branch

- `scripts/qa-counselor-loop.ts` — the harness, self-contained, safe to re-run (`npx tsx
  scripts/qa-counselor-loop.ts`), no side effects.
- `docs/handoffs/counselor-loop-qa-raw-output.txt` — full unedited console output this report is
  drawn from.
- This file.
