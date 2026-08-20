# Student-Development Taxonomy

Answers: *what dimensions of student development are actually meaningful for counseling, and
how do they map onto the 9 `ProfileDimension` values already shipped in ORYN's scoring engine
(`lib/scoring/dimensions/*.ts`)?*

## Method

Cross-referenced three kinds of source: (1) the empirical/institutional record of what selective
admissions actually names as evaluation factors (Common Data Set, NACAC), (2) official admissions
offices' own stated philosophy about how those factors should be pursued (MIT, Harvard GSE), and
(3) the shipped `lib/scoring/dimensions/*.ts` scorers, read in full for this document. The goal
was not to invent a new taxonomy but to check whether the founder-spec's original 9 dimensions
(`AGENTS.md` §6) hold up against outside evidence, and to identify sub-facets research supports
that the scorers already encode, partially encode, or don't yet encode.

**Finding, stated up front: the 9-dimension taxonomy holds up well.** Every dimension maps onto a
factor named in the Common Data Set's own 19-factor standard (the closest thing selective
admissions has to an industry-wide vocabulary) or onto a quality MIT names explicitly in its own
official admissions criteria. Nothing in the research pulled for this package supports adding a
10th top-level dimension. Several candidate "missing dimensions" from the mission brief turned
out, on inspection, to be either (a) already covered as evidence *within* an existing dimension,
(b) a cross-cutting attribute that modulates several dimensions at once rather than being a
dimension itself, or (c) a genuinely different kind of thing — a *relevance/fit* axis, not a
*development* axis. Section 4 below documents that mapping explicitly so it isn't silently lost.

## 1. The empirical anchor: what selective admissions actually names

The **Common Data Set** (`commondataset.org`, the shared reporting template ~1,700 US
institutions use, jointly maintained by *U.S. News*, *The Princeton Review*, and *Peterson's`)
Section C7 asks every participating institution to rate 19 factors as "very important,"
"important," "considered," or "not considered" for first-time first-year admission
[[RULE-COUNSEL-001]]:

- **Academic:** rigor of secondary school record, class rank, academic GPA, standardized test
  scores, application essay, recommendation(s).
- **Nonacademic:** interview, extracurricular activities, talent/ability, character/personal
  qualities, first-generation status, alumni relation, geographical residence, state residency,
  religious affiliation, racial/ethnic status, volunteer work, work experience, level of
  applicant's interest.
  (Source: Common Data Set 2024-2025 template, `commondataset.org` — official, high confidence.)

**NACAC's State of College Admission** survey of member four-year colleges (Fall 2023 cycle, most
recent published at research time) found grades in college-prep courses (76.8% "considerable
importance") and strength of curriculum (63.8%) rank above every other factor, with character/
personal qualities and essays next, and demonstrated interest, recommendations, extracurriculars,
and work experience providing "additional context" rather than driving decisions on their own
(Source: NACAC State of College Admission Factors fact sheet — official association survey data,
high confidence; note NACAC surveys *member* institutions and skews toward more selective/
NACAC-affiliated schools, not a random sample of all postsecondary admission — a documented
limitation, not disqualifying). [[RULE-COUNSEL-002]]

**Product implication:** this validates something ORYN's own product spec already asserts
independently (`AGENTS.md` Non-Negotiable Requirement #11: "Career profile score is different
from admissions probability") — academic factors (rigor + grades) are named as the *most*
important factor category by every source checked, ahead of any extracurricular dimension. A
counselor that spends most of its attention steering a student toward more extracurricular
activity while that student's course rigor is weak relative to what's available to them would be
optimizing the less-weighted factor. `lib/scoring/dimensions/academics.ts` already exists as a
first-class dimension for exactly this reason — this research confirms, rather than changes, that
design choice.

## 2. Why "prestige score" is the wrong model — the depth-over-breadth finding

Three independent source types converge on the same finding, which matters because it is the
research backbone for the mission's explicit "opportunity cost" requirement and for
`AGENTS.md`'s "avoid activity inflation" instruction to the AI advisor:

- **MIT Admissions**, official "What We Look For" and "Extracurricular Activities" pages: *"We
  don't expect applicants to do a million things. Choose quality over quantity."* MIT asks for at
  most four activities on its application and states explicitly that activities should be chosen
  "because they delight, intrigue, and challenge you — not because you think they'll look
  impressive." (Source: `mitadmissions.org/apply/process/what-we-look-for/` — official, high
  confidence.) [[RULE-COUNSEL-003]]
- **Harvard Graduate School of Education's "Turning the Tide"** (Making Caring Common project,
  2016, endorsed by dozens of admissions deans including Yale, MIT, and Michigan at publication):
  argues explicitly for valuing "one or two meaningful, sustained, authentically chosen"
  experiences over a checklist assembled for the application. Read this as a **normative,
  advocacy-oriented report**, not a neutral description of how all admissions offices currently
  behave — it is the admissions establishment's own stated aspiration, co-signed by many of the
  offices ORYN's students will apply to, which makes it directly relevant to how ORYN should
  counsel even though it is not a universal, binding rule. (Source: `gse.harvard.edu`/
  `mcc.gse.harvard.edu`, official institutional report — high confidence as a statement of
  institutional philosophy, medium confidence as a predictor of any *specific* admission
  decision.) [[RULE-COUNSEL-004]]
- **Admissions-counseling secondary sources** (converging, not single-source): sustained
  commitment to two or three areas, especially with increasing responsibility over time, is
  described consistently as reading as more credible than many surface-level memberships — the
  reasoning given is that breadth-without-depth reads as résumé construction, while depth reads as
  genuine investment. (Multiple counseling-industry sources; medium confidence — this is
  consensus-of-practice among counselors and former admissions readers, not primary institutional
  data, and should be treated as directionally reliable rather than quantitatively precise.)
  [[RULE-COUNSEL-005]]

**This is not an argument for zero breadth.** The same sources that argue for depth also assume a
student got to that depth *by first exploring*. The taxonomy needs both a way to reward depth
(most of the 9 dimensions) and a way to legitimately track exploration without penalizing it as
unfocused — which is exactly what already exists structurally in the shipped scorers (§3).

## 3. The 9 dimensions: validated, with sub-facet detail

For each dimension: what it captures, why external evidence supports it as a distinct axis, and
exactly what the shipped scorer already does (so this section is falsifiable against real code,
not just prose).

### `academics`
**Captures:** grade performance, curriculum rigor, standardized-testing engagement — the single
highest-weighted factor category per NACAC/CDS (§1).
**Already shipped correctly, confidence-rated:** `lib/scoring/dimensions/academics.ts` normalizes
GPA against its *own* declared scale (never cross-curriculum), weights AP/IB-HL/A-Level/dual
enrollment above honors above regular coursework, and scores standardized-test *presence* rather
than the score value itself — the code comment states plainly this is because comparing an SAT
score to an IB predicted grade "without a validated conversion table would be exactly the kind of
false-precision cross-system comparison the product spec prohibits." **Research confirms this
caution is warranted**, not overcautious: score-concordance tables (e.g. SAT↔ACT) exist for
*within-US-system* pairs from testing organizations themselves, but no validated public concordance
exists across national curricula (IB predicted grade ↔ US GPA ↔ Turkish diploma grade) — treating
that as a solved conversion problem would be inventing false precision. **Confidence: high** that
this dimension and its current scoring approach are sound.

### `intellectual_curiosity`
**Captures:** self-directed learning and subject breadth *beyond* what a transcript requires —
explicitly a **breadth** signal (`lib/scoring/dimensions/intellectual-curiosity.ts`'s own comment:
"no diminishing-returns aggregation," unlike the depth dimensions below). Distinct course
subjects, certifications outside the curriculum, and named research fields feed it.
**Why distinct from `academics`:** CDS/NACAC group "rigor" and "curiosity" together informally,
but they are logically separable — a student can max out available rigor (all AP the school
offers) while showing zero self-directed exploration beyond it, or vice versa. Keeping them
separate lets a gap show up correctly in either direction. **Confidence: medium-high** — the
distinction is logically sound and matches how counseling literature discusses "intellectual
vitality" as a named quality (a term Stanford's own admissions materials have historically used),
but this package found no single official source that names this exact split explicitly the way
MIT names its eight qualities in §2.

### `leadership`
**Captures:** substantive responsibility, not title. **This is the single best-evidenced dimension
in the whole taxonomy.** Multiple converging sources (admissions-counseling consensus, §2) state
that titles like "president," "captain," and "vice president" have become so common on
applications that they no longer differentiate applicants on their own, and that admissions
readers instead weight *demonstrated action, initiative, and measurable outcome*. **Already shipped
precisely this way**: `lib/scoring/dimensions/leadership.ts` gives a title only a flat 3-point
"title bonus" against a per-item cap of 30, with the bulk of the score coming from duration,
people led (log-scaled, so leading 200 people isn't 20x leading 10), and organizational scope. A
bare "President, no other signal" entry is explicitly designed to stay "well under a strong
reading" per the code's own comment. **Confidence: high.**

### `research`
**Captures:** two sub-facets research literature and the shipped scorer both already distinguish —
**exposure/process** (duration, methodology description, named mentor, independence level) and
**output** (presentation → poster → school journal → preprint → peer-reviewed publication, a
graded bonus scale in `OUTPUT_BONUS`). **Publication is explicitly not required** for a strong
score — the code comment states "duration, methodology, mentorship, and independence together can
carry a strong score with output_type still 'none.'" **Research confirms this is the right
model**: examining an official structured research program's own description (MIT's Research
Science Institute, run by the Center for Excellence in Education) shows the program's own stated
value proposition is the mentored process itself — "students learn how researchers approach
unanswered questions... execute a detailed research plan... deliver conference-style reports" —
not that every participant produces a publishable result. A program can be high-value evidence of
`research` development even when no participant publishes. (Source: `cee.org/programs/
research-science-institute`, official program description — high confidence for what the program
provides; this is one program, used as a representative example of mentored-research-program
structure generally, not a claim that all research programs are equivalent to RSI.)
[[RULE-COUNSEL-006]] **Confidence: high.**

### `entrepreneurship`
**Captures:** founder-role or revenue-generating ventures specifically — implemented as a strict
*subset* of `execution_project_depth`'s projects (`isEntrepreneurial()` filters on founder-shaped
role text or nonnull revenue). **This means one real venture legitimately feeds two dimensions at
once** — not double-counting in the redundancy sense, but two different lenses on the same
evidence (the venture demonstrates both "did I ship something real" and "did I originate and own
something"). This is an important structural principle worth stating explicitly for the redundancy
framework (`05-redundancy-saturation.md`): **the unit of redundancy analysis is the dimension, not
the underlying activity** — the same activity should be allowed to score against every dimension
it genuinely demonstrates. [[RULE-COUNSEL-007]] **Confidence: high** that the subset relationship
is a sound design; no external source specifically validates the founder-role/revenue *operational
test* used to detect it, which is a reasonable, narrow heuristic rather than a researched
threshold.

### `community_impact`
**Captures:** sustained, structured volunteering — duration and weekly-hours-scaled, plus a bonus
for a named cause area. CDS explicitly lists "volunteer work" as one of its 19 factors (§1),
confirming it as a real, separately-tracked admissions signal, not a filler category.
**Confidence: high** for the dimension's validity; **medium** for the specific weighting of
duration vs. hours/week, which is a reasonable but unvalidated design choice (no source found that
weighs these two sub-signals against each other empirically).

### `awards_distinction`
**Captures:** external validation via competitive recognition, tiered by level (international >
national > state/regional > school/local) via free-text pattern matching. CDS's own factor list
separates "talent/ability" from general "extracurricular activities" — awards are the evidentiary
proof point *for* talent/ability, distinct from simply having participated. **Confidence: medium** —
the level-tiering concept (international > national > local) is intuitive and matches how
counseling sources typically describe selectivity/prestige gradients, but this package found no
official source that validates the *specific point values* (15/11/7/3) used; these remain product
heuristics, flagged for the same reason `docs/counselor-core.md` flags `RANKING_THRESHOLDS`.
[[RULE-COUNSEL-008]]

### `career_exploration`
**Captures:** breadth of environments/roles tried (distinct activity categories, presence of an
internship, multiple organizations) — explicitly a breadth signal, not run through
diminishing-returns, matching `intellectual_curiosity`'s structural pattern. **Confidence:
medium-high** — breadth-of-exploration as a distinct, legitimately-non-penalized signal is well
supported by the timing research in `03-recommendation-timing.md` (exploration is
developmentally appropriate at certain grades, §2 there), but "internship" as the single named
boost (vs. e.g. job shadowing, informational interviews, structured career-exposure programs) is
narrower than the mission brief's own "career exploration / professional exposure" framing
suggests — flagged as a possible future scorer refinement in `10-open-questions.md`, not
something this research package can resolve without seeing what data ORYN actually collects for
non-internship career exposure.

### `execution_project_depth`
**Captures:** the AGENTS.md §6.4 principle stated almost verbatim in the scorer's own comment:
"reward execution more than idea creation." Duration, described outcome, users reached (log-scaled),
revenue (log-scaled), and a live/repo URL ("shipped") all contribute; a bare idea with no evidence
of being built floors at 2 base points. **Confidence: high** — "shipped > idea," "adoption evidence
> claimed adoption," and log-scaling large numbers (1,000 users isn't 100x better evidence than 10)
are all well-supported design choices, consistent with how technical/entrepreneurial evaluation
generally treats scale claims.

## 4. What the mission's candidate dimensions map onto (not a 10th dimension each)

The mission brief lists ~23 candidate "development dimensions" and explicitly warns not to assume
the list is correct. Checked against the 9 shipped dimensions:

| Candidate | Resolution |
|---|---|
| Academic depth, academic rigor, subject exploration | `academics` (rigor) + `intellectual_curiosity` (self-directed subject exploration) |
| Major alignment | **Not a development dimension at all** — it's a *relevance/fit* axis. It already exists, separately, as `fieldAlignment` in `lib/counselor/config.ts`'s scoring weights and `relevanceScore` in `lib/opportunities/matching.ts`. Folding it into the 9 would conflate "how good is this evidence" with "how well does this evidence match what the student says they want," which are genuinely different questions — a strong research program in the wrong field is still real research-dimension evidence, just poorly targeted. |
| Research exposure, research output | Both inside `research`, already distinguished as sub-facets (§3) |
| Technical skill | Not a dimension — an implicit quality modifier inside `execution_project_depth` (complexity of what was shipped) and `research` (methodology rigor). Relevant mainly for CS/engineering major-family evidence (`06-major-family-evidence/`), not a general-purpose axis every student needs. |
| Writing / communication | **Genuinely under-tracked.** Shows up implicitly (project `outcome_summary` quality, research written output type) but nothing scores communication *as such*. Flagged in `10-open-questions.md` — not resolved here, since resolving it would mean judging free-text quality, which risks exactly the kind of AI-invents-a-judgment problem `docs/counselor-core-plan.md` §6 already explicitly avoided for "deepen an existing project" candidates. |
| Creative production | Not currently a first-class evidence type anywhere in the schema for non-technical creative work (writing, art, design, music, film). Relevant to the design/arts and humanities major families (`06-major-family-evidence/`) — flagged as a data-model gap in `10-open-questions.md`, not something this package can retrofit into the 9 dimensions without a schema conversation. |
| Leadership, entrepreneurship, community impact, awards/distinction, career exploration, execution/project depth, intellectual curiosity | Direct 1:1 matches, §3. |
| Initiative | **Cross-cutting, not a dimension.** MIT names "initiative" as one of eight top-level applicant qualities (§ MIT fetch, `mitadmissions.org/apply/process/what-we-look-for/`) but it shows up as a *quality of execution* across `leadership` (did they start something vs. just join), `execution_project_depth` (did they self-initiate the project), and `entrepreneurship` (founding is initiative by definition) rather than needing its own score. |
| Teamwork | Cross-cutting — MIT explicitly names "collaborative and cooperative spirit" (§2) as a top applicant quality. Shows up inside `leadership` (people led, organizational scope) and `execution_project_depth` (team-built projects) rather than as a standalone axis; no source found that treats teamwork as separately admissions-relevant from those two. |
| Service | Subsumed by `community_impact`. |
| Global exposure | Not currently a dimension or tracked modifier. Better modeled as a *tag/context* (an international competition, a program in another country, a multinational team) than a scored dimension — a student without global exposure is not thereby weaker on any of the 9 dimensions, so scoring it as its own axis risks penalizing geography/cost-constrained students for something largely outside their control (directly relevant to `08-unsafe-inference-rules.md`). Flagged, not resolved. |
| Competition evidence, external validation | These are **evidence-state** concepts (did the student place, place highly, win), not dimensions — they modulate the *strength* of evidence within `awards_distinction` primarily, but a competition result can also validate `research`, `academics`, `entrepreneurship`, etc. depending on the competition's subject. This is exactly what `02-opportunity-development-mapping.md`'s evidence-state model formalizes. |
| Sustained commitment | Cross-cutting temporal attribute — every depth-scored dimension (all except `intellectual_curiosity`/`career_exploration`) already uses `monthsBetween(...)` as a direct scoring input. Not a 10th dimension; a shared mechanic. |
| Independent project work | `execution_project_depth`, with `independence_level` also feeding `research` specifically for research-type independent work. |
| Career exploration, professional exposure | `career_exploration`, §3. |

**Net finding for this section:** zero of the 23 candidates justify a 10th dimension. Two
(writing/communication, creative production) are genuine, currently-unaddressed data-model gaps
worth a founder decision later — flagged, not silently dropped, in `10-open-questions.md`. One
(major alignment) is a different *kind* of axis already correctly implemented elsewhere. The rest
resolve cleanly onto the existing 9, several as newly-explicit cross-cutting attributes
(initiative, teamwork, sustained commitment) rather than dimensions.

## 5. Breadth dimensions vs. depth dimensions — a structural principle worth naming explicitly

The shipped code already implements a two-way split that this research confirms is
evidence-backed, even though no doc previously named it as a deliberate principle:

- **Breadth dimensions** (`intellectual_curiosity`, `career_exploration`): reward distinct
  exploration, explicitly not run through diminishing returns. A student trying five different
  activity categories should score *better* on breadth than one who tried two, with no penalty.
- **Depth dimensions** (the other 7): reward duration and escalating responsibility within fewer
  commitments, explicitly diminishing-returns'd after 2-3 items (`scoreCommitments`'s
  `diminishingAfter`/`diminishingFactor` in every depth scorer) so that quantity cannot substitute
  for depth.

This maps directly onto the §2 research finding: depth is what admissions offices say they value
*in the activities a student ultimately commits to*, but a healthy developmental path requires
breadth *first* (this is also the core of the timing framework, `03-recommendation-timing.md`).
**A counselor recommendation engine that only ever pushes toward more depth, for a student who
hasn't explored enough yet to know what to go deep on, would be optimizing against how
development actually works.** [[RULE-COUNSEL-009]]

## Rules established in this document

- `RULE-COUNSEL-001` — Use the Common Data Set's 19-factor academic/nonacademic split as the
  external reference vocabulary when evaluating whether a proposed evidence category is
  admissions-relevant. Confidence: high (official, industry-standard source).
- `RULE-COUNSEL-002` — Weight academic rigor/grades above any single extracurricular dimension
  when both compete for a student's limited time, consistent with NACAC's "considerable
  importance" ranking. Confidence: high, with the noted NACAC member-institution sampling caveat.
- `RULE-COUNSEL-003` — Never recommend an activity primarily because it "looks impressive" rather
  than because it addresses a genuine interest or a genuine profile gap; MIT's own official
  guidance names this as an anti-pattern. Confidence: high (official source), scope-limited to
  "this is stated admissions philosophy," not a guarantee about any specific decision.
- `RULE-COUNSEL-004` — Default counseling posture should favor 1-3 sustained, meaningful
  commitments over many shallow ones, treating "Turning the Tide" as institutional-consensus
  aspiration rather than a hard, universal rule. Confidence: medium-high.
- `RULE-COUNSEL-005` — Treat "depth over breadth" as directional guidance, not a quantitative
  formula — do not invent a specific numeric "ideal activity count." Confidence: medium (consensus
  of practice, not primary data).
- `RULE-COUNSEL-006` — Do not treat "no publication" as a research-dimension weakness on its own;
  mentored process/methodology/independence are legitimate strong evidence without output.
  Confidence: high.
- `RULE-COUNSEL-007` — Redundancy/saturation logic must operate per-dimension, not per-activity —
  one activity legitimately scoring against multiple dimensions is correct modeling, not
  double-counting. Confidence: high (structural/logical, confirmed against shipped code).
- `RULE-COUNSEL-008` — Treat `awards_distinction` level-tier point values as unvalidated product
  heuristics (like `RANKING_THRESHOLDS`), safe to keep as a reasonable default, not safe to cite
  as research-backed precision. Confidence: medium.
- `RULE-COUNSEL-009` — A counselor should recognize when a student needs more *breadth*
  (exploration) rather than more *depth*, and should be capable of recommending an exploratory
  action without treating it as lower-value than a depth action — the two serve different
  developmental purposes, especially by grade level (see `03-recommendation-timing.md`).
  Confidence: high (structural, cross-validated against §2 research and shipped scorer design).
