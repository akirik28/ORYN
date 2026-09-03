# Admissions-rules-vs-implementation gap analysis

**Assignment:** compare the 21 `RULE-ADMISSIONS-*` rules (15 countries, 7 programme
families) against ORYN's actual shipped code, and produce an engineering backlog
prioritized by *how wrong the product is today*, not by implementation difficulty.
Research-only — no code changes made. Everything below is checked against
`origin/main`@`0756b3e` (the commit this analysis started from; re-check before acting
if `main` has moved). Machine-readable backlog:
[`data/research/admissions-systems/implementation-gap/backlog.json`](../../../../data/research/admissions-systems/implementation-gap/backlog.json).

## Method

Read in full: `lib/admissions/outlook.ts`, `lib/opportunities/matching.ts`,
`lib/requirements/evaluate.ts`, `lib/scoring/dimensions/academics.ts`, and
`docs/research/counseling-intelligence/18-geography-conditional-scoring-design-spec.md`
(the assigned scope), plus every real call site of `computeAdmissionOutlook` (found via
`git grep`, not assumed) and the `University`/`target_universities` schema shape needed
to judge what data is actually available. This is **not** a full-codebase audit — findings
below are scoped to what these specific files (and their direct callers) show. Where a
claim would require code outside that scope to confirm or deny, it's stated as an open
question, not asserted either way.

## Top-line finding: the highest-priority item isn't a modeling gap, it's dead wiring

`lib/admissions/outlook.ts` already has a fully-built, unit-tested `admissionSystemType:
"holistic" | "credential_gate"` distinction and a `not_applicable` outlook value
(`outlook.ts:42,55-73,85,90,113-115`; tests in `__tests__/admissions/outlook.test.ts`).
**But both of its real production callers never pass `admissionSystemType` at all:**

- `lib/admissions/persist.ts:36-39` — computes and *persists* the outlook shown on a
  student's target-university page. Calls `computeAdmissionOutlook({ profileStrength,
  admissionRate, dataConfidence })` — three fields, no fourth.
- `lib/universities/counseling-adapter.ts:342-346` — computes the outlook for the
  counseling view. Same three-field call, no `admissionSystemType`.

Per `outlook.ts`'s own contract (line 51: *"Omit or pass 'holistic' for unchanged
existing behavior"*), an omitted field defaults to holistic-style classification. **This
means every student, targeting every university, in every country, currently receives a
full reach/competitive/likely classification with a numeric estimate range** — including
a student targeting a German or Turkish university, where RULE-ADMISSIONS-003
("no country researched publishes a percentage-weighted admissions formula... any
admissions-outlook feature must use qualitative ranges with explicit uncertainty, never
false-precision numbers") and the design spec's own §3.3-3.4 say this framing is actively
wrong, not just imprecise.

Confirmed via `git grep` across `origin/main` for every use of `admissionSystemType` and
`credential_gate`: the type declaration, its test file, and these two callers are the
*entire* set of hits. **No Gate-1 lookup — a function or table that decides what
`admissionSystemType` a given target should have — exists anywhere in the codebase.**
This is consistent with the design spec, which explicitly scopes itself as "named, not
implemented" (§7) — the spec was never claiming this was wired up. But it means the
feature, as shipped, has **zero live effect** right now, not a partial or approximate
effect. One relevant, currently-unused asset: `universities.application_system`
(`types/database.ts`, migration comment: *"the application route students actually use —
UCAS, Common App, Studielink, Parcoursup, ÖSYM/YKS, uni-assist, direct"*) already exists
as a column and is exactly the kind of signal a Gate-1 lookup would key off, but nothing
currently reads it for that purpose.

## What ORYN already does right (for calibration — this analysis isn't only bad news)

- `lib/requirements/evaluate.ts:100-113` and `lib/scoring/dimensions/academics.ts:34-35`
  both explicitly refuse to compare GPAs across curricula/scales — the exact discipline
  RULE-ADMISSIONS-004 requires, and `evaluate.ts`'s own comment cites the sibling module by
  name to keep the two from silently disagreeing.
- `academics.ts:36-39,83-88` scores standardized-test *presence*, never the *value*,
  specifically because "comparing an SAT score to an IB predicted grade without a
  validated conversion table would be exactly the kind of false-precision cross-system
  comparison the product spec prohibits" — independently arrived at, matches this
  package's own sourcing discipline.
- `academics.ts:5-13`'s `RIGOR_WEIGHT` gap (no `CourseLevel` value for non-AP/IB/A-Level
  rigor, e.g. a Turkish Fen Lisesi track) is **already known and explicitly documented
  in-code**, not silently wrong — the comment names the exact fix (a new enum value, a
  schema migration) and says why it's out of scope for that pass. This is a pre-existing,
  already-flagged gap (this package's own secondary-education research, R2.1, found the
  same thing independently), not a new discovery — listed below because this pass adds
  concrete evidence (Turkey's OBP formula, RULE-ADMISSIONS-020) for why it's worth
  prioritizing now, not because it was previously hidden.
- `outlook.ts:96` correctly suppresses the numeric estimate range specifically for
  `credential_gate` inputs, even though (per the wiring gap above) nothing currently sets
  that input to `credential_gate` in practice — the logic itself, once fed the right
  input, does the right thing.
- `lib/opportunities/matching.ts:43-58` already handles one real cross-country data
  quality issue correctly (a student's own `country` field and an opportunity's
  `eligible_countries` naming the same country differently — "Türkiye" vs "Turkey" — via
  an explicit alias map, confirmed against a live-observed profile) and reuses one
  `isSameCountry` function rather than risking two independent country-matching
  implementations drifting apart.

## Gap 1 — Binary Gate-1 conflates at least three shapes my research found, not two

The design spec's Gate-1 (§2: "does non-academic evidence get reviewed at all?") and
`outlook.ts`'s `admissionSystemType` are both binary. My country research shows (at
minimum) three shapes that need different counselor framing, not two:

1. **Holistic review** (US always; UK/France narrowly) — evidence review genuinely
   happens, "reach/competitive/likely" is a meaningful framing.
2. **Centralized algorithmic score-rank placement** (Turkey/YKS, Ireland/CAO domestic
   route) — no evidence review, AND a real, if opaque-to-ORYN, competitive ranking exists.
   A cutoff exists in principle; ORYN just doesn't have it. "Not applicable" is roughly
   right here, but for a different reason than shape 3.
3. **Threshold/qualification-eligibility, non-competitive** (Netherlands/Italy
   *non-restricted* programmes — RULE-ADMISSIONS-001) — no evidence review, AND no
   ranking/competition at all once the threshold is met: eligible functionally equals
   admitted. "Reach/competitive/likely" isn't just inapplicable here, the entire concept
   of "your chances" doesn't describe the mechanism — a different message than shape 2's
   "there's a real cutoff, ORYN just can't see it."

`outlook.ts`'s single `not_applicable` outcome and single static `notApplicableReason`
string (`outlook.ts:113-115`, worded around "credential/exam-gated") fits shape 2 well
but would read oddly for shape 3 — Dutch open-programme admission isn't "exam-gated" in
any sense a student would recognize. Not urgent to fix before Gap 0 (the wiring) is
closed, but the eventual Gate-1 lookup's output type should be richer than a boolean
before it's built, not patched to be richer after — matching the design spec's own §7
item 1 hedge ("or a richer enum if a narrow-exception state needs its own value").

## Gap 2 — Gate-1 is keyed by country only; RULE-ADMISSIONS-013/014 need it keyed by
applicant pathway too

The design spec's own signal table (§1) keys geography off `target_universities →
university_id → universities.country` — one country value per target. But
RULE-ADMISSIONS-013 (Hong Kong's JUPAS/non-JUPAS split, France's Parcoursup/DAP split)
and RULE-ADMISSIONS-014 (Ireland's CAO/non-EU-direct split — the sharpest example, two
*structurally opposite* evidence models in one country) both show that **which pathway
applies depends on the applicant's own citizenship/schooling location relative to the
target country, not the target country alone.** A Turkish student targeting France needs
the DAP framing (essays absent from the official form, capped at 3 choices, TCF gate);
the same target-country value for a French Bac holder needs the Parcoursup framing
(essays sometimes present, capped at 10 choices, no language test). Country-keyed Gate-1
cannot represent this — it would give the same answer to both students. This is a
distinct problem from the design spec's own already-flagged §6 warning ("never key this
conditional off nationality/residence/curriculum alone" — that warning is about not
defaulting to the *student's own* country; this gap is about the *target* country's
pathway also depending on the student, which the existing warning doesn't cover). At
minimum France, Hong Kong, and Ireland need this; Turkey needs the mirror case
(RULE-ADMISSIONS-017 — domestic vs. foreign-national pathway, split by schooling
location, not nationality) for a Turkish citizen schooled abroad targeting a Turkish
university.

**2026-09-03 deep-dive:** [`turkey-schooling-location-gap-2026-09-03.md`](./turkey-schooling-location-gap-2026-09-03.md)
traces this specific case precisely — `resolvePathway`'s actual code, what it returns for each
of Turkey's three named schooling-location exceptions (embassy school, MOBİS-listed institution,
MEB-project-relocated), whether the shipped copy actively misleads those students or is merely
incomplete (it misleads), and whether any of the 11 real profiles in `oryn-qa-scratch` are
currently affected (checked directly: no confirmed case, though 2 of 5 Turkey-resident profiles'
schools remain unconfirmed either way).

## Gap 3 — Gate-1 needs institution granularity, not just country + field

The design spec's §7 item 3 proposes a field-specific override layer keyed on `(target
country, target field)`. RULE-ADMISSIONS-018 and 019 — both confirmed independently by
two separate program-family research passes (Engineering and Computer Science; see
README.md's ruleset) — show this key is missing a dimension:
NUS shows **zero** test/interview across all ten core Engineering majors while requiring
one for Architecture in the *same college*; Switzerland is fully open for Computer
Science/Architecture/Engineering but EMS-gated for Medicine only; Ireland's TU Dublin
bakes a portfolio into initial CAO points for Architecture while UCD (same country, same
CAO "Restricted" flag) doesn't. A `(country, field)` key would get the France/Germany/
Turkey/Switzerland *field* differences right but still can't represent NUS
Engineering-vs-Architecture or TU-Dublin-vs-UCD, both same-country-same-field cases where
the *institution* is the operative variable. The eventual override table needs a
`(country, institution, field)` key, or an explicit "institution overrides field default"
layer — not a structural rewrite of the spec, just a wider key than currently proposed.

## Gap 4 — RULE-ADMISSIONS-021 has no representation anywhere in the checked code or spec

Neither the design spec nor any of the four code files models "does this field exist as
an *undergraduate* credential in this country at all." RULE-ADMISSIONS-021: Medicine and
Law are both graduate-entry-only in the US (Law also effectively so in Canada outside a
narrow Quebec route). If a student sets an undergraduate target university with an
intended field of Medicine or Law in the US, nothing in the checked code — `outlook.ts`
takes no field parameter at all — stops it from producing a full holistic-style
reach/competitive/likely classification, exactly as if the target were real. **This is
the single clearest case in this whole analysis of the product giving a confidently wrong
answer rather than an honest unknown**, per the assignment's own framing: the target
doesn't just have unclear odds, it doesn't exist as stated. Fixing this needs (a) a
field-existence check somewhere upstream of outlook computation (not necessarily in
`outlook.ts` itself — could belong wherever a target university + intended field is
first captured/validated) and (b) a distinct message from "not_applicable" —
"not_applicable, this system doesn't review activities" is a different statement from
"this isn't offered as an undergraduate degree here at all," and conflating them into one
enum value would itself be a new, narrower version of Gap 1.

## Gap 5 — `lib/opportunities/matching.ts` is a different domain; one real but secondary
connection point exists

Opportunity eligibility (age/country/citizenship/grade, `matching.ts:84-139`) is a
different question from university-admissions evaluation, and none of the 21 rules
directly govern it — they're about how universities evaluate applicants, not who can
enter a competition or summer program. This file doesn't contradict the ruleset; it's
mostly orthogonal to it, and that's the correct assessment, not a gap to manufacture. One
real, secondary connection: `computeProfileNeedScore` (`matching.ts:191-195`) scores an
opportunity as high-need whenever it addresses a student's weakest profile dimension,
with no awareness of the student's target admissions system's Gate-1 status. A
Turkey-YKS-track student with a weak `leadership` dimension would score a
leadership-building opportunity as high profile-need, when RULE-ADMISSIONS-021's sibling
finding (leadership has zero channel into YKS placement — confirmed independently by this
package's Turkey research and the counseling lane's RULE-COUNSEL-057/109) means that
opportunity doesn't move their primary admissions outcome, even though it may still be
worthwhile for general development or a different target. Not urgent — this is a
missing *nuance* in an already-reasonable heuristic, not a wrong answer — but worth
noting since it's the same underlying Gate-1 concept recurring in a second subsystem.

## `lib/scoring/dimensions/academics.ts` — deliberately NOT flagged as a gap

`scoreAcademics` computes unconditionally, with no Gate-1 awareness at all. This is very
likely correct by design, not a gap: the design spec's own §5 states "the 9-dimension
taxonomy remains valid development guidance regardless of tier," and
`AGENTS.md`/`PRODUCT_SPEC.md`'s own non-negotiable #11 ("career profile score is
different from admissions probability") argues the *development* score should stay
geography-independent while *admissions outlook* (where Gate-1 belongs) is a separate
layer. Recorded here explicitly so a future pass doesn't mistake this file's silence on
geography for an oversight.

## Design-spec stress test against all 15 countries — summary

Full reasoning above; consolidated here. The spec's four deeply-checked systems (US, UK
partially, Turkey, Germany) hold up well under cross-check — Turkey in particular is
independently confirmed by this package's own `turkey.md` with no substantive conflict,
a genuine success of the cross-lane verification process. Where it breaks, checked
against the other 11 countries and 7 programme families:
- Netherlands/Italy non-restricted programmes need a third Gate-1 shape (Gap 1).
- France (Parcoursup/DAP), Hong Kong (JUPAS/non-JUPAS), Ireland (CAO/non-EU-direct), and
  Turkey's own foreign-national pathway all break the country-only key (Gap 2).
- Singapore (NUS Engineering vs. Architecture), Switzerland (Medicine vs. everything
  else), and Ireland (TU Dublin vs. UCD Architecture) break the `(country, field)` key
  proposed in §7 item 3 (Gap 3).
- Medicine/Law's US/Canada graduate-entry-only status (RULE-ADMISSIONS-021) isn't
  addressed anywhere in the spec (Gap 4).
- Spain, Australia, New Zealand, Canada, Switzerland's non-Medicine fields, and most of
  the 7 programme families weren't part of the spec's own deep-check set at all — not a
  contradiction, just unchecked territory, consistent with the spec's own §0 honesty
  about uneven coverage.

## Prioritized engineering backlog

Ranked by how wrong the product would be *today* if left unfixed, not by implementation
effort. Full detail, evidence, and proposed fix shape per item in
[`backlog.json`](../../../../data/research/admissions-systems/implementation-gap/backlog.json).

**Tier 0 — actively, confidently wrong right now, in production:**
1. `admissionSystemType` is never populated by either real caller — every student
   currently gets holistic framing regardless of target country (Top-line finding above).
2. No field-existence check — a student targeting undergraduate Medicine/Law in the
   US/Canada gets a normal outlook for something that isn't offered as an undergraduate
   credential there (Gap 4 / RULE-ADMISSIONS-021).

**Tier 1 — would still produce a wrong-shaped answer once Tier 0 is fixed:**
3. Gate-1's proposed binary/country-keyed shape can't represent the
   Netherlands/Italy-style non-competitive-threshold case (Gap 1).
4. Gate-1 needs applicant-pathway keying, not just target-country keying, for
   France/Hong Kong/Ireland/Turkey (Gap 2).
5. The field-override layer needs an institution dimension, not just
   (country, field) (Gap 3).

**Tier 2 — known, already honestly flagged in-code, not silently wrong, but now has
stronger evidence to justify prioritizing:**
6. `CourseLevel` enum has no value for non-AP/IB/A-Level rigor (Turkish Fen Lisesi track,
   and — new evidence from this pass — nothing represents Turkey's OBP diploma-grade
   mechanic or RULE-ADMISSIONS-020's talent-substitutes-for-qualification pattern either).

**Tier 3 — secondary refinement, not a wrong answer today:**
7. `computeProfileNeedScore` doesn't condition opportunity relevance on the student's
   target system's Gate-1 status (Gap 5).

## Unresolved / out of this pass's scope

- Whether the UI layer ever displays `compositeScore`/`selectivityTier` even when
  `outlook === "not_applicable"` — not visible from the four files checked; would need
  the consuming React components to confirm.
- Whether any other call site of `computeAdmissionOutlook` exists outside what `git grep`
  found (a test-only script, `scripts/qa-counselor-loop.ts`, also omits the field — listed
  for completeness, not counted as a third production gap since it's a QA tool, not a
  student-facing path).
- Full data-model design for the Gate-1/field-override lookup tables — sketched in shape
  (Gaps 1-3), not specified to migration-ready precision, consistent with this pass's own
  research-only scope.
