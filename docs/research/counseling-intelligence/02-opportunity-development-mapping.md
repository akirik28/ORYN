# 02 — Opportunity → Development Mapping & Evidence-State Model

**Answers:** What does participating in a given opportunity type actually demonstrate or develop,
and how does that differ by evidence state (participated vs. finalist vs. award vs. leadership
role)?

**Extends, does not replace:** `CATEGORY_DIMENSIONS` in `lib/opportunities/matching.ts` (13
`opportunity_category` values → 1-2 `ProfileDimension`s each, flat, no state distinction — read in
full before writing this document). Every table below is additive guidance for a future scoring
change, not a redesign of the matching pipeline's architecture.

## The mission brief's own example conflates three different axes

The mission brief asks for evidence-state distinctions using the example list "participated /
finalist / award / winner / publication / leadership role." Read literally as one sequence, this
mixes three independent facts:

1. **Result tier** — participated, finalist, award, winner. A position on a recognition ladder.
2. **Output type** (`01-development-taxonomy.md` §4) — publication. What was produced, not how it
   was recognized. A student can publish without winning anything, or win without publishing.
3. **Role** (`01-development-taxonomy.md` §2 and §6) — leadership role. Who the student was
   relative to the activity, not how far they advanced in it.

**RULE-COUNSEL-027:** Never model recognition as a single flat list mixing result-tier, output-
type, and role together — a student who was a competition's *student organizer* (role) and one who
*won* it (result) are both meaningful but answer different questions; collapsing them loses
whichever one isn't asked first. This document keeps the three axes separate throughout, plus a
fourth (scope/selectivity) introduced below.

---

## Axis 1: Result tier

The recognition ladder *within* a given opportunity's own structure, independent of how
prestigious that structure is (that's Axis 2). Ordered weakest to strongest:

| Tier | Meaning | Notes |
|---|---|---|
| `registered` | Signed up / applied; no evidence of starting | Weak signal of intent only — see `04-profile-gap-framework.md` on why an unstarted registration should almost never feed a dimension score |
| `participated` | Took part / attended; no further distinction available | The default for anything without a competitive structure (most `summer_program`, `conference`, `volunteering`) |
| `completed` | Finished a defined program with a real dropout possibility | Relevant specifically for structured programs (summer programs, courses, fellowships) where "started but didn't finish" is a real, distinct outcome from "finished" |
| `advanced` / `qualified` | Passed at least one elimination round in a multi-round process | The first tier at which competitive selectivity has actually been demonstrated |
| `finalist` / `shortlisted` | Reached the final round or shortlist without placing | |
| `placed` | Ranked at a specific, named position that is not the top (e.g. "3rd of 40 teams") | Store the actual rank as a fact when known — "placed" alone is less informative than "3rd" |
| `honorable_mention` | A named recognition tier below the top prize | Distinct from `placed` — some competitions have both a numeric ranking *and* a separate honorable-mention track |
| `won` / `first_place` | The top recognition tier for that specific opportunity | |

**RULE-COUNSEL-028:** `registered` must never feed any `ProfileDimension` score above a negligible
floor — signing up demonstrates intent, which is a goal-tracking signal
(`03-recommendation-timing.md`, `career_goals` discussion in `01-development-taxonomy.md` §7.8),
not a development signal. A profile with many `registered`-tier entries and few higher-tier ones is
evidence of *breadth of intent*, not breadth of achievement — these must be presented differently.

**RULE-COUNSEL-029 — the core fix this document proposes:** `awards_distinction`
(`01-development-taxonomy.md` §7.7) should only activate at `advanced`/`qualified` tier or above.
Below that, an opportunity should credit only its *participation-level* dimensions (typically
`academics`, `intellectual_curiosity`, or `career_exploration`, category-dependent — see the
per-category table below), never `awards_distinction`. This directly closes the gap
`00-overview.md` opened with: today, a student who entered a competition and one who won it
produce an identical `CATEGORY_DIMENSIONS` lookup (`["awards_distinction", "academics"]`) at
identical implied strength.

---

## Axis 2: Scope / selectivity

How prestigious the pool being measured against was — independent of where the student landed in
it. A `won`-tier result at school level and a `won`-tier result at international level are the same
*result tier* but very different evidence:

- `school` — school-internal only
- `regional` — city/state/provincial, or a single-country regional round
- `national` — country-wide
- `international` — multi-country

Optionally, when known: approximate entrant/pool size. **Usually unknown** — treat its absence as
`unknown`, not as implicitly "small."

**RULE-COUNSEL-030:** Do not assign a specific numeric multiplier to scope tiers in this research
package — that is a scoring-implementation decision (would live in a future edit to
`lib/counselor/config.ts`-equivalent constants) requiring product judgment this research does not
have standing to fix in place, consistent with the mission's non-negotiable against inventing false
precision. What this research does assert: scope must be read as a **qualitative modifier on top
of** result tier, never merged into a single combined "prestige score," and a `national`-scope
`won` result must never be presented as equivalent to an `international`-scope `won` result even
though both are top-tier by Axis 1 alone.

**RULE-COUNSEL-031:** An award/result record with `scope: unknown` (the competition's selectivity
was never established) should be read at one confidence tier below an otherwise-identical record
with known scope — an unqualified claim like "won an award" carries real but bounded weight until
its context is known.

---

## How the four axes combine — worked examples

*(Axis 3 = commitment/depth, Axis 4 = role — both fully defined in
`01-development-taxonomy.md` §6 and §2; shown here only in combination.)*

**Example A — "Entered the school's Model UN club."**
Result tier: `registered`/`participated` (no competitive result yet). Scope: `school`. Commitment:
`exposure` or `participation`, depending on duration. Role: `member`.
→ Feeds `intellectual_curiosity` lightly. Does **not** feed `awards_distinction` (RULE-COUNSEL-029)
or `leadership`.

**Example B — Same student, one year later: "Placed 2nd at a national Model UN conference,
organizing the school's delegation."**
Result tier: `placed` (rank 2). Scope: `national`. Commitment: `sustained` + `contribution`. Role:
`organizer`/de facto leadership.
→ Now feeds `awards_distinction` (result tier cleared the `advanced` gate) at a `national`-scope
qualitative weight, `leadership` (organizing role, if `is_leadership_role` is set with supporting
duration/scope per `01-development-taxonomy.md` §7.3), and continues to feed
`intellectual_curiosity` from the underlying sustained engagement.

**Example C — "Published a paper in a peer-reviewed student journal after a summer research
program."**
This is two separate opportunity records: the `summer_program` itself (result tier likely
`completed`; feeds `intellectual_curiosity`/`career_exploration` per the category table below) and
a `research_experiences` row with `output_type = peer_reviewed_publication` (output axis,
`01-development-taxonomy.md` §4 — feeds `research`). **RULE-COUNSEL-032:** A summer program that
happens to culminate in a publication should not have its own program-attendance credit inflated
by the publication — the publication is separately evidenced output, not a multiplier on the
program's participation tier. Model as two linked facts, not one merged one.

---

## Per-category result-tier gating

Extends `CATEGORY_DIMENSIONS` for the categories where result tier meaningfully changes what's
credited (categories omitted below — `scholarship`, `student_program` — are binary-outcome or
inherently non-competitive enough that the existing flat mapping is adequate as-is; not every
category needs this treatment).

| Category | Below gate (`registered`–`participated`) | At/above gate (`advanced`+) |
|---|---|---|
| `competition` | `academics` or `intellectual_curiosity` only (subject-dependent), light weight | adds `awards_distinction` per RULE-COUNSEL-029, weighted by scope |
| `hackathon` | `execution_project_depth` only (building happened regardless of result) | adds `awards_distinction`-equivalent recognition credit; `entrepreneurship` unaffected by result tier — it's driven by the artifact, not the placement |
| `fellowship` | `research` only, light weight (fellowships are typically selective *to enter*, so even `participated` here is already post-selection — see note below) | `leadership` activates fully once role/duration substantiate it, independent of result tier — fellowships rarely have a "result tier" beyond completion |
| `research` (as an opportunity, not the `research_experiences` table) | `intellectual_curiosity` only | `research` dimension activates fully once `research_experiences`' own `independence_level`/`output_type` fields (§7.4) substantiate it — this is *not* gated by this category's result tier at all, since research quality is read from the research record itself, not from a competition-style ladder |

**Note on `fellowship`:** unlike `competition`, most fellowships are selective at the *entry* gate
(the application itself is the competitive filter), so `participated` in a fellowship already
implies a real selection event happened — this document does not recommend gating fellowship
credit as aggressively as competition credit. Flagged for the next document's redundancy treatment
too (`05-redundancy-saturation.md`).

**RULE-COUNSEL-033:** Selectivity-at-entry (had to be selected to *start*, e.g. most fellowships,
selective summer programs) and selectivity-at-result (had to outperform others *within* the
program, e.g. most competitions) are different mechanisms and must not share one gating rule. A
category's `CATEGORY_DIMENSIONS` entry should note which mechanism applies before this document's
result-tier gating is applied to it.

---

## Rules minted in this document

RULE-COUNSEL-027 through RULE-COUNSEL-033 (7 rules). Registry:
`data/research/counseling-intelligence/rules.json`.
