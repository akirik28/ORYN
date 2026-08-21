# 16 — Worked Example: The Full Reasoning Chain

**Answers a question neither this document's persona-testing siblings quite answer**: not "is
each framework internally consistent" (peer's `09-persona-testing.md`) and not "how does depth
accumulate over years" (peer's `12-activity-progression-pathways.md`), but **does the whole
package actually produce the mission brief's own stated end-state, end to end, in one concrete
trace?** The mission brief's own words: *"You appear interested in X. Your current evidence shows
Y. A useful next exploration would be Z because it develops/tests A. Here is a real opportunity
that provides A and for which you appear eligible."* This document builds exactly that chain once,
all the way through, citing the real document/section that licenses each step — nothing here is a
new claim, every link is a pointer to reasoning already established elsewhere in this package.

**Deliberately not the founder spec's own canonical persona** (strong entrepreneurship/leadership,
weak research — already the worked example in `AGENTS.md` Phase 39/8.3 itself, and the peer's
`09-persona-testing.md` Persona B already validates it in full). This document picks a persona that
routes through **this whole night's single highest-leverage finding** — the geography-conditional
admissions caveat (`03-recommendation-timing.md` §6) — so the trace demonstrates not just "which
recommendation" but "how the explanation must change depending on what this package spent most of
the night establishing."

## The persona

A 16-year-old student, `target_geographies = ["turkey"]`, `graduation_year` two years out
(`yearsUntilGraduation = 2` → Phase 2, per `03-recommendation-timing.md` §2), no
`target_universities` added yet. Onboarding `interests` includes **"Computer Science"** (a literal
`INTEREST_SUGGESTIONS` value, `lib/validation/onboarding.ts`). Profile-dimension scores (illustrative,
not from a real student):

| Dimension | Score | Confidence |
|---|---|---|
| `intellectual_curiosity` | 74 | high (several logged personal coding projects) |
| `academics` | 68 | high |
| `career_exploration` | 55 | medium |
| `research` | 38 | medium |
| all others | 30-45 | medium-low |

## Step 1 — "You appear interested in X"

`interests` contains `"Computer Science"` → maps directly to **Family 01, Computing & Information
Sciences** (`06-major-family-evidence/00-family-taxonomy.md` §2-§3, the onboarding-vocabulary
mapping table — this is the exact, literal anchor case that table's design was built around, not
an edge case). Family 01 §1 immediately flags that "Computer Science" is an umbrella
(`RULE-COUNSEL-203`) — before recommending anything, distinguish which sub-flavor: the student's
logged projects (personal coding work, per the illustrative profile above) point toward the
**software-build** sub-type rather than the algorithmic-competition or research-track sub-types
family 01 §1 and §4 separately describe.

## Step 2 — "Your current evidence shows Y"

Per `01-development-taxonomy.md`'s dimension definitions: `intellectual_curiosity` is high (the
student has gone looking, per that document's framing of the dimension) but `research` is the
clear weakest dimension with only medium confidence — `03-recommendation-timing.md` §2's Phase 2
framing means this now reads as a real developmental question worth addressing (not, per that
same document's §5 exceptions, automatically a deficiency — but this profile has no stated recent
goal-shift or other legitimate exception on file, so the default reading applies). Per family 01
§1's own umbrella-disambiguation rule, the honest evidence statement is specific, not generic:
*"You've built real software projects — that's genuine `execution_project_depth` and
`intellectual_curiosity` evidence. You haven't yet done anything that tests the research side of
computing specifically (algorithmic problem-solving under contest conditions, or an open-ended
computational question) — that's a different skill from what your existing projects demonstrate,
not a smaller version of the same thing"* (per `RULE-COUNSEL-204`, the CS-specific evidence-type
distinction).

## Step 3 — "A useful next exploration would be Z because it develops/tests A"

`03-recommendation-timing.md` §3's timing table: Phase 2 for this family means a **sustained
project with real scope**, or — matching the specific gap just identified — **competitive
programming** (USACO-style), which family 01 §4 states tests "algorithmic/mathematical
problem-solving under constraints... a different skill from software-development capability"
(exactly the missing evidence type from Step 2). This is not a breadth suggestion (Phase 2 should
be narrowing, per `03` §2) — it is a *depth* suggestion in an *adjacent* facet of the same family,
which `01-development-taxonomy.md`'s cross-dimension-overlap framing (and the peer's own
`RULE-COUNSEL-007`, redundancy operating per-dimension not per-activity) both support as a
legitimate "not redundant" move: this is closer to family 09's "different sub-skill, same
dimension" pattern (peer's `05-redundancy-saturation.md` §4) than to a lateral repeat.

## Step 4 — "Here is a real opportunity that provides A and for which you appear eligible"

`14-field-opportunity-mapping.md`'s `competition` section names exactly this: the
**mathematical/algorithmic olympiad** sub-type of `competition` is the category most distinctively
relevant to family 01 for precisely this evidence gap — cross-referencing back to family 01 §4's
own language almost verbatim ("this competition provides algorithmic problem-solving evidence
rather than software-development evidence" — the mission brief's own worked example, now traced
through this package's actual documents rather than merely quoted). Eligibility: age/geography
checks per `lib/counselor/eligibility.ts`'s existing `unknown`-not-excluded posture — nothing in
this trace requires new eligibility logic.

## Step 5 — the part that would be WRONG without this whole night's research: how the explanation must be phrased

This is where a counselor built only from `01-04`/`06`/`07` (i.e., without `03-recommendation-
timing.md` §6's geography finding) would produce an actively misleading explanation. The naive
version: *"Competitive programming will strengthen your application."* **This is false for this
specific student.** Per `03-recommendation-timing.md` §6 (`RULE-COUNSEL-228`) and its default
clause (`RULE-COUNSEL-230`, since this student has no `target_universities` on file yet): absent
contrary evidence, treat as YKS-track — a system with **no application file at all** (§6, sourced
directly against ÖSYM's own YKS structure). The correct explanation, per `07-explainability-
framework.md`'s own explanation-quality checklist (§4) and its `RULE-COUNSEL-217`
(never let Oryn's own developmental framing imply a university "requires" something): *"Competitive
programming won't directly change your YKS score or placement — your academic exam performance is
doing that work. What it *will* do is show you concretely whether you enjoy the research/algorithmic
side of computing as much as the building side, which is exactly the gap in your profile right
now — genuinely useful for deciding what to study and pursue further, independent of the exam
itself."* This is the mission brief's own "Z because it develops/tests A" language, correctly
scoped to what is actually true for this student's real admissions system — the single concrete
difference this entire package's geography research makes to a real recommendation.

## What this trace validates, and what it doesn't

**Validates**: the chain works end-to-end using only content already established elsewhere in this
package — no new rule was minted to make this example work, which is itself a useful check that
the existing framework is sufficient for the mission's own stated goal.

**Does not validate**: this is one illustrative trace with an invented profile, not a test of the
shipped code (which this research package does not touch) and not a claim that every persona
produces an equally clean chain — the peer's `09-persona-testing.md` Persona C already documents a
real case (research-tier escalation) where the chain currently runs into a genuine data gap. This
document's contribution is narrower and complementary: showing the shape of a working case, not
exhaustively stress-testing where it breaks.

## Sources referenced in this document

Pure synthesis of this package's own prior documents (both branches), cited by file/section
throughout. No new external sources fetched for this document.
