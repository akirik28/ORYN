# Applying the Development-Mapping Framework to Real Data — Findings

**Assignment**: `02-opportunity-development-mapping.md`'s evidence-state framework had never been
applied to a single real row of ORYN's live `opportunities` table. This document reports what
happened when it was — read-only, no schema changes, no writes to production. Machine-readable
output: `data/research/opportunity-dimension-tagging/tags.json` (166 entries, one per row).

## Method

Read all **166 `verification_state='verified_current'` rows** (of 369 total) from the live
`opportunities` table via Supabase MCP `execute_sql` SELECT queries, in 5 batches, each verified
by ID against the query's own result set before merging (one row was initially skipped in
processing and caught by this check — corrected before the final merge, not after). For each row:

1. **Base dimensions** = the shipped `CATEGORY_DIMENSIONS` mapping (`lib/opportunities/
   matching.ts`), always applied — this is already true by construction, not a research finding.
2. **Reinforced dimensions** = additional dimensions the *specific stored description* supports
   beyond the category default, per `02` Part C's subject-reinforcement principle, applied only
   where the description gives explicit, concrete support — never inferred from a program's outside
   reputation or this session's own general knowledge of it.
3. **Achievement-tier ceiling** = the highest tier on `02`'s evidence-state ladder
   (`participated` → `completed_project` → `finalist`/`award`/`winner` → `publication` →
   `leadership_role`/`founder_role`) that the *opportunity's own structure* could plausibly support
   for a participating student — using a stated default (competitions default to `award`/`winner`
   since a judged outcome is near-definitional to the category; enrollment-only programs default to
   `participated` unless the description states an individual output), overridden per-row wherever
   the description gave specific evidence to override it, upgrade *or* downgrade.
4. **`insufficient_description`** = true only when the stored text supports nothing beyond the bare
   category default — **19 of 166 rows (11.4%)**, a real, counted data-quality finding, not an
   estimate.

Every tag is traceable to specific description text, cited in each entry's `tier_ceiling_basis`
field — this document does not claim anything the underlying row doesn't itself support, per the
assignment's own explicit rule.

## Headline finding: the peer's hypothesis about category skew is confirmed, sharply

The stored `category` distribution among these 166 rows: summer_program 87, competition 47,
scholarship 8, research 7, internship 7, online_program 6, entrepreneurship 2, fellowship 2. Once
mapped through `CATEGORY_DIMENSIONS`, this produces a **base-dimension distribution dominated by
four dimensions and starved for the rest**:

| Dimension | Times appearing as a *base* dimension (out of 166 rows) |
|---|---|
| `intellectual_curiosity` | 100 |
| `career_exploration` | 94 |
| `academics` | 61 |
| `awards_distinction` | 47 |
| `research` | 9 |
| `execution_project_depth` | 9 |
| `leadership` | 2 |
| `entrepreneurship` | 2 |
| `community_impact` | 0 |

**`community_impact` never appears as a base dimension in this entire 166-row sample** — the one
`volunteering`-category row in the full 369-row table did not survive the `verified_current` filter.
`leadership` and `entrepreneurship` each appear as a base dimension only twice. This is not a
subtle statistical pattern — it is the dominant structural fact about this catalog. **A student
whose profile-gap analysis names `leadership` or `community_impact` as their weakest dimension
would find very little in this catalog natively shaped to address it**, independent of how well any
individual recommendation algorithm works — the underlying data doesn't have much of that shape to
recommend. [[RULE-COUNSEL-130]]

Reinforcement (dimensions added per-row from the actual description text, beyond the category
default) partially compensates but doesn't close the gap: `execution_project_depth` gained the most
reinforcement (48 rows), `research` next (24), `leadership` and `entrepreneurship` each gained 10
more — meaningful, but still a small fraction of the catalog, and reinforcement by construction
requires a description that explicitly supports it, so it cannot manufacture coverage the catalog's
underlying category mix doesn't have.

**Direct implication for the research/acquisition lanes**: if ORYN's counselor is going to
credibly close a `leadership` or `community_impact` gap, either (a) the acquisition pipeline needs
to specifically source more leadership- and service-shaped opportunities (student government
adjacent programs, structured volunteering with real responsibility, community-organizing
fellowships), or (b) the counselor needs a credible answer for these gaps that doesn't route through
the `opportunities` catalog at all (e.g., "start something yourself" style guidance, consistent with
this package's own `12-activity-progression-pathways.md` late-start handling). Right now, neither
exists, and the catalog's shape is the reason. [[RULE-COUNSEL-131]]

## Where the framework broke down against real data

The instructions asked specifically for this, since it's more valuable than a clean-looking result.

### 1. `CATEGORY_DIMENSIONS` assumes one opportunity = one mechanism; several rows are actually several opportunities

Two clear cases: **Coursera** (a course *platform* hosting many providers' courses, not a single
program) and **UWC Short Courses** (an explicit "directory of UWC-endorsed short courses," dozens
of independently-run offerings with their own eligibility/dates/cost). Tagging these as a single
row with a single tier ceiling is not wrong exactly, but it's answering a different question than
every other row answers — a genuinely different *shape* of database entry being forced into the
same schema as a specific, named program. **The Waterloo CEMC Contests row has the same shape at
smaller scale** (an "umbrella record for 9 different contests"). [[RULE-COUNSEL-132]]

### 2. `scholarship` is not one category of evidence — it's at least four

- **Pure need-based, no reinforcement** (Gates Scholarship, QuestBridge): financial-access
  programs, not evidence of a demonstrated skill.
- **Project-based, functions like a competition** (Davidson Fellows Scholarship): requires "a
  significant completed project," three cash tiers up to $100,000 — closer in kind to a national
  competition than to typical scholarship aid.
- **Leadership/service-recognition-based** (Coca-Cola Scholars, Ron Brown Scholar Program, Cooke
  College Scholarship — three independent instances of the same pattern): explicitly scored on
  leadership and community service, not just academics.
- **Essay/interview-based, competition-shaped** (Coolidge Scholarship): national essay competition
  with a finalist interview weekend.

`CATEGORY_DIMENSIONS`'s single mapping for `scholarship` (`academics` only) is accurate for exactly
one of these four sub-shapes and actively undersells the other three. This is the single clearest
category-level (not row-level) finding from this exercise. [[RULE-COUNSEL-133]]

### 3. Some `summer_program`-tagged rows are, in substance, `research` or `fellowship` programs

**MIT PRIMES** (year-long, highly selective, mentored original research in math/CS/computational
biology, admits only students of "extraordinary mathematical ability") and **JAX Summer Student
Program** (fully-funded, stipended, 10-week mentored genetics/genomics lab research) are both
tagged `summer_program`, inheriting that category's `intellectual_curiosity`/`career_exploration`
base — both are functionally indistinguishable from this package's strongest `research`-category
examples once you read past the category label. This is the inverse problem from the scholarship
finding above: not that the category is too broad, but that *specific rows are miscategorized
relative to their own content*.

### 4. Two structurally different "research program" shapes hide inside the `research` category itself

**Publication venues** (American Journal of Student Research, Journal of Research High School,
International Journal of High School Research) are journals — submitting a completed paper for
peer review *is* the entire opportunity, so a `publication` tier ceiling is directly, structurally
supportable, not an optimistic assumption. **Mentored research programs** (SSTP, Clark Scholars,
Garcia Summer Research, SIP, Pioneer Research Institute, Simons Summer Research) place a student
with a research mentor for a defined period; per this package's own `RULE-COUNSEL-011` (only ~25%
of even well-resourced mentored research pairings result in publication), these should cap at
`completed_project` unless the specific listing states a publication track — Garcia's own
description does ("may go on to publish"), so it's the one mentored program in this sample tagged
with a `publication` ceiling, explicitly framed as a possible not typical outcome. Treating these
two shapes identically because they share a category label would systematically overstate what most
`research`-category rows actually promise.

### 5. Some competitions are second-order — entry itself requires a prior, unlisted win

**EUCYS**, **International Philosophy Olympiad**, and **UK Chemistry Olympiad**'s IChO-selection
stage all require a student to have *already won* a separate national-level competition before they
can even enter. A student eligible for one of these rows has independent, real evidence of a prior
achievement the framework has no way to see, since that prior competition isn't itself a row in
this table. Not a flaw in the tagging exercise, but a real limit on what any single-row
characterization can capture. [[RULE-COUNSEL-134]]

## Data-quality issues found while reading real rows (not tagging failures — flagged separately per the assignment)

- **A likely duplicate**: "The Diamond Challenge" (id `30a605ab`, category `competition`) and
  "Diamond Challenge" (id `cb1ae3e2`, category `entrepreneurship`) read as the same underlying
  program under two different category tags. Flagged for a direct database-level duplicate check,
  not resolved here.
- **A real eligibility contradiction inside one row's own stored text**: Penn Apps' description
  reports that the organizer's own official age-of-majority rule contradicts a secondary source's
  15+ claim — if the official rule holds, this listing may not be eligible for most of ORYN's
  actual 14-18 population at all, a bigger problem than any dimension tag.
- **Geographic/citizenship eligibility gates that would exclude most of ORYN's international
  population**, worth surfacing explicitly rather than only noting individually: Genesys Works (8
  named US metros only), SHIP/Fred Hutch (Greater Seattle only), SEAP (US citizens, some sites
  require security clearance), Caltech SRC (Pasadena Unified School District only).
- **Three "pipeline" programs that are not single-summer opportunities a browsing student could
  apply to directly**: CU Boulder PCDP and WashU CPP are both multi-year, first-generation-student
  access pipelines with ongoing eligibility criteria; the rest of this table's rows are one-time
  applications. A different shape of catalog entry, similar in kind to the directory/platform cases
  above but access-program-shaped rather than aggregation-shaped.
- **Apparent internal-annotation text leaking into stored description content**: The Gates
  Scholarship's description contains a sentence reading like a researcher's own tiering rationale
  ("tier is set to competitive_award... rather than a specific selectivity band") rather than
  student-facing factual content — worth a pass to separate annotation notes from description text
  generally, a data-hygiene finding distinct from thinness or inaccuracy.
- **Stale-currency flags found across many rows**, not itemized individually here since they're a
  volume issue rather than a structural one: closed registrations still shown as open, passed
  deadlines, a prior year's dates/pricing still live on a program's own official page. Consistent
  with this package's own `29-data-freshness`-adjacent concerns already named in `AGENTS.md`.
- **One positive verification example worth naming, not just the negative findings**: the Istanbul
  Bilgi University row's stored description documents that a secondary-source claim the university
  had been "closed by decree" was checked directly against the university's own homepage and found
  false — exactly the kind of active verification this whole exercise (and this package generally)
  values, evidence the acquisition pipeline is already doing this in at least some cases.
- **Access-equity-positive programs worth surfacing as a positive pattern**: MITES (fully funded,
  explicitly for underrepresented/underserved STEM students), Carnegie Mellon SAMS (fully funded,
  need-documentation-based), Sutton Trust and University of Bath's Step into Bath (both explicitly
  redirect widening-participation-eligible students to separate subsidized tracks), Rutgers Young
  Scholars (explicit encouragement of applications from underrepresented groups). These are
  directly relevant to this package's own access-equity discipline (`04-profile-gap-framework.md`
  §3) and worth a counselor being able to specifically surface for access-constrained students.

## What this means for ORYN, concretely

1. **The `leadership`/`community_impact` catalog gap (§ headline finding) is the single most
   actionable finding here** — worth the acquisition/research lanes' attention ahead of adding more
   volume to already-oversupplied categories (`summer_program` alone is 87 of 166 rows).
2. **A `category` value alone is not a reliable signal of what an opportunity actually offers** —
   the scholarship four-way split and the PRIMES/JAX miscategorization both show real rows where the
   stored category undersells or mismatches the actual content. A future pass could consider a
   secondary, human/AI-assisted "evidence shape" tag independent of the acquisition-pipeline's
   category field, though this document does not propose implementing that (research/design scope
   only, per the assignment).
3. **11.4% `insufficient_description` is a real, usable metric**, not just a count — it identifies
   specific rows (listed in `tags.json`) where the acquisition pipeline should prioritize a
   description-enrichment pass before a counselor could responsibly cite anything beyond the bare
   category for that row.
4. **This exercise itself should not be treated as a one-time snapshot** — 166 of 369 rows were
   covered (the `verified_current` subset only, per the assignment's own scope); the remaining 202
   `unverified` and 1 `conflicting` rows were not tagged this pass, and any newly-added or
   newly-verified rows going forward will need the same treatment, not a one-time backfill.

## Honest limitations of this exercise

- **Single-session tagging, not independently cross-checked.** Every other finding in this
  package's research (country admissions systems, professional licensure, etc.) was built with
  reciprocal verification between two sessions or against official primary sources. This tagging
  pass has neither — it is one session's application of an already-established framework to
  already-stored text, not new primary-source research. Confidence in the *framework* (`02`) is
  high, per the rest of this package; confidence in any *individual row's* specific tag is bounded
  by how much this session's own judgment, not an external source, did the tagging.
- **The tier-ceiling default rule (competitions default to `award`/`winner`; enrollment programs
  default to `participated`) is this document's own methodological choice**, not itself derived
  from an external source — a defensible, stated, consistently-applied heuristic, not a fact.
- **166 rows processed in 5 batches under real time constraints** — genuine per-row reasoning was
  applied throughout (see `tier_ceiling_basis` on every entry), but at this volume, some rows
  received more individual scrutiny than others; the ones flagged in `notes` received more, plainer
  rows received the default-rule treatment with a brief basis statement. This is stated plainly
  rather than implying uniform depth across all 166.
- **No numeric weights, scores, or rankings were produced** — this is a qualitative tagging
  exercise, consistent with this package's standing discipline (`AGENTS.md` Phase 6.1) and the
  assignment's own explicit instruction against inventing subjective scores.

## Rules established in this document

- `RULE-COUNSEL-130` — `community_impact` never appears as a base dimension across the 166
  `verified_current` opportunity rows tagged this pass; `leadership` and `entrepreneurship` each
  appear only twice. The catalog is structurally dominated by `intellectual_curiosity`/
  `career_exploration`/`academics`/`awards_distinction`. Confidence: high (direct count against
  live production data, not an estimate).
- `RULE-COUNSEL-131` — If ORYN's counselor needs to credibly close a `leadership` or
  `community_impact` gap, the current `opportunities` catalog cannot reliably supply a matching
  recommendation — either the acquisition pipeline needs to specifically source more of this shape,
  or the counselor needs a non-catalog answer (e.g. "start something yourself" guidance) for these
  specific gaps. Confidence: high (direct consequence of `RULE-COUNSEL-130`).
- `RULE-COUNSEL-132` — Some opportunity rows represent an aggregation (a course platform, a
  directory of independently-run short courses, an umbrella record for multiple distinct contests)
  rather than a single specific program — the one-row-per-opportunity schema does not cleanly fit
  these, a data-modeling question distinct from description thinness. Confidence: high (three
  concrete examples found and named).
- `RULE-COUNSEL-133` — The `scholarship` category bundles at least four evidentiary shapes (pure
  need-based, project-based/competition-like, leadership/service-recognition-based, essay/
  interview-competition-based) under one `CATEGORY_DIMENSIONS` mapping (`academics` only), which
  accurately describes only the first shape. Confidence: high (multiple named, described examples
  of each sub-shape found in a single 166-row sample).
- `RULE-COUNSEL-134` — Some competitions are second-order: eligibility itself requires having
  already won a separate, unlisted national-level competition, meaning a student's mere eligibility
  for that row is independent evidence of a prior achievement this framework cannot see from the row
  alone. Confidence: high (three concrete examples: EUCYS, International Philosophy Olympiad, UK
  Chemistry Olympiad's IChO stage).
