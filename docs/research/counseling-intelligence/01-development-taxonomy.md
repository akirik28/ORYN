# 01 — Student Development Taxonomy

**Answers:** What dimensions of student development are actually meaningful for counseling, and
how do they map onto the 9 shipped `ProfileDimension` values?

**Binding constraint (see `00-overview.md`):** this document reuses `ProfileDimension` exactly as
shipped (`types/database.ts:65`) — `academics`, `intellectual_curiosity`, `leadership`, `research`,
`entrepreneurship`, `community_impact`, `awards_distinction`, `career_exploration`,
`execution_project_depth`. It proposes **zero new top-level dimensions**. Where research surfaces a
distinction the current taxonomy can't express, it is written up as a **sub-facet** — an evidence
attribute a future scorer could weigh — never a schema change.

---

## 1. Why a "development taxonomy" is a distinct question from "a scoring formula"

`lib/scoring/dimensions/*.ts` already computes a 0–100 score per dimension from structured facts.
That is a **measurement** question (how do we turn stored facts into a number). This document
answers a prior, **conceptual** question: what is each dimension actually trying to capture, what
does strength in it look like at different ages, and where do real students' lives blur the
boundaries between dimensions. Counselor Core's candidate/ranking logic consumes the *scores*
`lib/scoring` already produces — it does not need this document to run. What this document is for
is the parts of Counselor Core that are still templated English (`lib/counselor/evidence.ts`'s
`why[]` strings) and the parts that are still open questions (how `candidates.ts` might eventually
reason about "deepen an existing project," explicitly out of scope per
`docs/counselor-core-plan.md` §6) — both need a shared, written-down understanding of what each
dimension *means*, not just how it's scored.

## 2. The nine dimensions, what each actually measures, and its sub-facets

For each dimension: **construct** (plain-English definition), **what over-counts it today**
(a known false-positive pattern worth a future scorer refinement, not a claim the current scorer is
wrong), **sub-facets** (attributes within the dimension a future evidence model could distinguish),
and **cross-dimension overlap** (where a single real activity legitimately feeds more than one
dimension — expected, not a bug, per `lib/scoring/dimensions/leadership.ts`'s own existing pattern
of combining role scope + people led + duration + selectivity + impact into one score).

### 2.1 `academics`

**Construct:** demonstrated command of school-level subject material — grades, course rigor
relative to what was available, standardized testing where present, and consistency over time.

**Sub-facets:** absolute performance vs. *rigor-adjusted* performance (a B+ in the most advanced
track available at a student's school is a different signal than a B+ in a standard track — this
is already partially handled by `CourseLevel` in `types/database.ts`, e.g. `ap`/`ib_hl`/
`dual_enrollment` vs. `regular`); trajectory (improving vs. flat vs. declining); breadth across
subjects vs. depth in a declared interest area.

**Over-counting risk:** treating a single strong test score as equivalent to sustained multi-year
rigor. UCAS's own official guidance to applicants is explicit that admissions readers want
"wider reading" and sustained subject engagement, not a single credential — see
`docs/research/counseling-intelligence/03-recommendation-timing.md` for the sourced detail
[S-UCAS-PS].

**Cross-dimension overlap:** a rigorous independent-study course can also feed
`intellectual_curiosity` or `research` depending on whether it was self-directed and produced
output.

### 2.2 `intellectual_curiosity`

**Construct:** self-directed engagement with ideas beyond what is assigned — reading, independent
projects, online coursework, competitions entered for interest rather than requirement, exploring
a field before committing to it.

**Sub-facets:** *breadth of exploration* (sampling several fields, valuable especially before
grade 10–11) vs. *depth of follow-through* (staying with one thread long enough to produce
something); self-reported interest vs. interest evidenced by time actually spent.

**Over-counting risk:** treating stated interest ("I love biology") as equivalent to demonstrated
engagement (an online course completed, a book list, a science-fair project). ORYN's own
`career_goals`/`interests` fields are exactly this kind of *stated*-interest data — the mission's
own non-negotiable that "field interest should be supported by increasingly meaningful evidence
when feasible" (`RULE-CAREER-004` in the parallel career-intelligence research package, if that
session has run; if not yet, this package independently arrives at the same rule — see
`08-unsafe-inference-rules.md`) applies directly here: a stated interest is a starting hypothesis
for exploration, not itself development evidence.

**Cross-dimension overlap:** the highest-overlap dimension in the taxonomy — almost any genuine
`research`, `entrepreneurship`, or `execution_project_depth` activity also demonstrates curiosity.
This is why `intellectual_curiosity` should be read as the "did they go looking, regardless of
where it led" signal, while the more specific dimensions capture "what did they do once they got
there."

### 2.3 `leadership`

**Construct:** responsibility for other people or an organization's direction — not a title alone.

**Sub-facets** (already anticipated almost verbatim by the founder spec §6.3 and implemented in
`lib/scoring/dimensions/leadership.ts`): scope of role, number of people led, duration held,
selectivity of the position (elected/competitive vs. default/only-applicant), organizational scope
(school club vs. multi-chapter/regional), and measurable outcome of the leadership itself (grew
membership, ran an event, changed how the organization operates) vs. the leadership being purely
titular.

**Over-counting risk:** the founder spec names this directly — "President" alone should not score
highly. The failure mode worth flagging for a future scorer refinement: a founder-title on a
club with 3 members and no activity record should not out-score a non-titled but substantial
organizing role (e.g., "coordinated logistics for a 200-person regional tournament" without
holding an elected title). Title is a weak proxy for the construct, not the construct itself.

**Cross-dimension overlap:** leadership that produces a concrete shipped result overlaps with
`execution_project_depth`; leadership of a venture with revenue or users overlaps with
`entrepreneurship`; leadership of a service organization overlaps with `community_impact`. A
single real activity legitimately contributing evidence to 2–3 dimensions is expected, not
double-counting to avoid — each dimension is measuring a different facet of the same activity.

### 2.4 `research`

**Construct:** exposure to and execution of a research process — asking a scoped question,
choosing a method, working with or generating data/evidence, and producing a written or presented
output.

**Sub-facets (the single most important refinement this package recommends, elaborated in
`06-major-family-evidence/`):** **exposure** (took a course, attended a program, read primary
literature) vs. **execution** (actually ran a small study or analysis) vs. **independence** (did it
under close instruction vs. designed their own question) vs. **output** (nothing external yet vs.
school-level presentation vs. `preprint`/`peer_reviewed_publication` — `ResearchOutputType` in
`types/database.ts` already encodes exactly this ladder). The founder spec (§6.5) is explicit that
publication should not be *required* for a strong score — this package agrees and treats
publication as the rare top rung of a ladder most legitimate research development happens well
below.

**Over-counting risk:** a large, real pattern in pre-university "research" — paid or unpaid
summer "research" programs that are substantively structured coursework or shadowing rather than
independent inquiry. This is not a reason to devalue such programs (they are often a legitimate and
valuable *exposure*-stage experience — see `06-major-family-evidence/`), but a future scorer should
not treat "attended a research program" and "co-authored a paper" as the same evidence strength.
`ResearchOutputType`'s existing ladder is exactly the right lever for this — a future refinement to
`lib/scoring/dimensions/research.ts` could weight by rung rather than presence/absence alone (out of
scope to implement here; flagged for the engineering handoff).

**Cross-dimension overlap:** research with a policy or social-impact angle can overlap
`community_impact`; research that becomes a startup overlaps `entrepreneurship`; a rigorous solo
research project overlaps `execution_project_depth`.

### 2.5 `entrepreneurship`

**Construct:** originating and driving a venture (commercial, nonprofit, or product) from idea
toward some real-world test — not merely "has business ideas."

**Sub-facets:** idea-stage (has a plan) vs. built (has a product/prototype) vs. tested (has users,
customers, or beneficiaries) vs. sustained (survived past the initial launch). Revenue is one
possible signal of "tested" but the founder spec is explicit that revenue should not be *required*
(§6.4 "revenue if relevant").

**Over-counting risk:** treating "started a club" as entrepreneurship-equivalent to founding a
venture with an external test. A student-run club is real `leadership`/`community_impact` evidence,
but it is not automatically `entrepreneurship` unless it involved originating a genuinely new
venture/product concept and testing it, per the founder spec's own worked example in Phase 39 ("do
not prioritize another club... unless this new club creates a unique measurable outcome").

**Cross-dimension overlap:** almost all entrepreneurship overlaps `execution_project_depth`
(shipping something) and often `leadership` (recruiting/leading a team); when it addresses a social
problem, `community_impact`.

### 2.6 `community_impact`

**Construct:** service to others beyond the student's own advancement — volunteering, mentoring,
organizing aid, sustained civic participation.

**Sub-facets:** one-off service hours vs. sustained commitment; direct service vs. organizing others
to serve; locally scoped vs. broader reach; self-initiated vs. joined an existing structure (both
are legitimate — the founder spec does not privilege founding over joining for this dimension the
way it does for `leadership`/`entrepreneurship`).

**Over-counting risk:** treating volunteer *hours logged* as a complete signal independent of what
was actually done. A large hours count from a single low-engagement recurring task (e.g., signing
in at a desk) is a different signal than fewer hours in a role with real responsibility. Existing
`cause_area` free-text (`lib/vocabularies/profile-fields.ts`) gives topical breadth; it does not
by itself give depth.

**Cross-dimension overlap:** service that involves organizing other volunteers overlaps
`leadership`; a service project that is also a sustained built initiative (e.g., founded a
recurring donation drive) overlaps `entrepreneurship`/`execution_project_depth`.

### 2.7 `awards_distinction`

**Construct:** external, third-party recognition of achievement — competition placements,
scholarships won, honors.

**Sub-facets:** the most important sub-facet is **selectivity/level**, which the codebase already
tracks as free-text suggestions (`AWARD_LEVEL_SUGGESTIONS`: School / Regional / State-Provincial /
National / International, `lib/vocabularies/profile-fields.ts:15`) — this ladder should anchor any
future weighting far more than the number of awards held. A second sub-facet: individual vs. team
award (team awards are real evidence but attenuated per-student, especially for large teams).

**Over-counting risk (the most consequential one in this whole taxonomy):** treating award *count*
as the signal rather than award *selectivity*. Five School-level certificates are not equivalent
to one State-level placement; this package's strong recommendation (elaborated in
`05-redundancy-saturation.md`) is that a future scorer refinement should weight by the
highest-selectivity tier achieved plus a mild bonus for breadth, not a linear count. This is also
the dimension most exposed to "self-reported, no evidence" risk (Phase 11 of the founder spec) —
`EvidenceStatus` (`self_reported` / `evidence_added` / `verified` / `verification_rejected`)
already exists precisely to carry that distinction; a score should never imply more certainty than
the evidence status supports (see `07-explainability-framework.md`).

**Cross-dimension overlap:** an award in a research competition also feeds `research`; an award
for a founded venture also feeds `entrepreneurship`.

### 2.8 `career_exploration`

**Construct:** deliberate exposure to what a field or career is actually like in practice —
internships, job shadowing, informational interviews, structured career-exposure programs,
`work_experiences`.

**Sub-facets:** passive exposure (attended a talk, read about a field) vs. active exposure (shadowed
a professional, held an internship) vs. tested-against-reality (did substantive work and formed a
view on fit, ideally recorded via the reflection loop in `PHASE 10` of the founder spec).

**Over-counting risk:** conflating *breadth* of career exploration (attractive at younger ages —
see `03-recommendation-timing.md`) with *depth of conviction* (more expected by application time).
A 14-year-old who has "explored" five fields shallowly is doing exactly what that age should be
doing; a 17-year-old with the same shallow-breadth pattern and no deepening in a stated field of
interest is a legitimate signal worth surfacing, not a strength.

**Cross-dimension overlap:** almost every other dimension's activities also generate some career
exploration value as a side effect (a research project is also career exploration for a research
career; a founded venture is also career exploration for entrepreneurship) — this dimension is
best read as "exploration for its own sake," distinct from the deeper, output-producing version of
the same activity that feeds another dimension more strongly.

### 2.9 `execution_project_depth`

**Construct:** the founder spec's own framing is the clearest available: reward execution over
idea creation. This dimension measures whether a student **actually finished and shipped something**
— a piece of software, a piece of writing, a physical build, a dataset, a designed object —
regardless of which field it's in.

**Sub-facets:** duration/sustained effort; iteration (v1 vs. multiple revisions in response to
feedback/results); adoption or use by anyone beyond the student themself; complexity relative to
the student's stage; individual vs. team contribution (and, for team projects, the student's
specific, attributable contribution — a real measurement gap noted in `10-open-questions.md`).

**Over-counting risk:** treating an unfinished, ambitious-sounding project description as
equivalent to a smaller, actually-completed one. This is the dimension where the founder spec's
"no half-finished implementations" principle (stated for ORYN's own build, but equally true of what
ORYN should reward in a student) is most directly on point — completion is the signal, not scope
of ambition.

**Cross-dimension overlap:** essentially every other dimension's most legitimate evidence *also*
tends to produce `execution_project_depth` evidence when done well — this is by design, not an
error: `execution_project_depth` is closer to a cross-cutting "did they finish" quality check than
a separate subject-matter area, which is exactly why the founder spec pairs it with "Reward
execution more than idea creation" rather than defining a topic area for it.

## 3. What this taxonomy implies for future scoring work (not implemented here)

1. Within-dimension **evidence ladders** (exposure → execution → independence → output, or
   self-reported → evidence-added → verified) are a more accurate lever than raw counts for at
   least `research`, `awards_distinction`, and `execution_project_depth`. `ResearchOutputType` and
   `EvidenceStatus` already exist as the data substrate for this; the gap is in how
   `lib/scoring/dimensions/research.ts` and `awards.ts` weight them today (not audited line-by-line
   in this research pass — flagged for the engineering handoff as a concrete, scoped next step,
   not asserted as a current bug).
2. Cross-dimension overlap is expected and should not be "fixed" by forcing one activity into
   exactly one dimension — `leadership.ts`'s existing multi-factor design is the right pattern to
   extend to other dimensions, not a special case.
3. None of the above requires a new `ProfileDimension` value or a schema change.

## Sources referenced in this document

| ID | Source | Type | Confidence | Used for |
|---|---|---|---|---|
| S-UCAS-PS | [UCAS — Personal statement toolkit](https://www.ucas.com/advisers/help-and-training/toolkits/personal-statement-toolkit) and [How to write your personal statement for 2026 entry onwards](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement/how-to-write-your-personal-statement-for-2026-entry-onwards) | Official education-platform guidance | High | §2.1 academics/rigor framing, corroborates depth-over-breadth |
| S-EXTRA-DEV | [Extracurricular Involvement and Adolescent Adjustment: Impact of Duration, Number of Activities, and Breadth of Participation — *Applied Developmental Science*](https://www.tandfonline.com/doi/abs/10.1207/s1532480xads1003_3); see also [Recent advances in research on school-based extracurricular activities and adolescent development — *Developmental Review* (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0273229711000359) | Peer-reviewed research (abstract accessed; full text paywalled) | Medium — abstracts/summaries accessed directly, full-text methodology not independently verified this session | §2.2, §5 framing of breadth vs. depth vs. duration as genuinely distinct, separately-studied constructs |

Full registry with retrieval timestamps: `data/research/counseling-intelligence/sources.json`
(`S-UCAS-PS`, `S-EXTRA-DEV`).
