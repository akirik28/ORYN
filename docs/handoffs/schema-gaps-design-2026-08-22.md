# Schema gaps, consolidated — design proposal

**Status:** design + measurement. **No database was written. No migration applied.**
**Date:** 2026-08-22.
**Scope:** every research lane across the last two days surfaced individual "the schema can't
hold this fact" findings — 11 counselor-knowledge country docs, a dozen requirements/programmes/
opportunities research lanes. This document is the first pass at looking at them together rather
than one at a time. Companion precedent: `docs/handoffs/requirements-ingestion-design.md`
(2026-08-21, unapplied except for its §1/§3/§4/§6/§8/§9, which shipped as migration `0056`) — that
document is not superseded by this one; where a finding below is the same shape 0056 already
solved, this document says so and moves on rather than re-deriving it.

**Grouping is the point.** Four buckets below hold roughly a dozen individual findings, and several
turn out to be one underlying gap wearing different institutions' clothes — see each group's own
"what this collapses to" note.

---

## Group A — Structural eligibility that isn't a threshold

The common shape: age, country and a published score all say "eligible," and the student still
hits a wall, because the real gate is something the schema has no column for — an absent row, an
institutional channel, a conditional test, a compound rule, or a scope the schema can't attach to
a *deadline* the way it already can to a *requirement*.

### A1. Eligibility encoded as absence — Ankara's TR-YÖS-only programmes

**Already fully designed in the precedent doc (§2), not re-litigated here.** Ankara's Medicine/
Dentistry/Computer Engineering programmes accept only TR-YÖS — the rule exists on the source page
as a heading (`REQ-2026-08-21-9321`) plus the *absence* of any SAT/A-Level row beneath it, and a
sibling record (`REQ-2026-08-21-9320`, TR-YÖS min 440) lands as an ordinary accepted row with
nothing attached recording that it governs only some programmes.

**Today.** `university_requirements.is_exclusion`, `requirement_group_id`, `group_role`,
`clause_ref` **already exist** (migration `0052`). `AcceptedRequirementRow` (the ingestion
pipeline's internal type, `lib/requirements/ingest.ts`) never sets any of them, so every exclusion
record is currently blocked at `decideRequirementIngestion` with a stale error message asserting a
column that has existed since 0052. The schema grew the capability; the ingestion code was never
told.

**Must.** Carry the four fields through to the written row; gate the positive sibling when its
governing exclusion can't be attached.

**Change.** **Code only, no migration** — extend `AcceptedRequirementRow` and wire
`evaluation_gate = 'eligibility_restriction'` (already a valid value per 0056 §4). **Judgement
call, unresolved in the precedent doc, restated here because it recurs in A2–A4 below**: when an
exclusion can't be attached to its positive sibling, does the sibling land blocked (safest, costs
real facts) or land gated to `needs_manual_review` (keeps the fact visible)? The precedent doc
recommends the former only where the link is unambiguous and the latter elsewhere. Still not
implemented; still the founder's call.

### A2. Deadlines have no applicant-scope column

**Citation correction, done honestly rather than silently.** This section was originally briefed
to me as "NTNU's citizenship-dependent deadline." A dedicated search of the full corpus (research
JSONL, `docs/research/**`, `docs/handoffs/**`) found **no NTNU admissions record of any kind** —
the only NTNU hits are an unrelated competition-cofounder mention and a Taiwan Normal University
false-positive in a different lane's handoff. I am not citing it. The closest real analogue found
is **Sorbonne Université** (`data/research/university-requirements/fr_it_requirements_
sorbonne_2026-08-21.jsonl`, `SOR0001`–`SOR0003`): *"the applicable pathway depends on BOTH
EU-citizenship status AND diploma type — three combinations, not two: (1) non-EU + French Bac →
[pathway], (2) non-EU + foreign diploma → DAP, (3) EU/Switzerland/Norway/Iceland/Liechtenstein, any
diploma → Parcoursup."* That is not quite the same shape, though — Sorbonne routes an applicant to
a **different application system entirely** based on citizenship (already covered by this
product's France counselor-knowledge doc as the Parcoursup-vs-DAP split), not two different
**deadline dates for the identical programme and system**, which is the specific shape this section
is about.

**The schema gap stands on its own regardless of which institution motivates it — verified
directly against the schema, not inferred from either citation above.** `university_requirements.
scope` already exists (migration `0042`); `university_deadlines` has no equivalent column at all,
checked directly against `types/database.ts`'s `UniversityDeadline` interface. That asymmetry is
real and checkable independent of any specific example institution. **The general shape this gap would bite on**, stated without a specific-institution citation I
can't back: a university publishes a genuinely different application deadline for the *same*
programme depending on the applicant's citizenship or fee status — not a different programme, not
a different requirement, the same seat with two real dates gated on a fact `university_deadlines`
cannot express. This is not hypothetical in kind — the counselor-knowledge research pass already
found the identical *requirements*-side shape repeatedly (Ireland's CAO vs. non-EU/direct routes,
Trinity's separate non-EU application timeline) — only the *deadline* table lacks the column the
*requirement* table already has for exactly this.

**Today.** `university_requirements.scope` already exists (migration `0042`, free text, e.g.
`"international_undergraduate"`) — a requirement can already say who it applies to.
**`university_deadlines` has no equivalent column.** Checked directly against
`types/database.ts`'s `UniversityDeadline` interface: `deadline_type`, `deadline_date`,
`application_cycle`, `recurrence*`, `verification_state`, `binding_policy`,
`conflict_group_id`, `research_record_id` — no scope, no applicant category, nothing. Two rows for
the same programme with different dates and no scope column are indistinguishable from a source
conflict (which `conflict_group_id` exists for) even though they are not one — both dates are
correct, for different people, simultaneously. Wiring a citizenship-scoped deadline pair through
today's schema would either merge them into one row (losing a real date) or leave two unscoped rows
that a reader can't tell apart from a genuine disagreement.

**Must.** Let a deadline row state who it applies to, the same way a requirement already can.

**Change.** **Forced, low-risk — mirrors an existing, already-proven column exactly.**
`university_deadlines.scope text`, same free-text convention as `university_requirements.scope`
(no CHECK constraint there either — deliberately, since the vocabulary is applicant-category prose
like `"EU/EEA citizens"` / `"non-EU citizens"`, not a closed enum). See the migration below.

### A3. Conditional applicability — Switzerland's EMS, triggered by that cycle's demand

**Citation correction.** Briefed to me as "Vienna's demand-triggered entrance exam." No Austria/
Vienna admissions research exists in this corpus at all — a dedicated search confirmed
`data/research/admissions-systems/` covers 15 countries and Austria is not one of them. The real,
confirmed record of this exact shape is Switzerland's **EMS** (Eignungstest für das Medizinstudium),
already cited in this product's Switzerland counselor-knowledge doc and independently re-confirmed
in `data/research/admissions-systems/admissions-systems-v1.json`: *"EMS activates specifically 'when
the number of study-interested persons exceeds the number of available study places by more than 20
percent.'"* I'm using this record, not the unconfirmed Vienna one.

**The case.** EMS — required for Medicine/Dentistry/Vet Med at Basel/Bern/Fribourg/Zurich/USI/ETH
Zurich — is administered **only when that cycle's applications exceed available places by more than
20%**, per swissuniversities' own published rule. Not a fixed requirement a student can be told
about with certainty in advance, and not knowable at research time whether it will trigger for any
*future* cycle.

**Today.** No shape in the corpus resembles this in the precedent doc's inventory. Every existing
`evaluation_gate` value (`inverted_recency`, `recency_window`, `unstated_scale`,
`incomparable_scale`, `named_exclusion`, `eligibility_restriction`, `age_bar`, `source_conflict`,
`historical`, `binding_commitment`) answers "can this specific row be safely evaluated," never "does
this requirement even exist this cycle." Storing EMS as an ordinary `entrance_exam` row
with `is_required = true` overstates it — a student preparing for a test that may not run wastes
real effort, and a student *not* preparing, if the threshold is crossed and the exam does run, is
caught unprepared. Both are real failure directions, not just one.

**Must.** Distinguish "this requirement is currently in force" from "this requirement may or may not
apply this cycle, contingent on a fact ORYN cannot observe in advance (that cycle's applicant
volume)."

**Change — forced infrastructure, product-policy judgement call on the wording shown to students.**
Add `'cycle_contingent'` to the `evaluation_gate` CHECK list — the identical low-risk pattern
0056 itself used when `binding_commitment` was added after the fact (a permissive IN-list
widening; every existing row is null and trivially satisfies it). **Judgement call:** how this is
surfaced. Options: (a) hide the requirement entirely until a cycle confirms it exists — loses real,
useful advance warning; (b) show it labelled "may apply, depending on demand" — honest, consistent
with Phase 68; (c) show it as a normal requirement — **must not be chosen**, it is not one.
**Recommend (b)**, unimplemented, needs a decision the same way 0056's §7/§8 judgement calls do.

### A4. Participation-only instruments

**Citation withdrawn.** Briefed to me as "Ghent's ijkingstoets — mandatory, no pass mark." A
dedicated corpus search found **zero hits** for "ijkingstoets" anywhere in the repository, and no
Belgian/Flemish admissions-test research exists at all — Ghent appears only in an unrelated
dropped-candidates list from an opportunities research pass. I am not citing this as a corpus
finding. **The shape itself (a mandatory instrument with no pass/fail threshold, satisfied by
participation alone) is plausible and worth naming, but this document has no verified example of
it** — unlike A3/EMS and C2/OFA below, both of which are independently confirmed. Recommend the
coordinator supply the actual source if this shape is to be acted on; until then, treat the
paragraph below as a hypothesis this document flags rather than a sourced finding.

**The hypothesised case, unsourced.** An instrument that is mandatory to sit and has **no pass mark
at all** — satisfied by participation, not by a score threshold. If real, this is a different shape
from Italy's OFA (Group C below, which *is* sourced): OFA's threshold means two different things
depending on programme type; this hypothesised shape would have no threshold to mean anything at
all.

**Today.** `structured_rule`'s `test_score` shape (`lib/requirements/types.ts`) is
`{testName, minScore?, minPercentileRank?}` — both threshold fields are optional, so a
`test_score` rule with neither set is technically expressible, but nothing in `evaluate.ts`
special-cases "no threshold means automatically met once evidence of participation exists" — an
absent threshold today most likely falls through to `needs_manual_review` by the same
fail-safe default the precedent doc documents for every under-specified rule, which is *safe* but
not *correct*: it should resolve `met` once a test-taken fact exists, never stay permanently
unresolvable.

**Must.** A `structured_rule` shape (or a `requirement_evaluation_status` path) that resolves `met`
from "test was taken," independent of any score.

**Change — code, not schema.** No new column: this is representable today by a `test_score` rule
with both threshold fields absent, once `evaluate.ts` is taught that shape means
"met iff a test-taken fact exists," not "fall through to manual review." Flagged here rather than
silently left as a migration item because it looks schema-shaped and isn't — the honest fix is in
`lib/requirements/evaluate.ts`, and belongs on that lane's list, not this one's.

### A5. Institution-mediated access — THIMUN, and opportunities' missing "how do you even apply" dimension

**The case, confirmed.** `data/research/opportunities/leadership_batch4_2026-08-21.jsonl`
(`canonical_name: "THIMUN The Hague Conference"`): *"Attendance is through a registered school
delegation — 'Only students from participating schools can apply for an individual student
position'"*. The record's own researcher notes state the product implication directly: *"like Young
Enterprise and Euroscola, this is school-mediated — a student whose school does not register has no
route in, and the individual-role applications are open only to students at already-participating
schools. That is a real access constraint and ORYN should not present THIMUN as something a
motivated student can pursue unilaterally."* `docs/research/opportunities-leadership-impact/
README.md` independently corroborates the two-tier structure (school-delegation attendance vs. a
competitive Student Officer/chair role). A student personally eligible on every published criterion
(age, country, interest) still cannot apply directly if their own school does not participate — not
an eligibility restriction on the *student*, a precondition on an *institution* the student doesn't
control.

**Today.** `opportunities`' eligibility columns — `eligible_countries`, `eligible_citizenships`,
`eligible_grades`, `minimum_age`/`maximum_age` — are all personal-attribute checks, confirmed
directly against `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility()`: every check
in that function tests the *student's own* profile fields against the opportunity's columns. There
is no column, and no `EligibilityVerdict` value, for "you qualify, but only if your school
independently participates" — `known_eligible` / `known_ineligible` / `unknown` all say something
false here: `known_eligible` overpromises (implies a student can just apply), `known_ineligible`
underclaims (the student genuinely does qualify, in the sense that matters for advice — "ask your
school to register"), and `unknown` throws away a fact ORYN actually has.

**Must.** Represent "the application channel runs through an institution, not the student
directly" as a first-class fact distinct from personal-attribute eligibility.

**Change — forced column, product-policy judgement call on the advisor's specific wording.**
`opportunities.access_channel text` (nullable, `direct` | `institution_mediated`; null = unknown/
not researched, same convention as every other nullable eligibility column on this table — never
default to `direct`, since that's an unverified claim, not an absence of a restriction). A new
`EligibilityVerdict` value (`counselor` lane's type, `lib/counselor/types.ts`) —
e.g. `known_eligible_institution_mediated` — is the natural pairing, but that's this document
flagging the shape, not deciding the counselor-side vocabulary; **recommend leaving the exact
verdict taxonomy to whoever owns `lib/counselor/types.ts`**, since it's read by UI copy this
document's author hasn't audited.

### A6. Compound eligibility with no structured home — citation not found, recommendation withheld

**Citation withdrawn — this is the one item in this document I could not source at all.** Briefed
to me as "Brookes Engage — requires England residency plus school type plus means-testing." A
dedicated search covered every `data/research/opportunities/*.jsonl` file, every
`docs/research/opportunities*` doc, and a full-repo grep for "Brookes," "Engage,"
"means-tested," and "England resident." The only "Brookes" hits in the entire corpus concern
**Oxford Brookes as an institution** (an entity-identity collision note in
`data/research/canonical-entities/institution-collision-traps.json`), not an opportunity or
scholarship scheme. No record matching this description exists anywhere I could find. I am not
proposing a schema change against a fact I cannot verify exists, and I am not describing its
specifics as if sourced — doing either would be exactly the fabrication this whole research
programme's standing discipline exists to prevent.

**What I can say without the citation.** *If* a scheme with this shape is real (compound
eligibility spanning three different kinds of condition — sub-national residency, a categorical
school-type restriction, and income-based means-testing), the schema genuinely has no structured
home for it today: `eligible_countries` is nation-level, not sub-national; there is no school-type
column; there is no income/means-testing column anywhere on `opportunities`. The established
pattern on this table (migration `0047`'s own stated reasoning: *"too complex or ambiguous to
safely reduce to a flat list stays in free text"*) already anticipates exactly this shape and
already has a fallback — `citizenship_restrictions`/`residency_restrictions` free text. **This
document's tentative recommendation, contingent on the source actually existing, is to leave it in
free text rather than add three narrow structured columns for what would currently be zero
confirmed records** — the same "don't guess a schema change to fit a handful of records"
discipline migration `0054` applied to Istanbul's three-record collision, with less evidence behind
it here than that decision had. **Action needed from the coordinator: supply the actual source
(file path or URL) before this finding is acted on at all**, schema change or otherwise.

---

## Group B — Same name, different programme

**What this collapses to:** every finding in this group is the identical underlying shape —
`university_programs`' identity key is missing a discriminator that some source publishes and the
schema doesn't capture — and **two of the four cited findings are already solved**, which is worth
stating plainly before proposing anything new.

### B1. Already solved — Durham BSc vs MChem

Migration `0054` added `degree_type` to the dedup key specifically for this shape: "Durham's
'Chemistry' as both 'MChem (Hons)' and 'BSc (Hons)'... identical on every column the [pre-0054]
key checks... differing ONLY in degree_type." No further work needed; cited here only so this
document's reader doesn't re-propose it.

### B2. Already partly solved, backfill pending — YÖK's kilavuz_kodu precedent

Migration `0057` (unapplied — explicitly gated on a second founder authorization per its own
header) added `kilavuz_kodu`, YÖK Atlas's own stable per-programme identifier, as a plain nullable
column — not yet in the dedup key, not yet backfilled. This is the exact precedent pattern the
remaining Group B findings should follow: **add the external identifier as a plain column first,
wire it into the dedup key only once backfill coverage is measured**, not guessed.

### B3. UCAS course codes — real gap, but not the case it was briefed as

**Citation corrected, not confirmed as described.** Briefed to me as "Manchester's American
Studies — one title, two UCAS codes." A dedicated search found no such record: the only Manchester
"American Studies BA" row in the corpus
(`data/research/university-programs/independent_batch6_2026-08-21.jsonl`, `RSRCH-2026-08-21-
B6-0007`) is a single row, no duplicate title, no second UCAS code. I am not citing the Manchester
example.

**What the search found instead, and it argues for a more cautious change than the brief
implied.** Two real, confirmed cases of UCAS-code irregularity exist, and both cut the *opposite*
direction from "one title needs two codes":

- **Southampton** (`independent_batch36_2026-08-21.jsonl`, `B36-0205`/`0206`/`0207`): *"UCAS code
  F303 is listed identically for three different MPhys Physics titles ('Physics', 'Physics with
  Industrial Placement', 'Physics with Year of Experimental Research')"* — one code shared across
  three genuinely different, already-distinguished-by-title programmes.
- **QMUL** (`docs/handoffs/claude-a-university-spine.md`, line 3646): *"Each course's UCAS-code
  field is often a space-separated list of several codes (full-time / foundation-year / study-abroad
  variants) rather than one code per row."*

Confirmed independently: **no `ucas_code` column exists anywhere on `university_programs`** —
unlike YÖK Atlas's `kilavuz_kodu` (migration `0057`), UCAS codes today live only as free text inside
`researcher_notes` on the raw research records, never promoted to schema.

**Must.** A place to store UCAS codes for traceability — that part is forced, evidenced
independently of the withdrawn Manchester citation. **What is not forced, and where this document
now recommends more caution than its original brief implied**: Southampton's and QMUL's confirmed
shapes show a UCAS code is **not** a clean 1:1 programme discriminator the way `kilavuz_kodu`
apparently is for YÖK Atlas — one code can legitimately cover several titles, and one row can
legitimately carry several codes. Widening the dedup key with a raw `ucas_code` column, the way
`degree_type` was widened into it in migration `0054`, could be actively wrong for Southampton's
case (three real, already-distinguished programmes sharing one code would not need it, and a
multi-value QMUL-shaped field can't be a scalar dedup-key column at all without first deciding how
to split it).

**Change — forced column only, no dedup-key change; recommend against B3 being treated as
equivalent to B2 despite the surface similarity.** `ucas_code text` (plain, nullable, not unique,
not in any index) on `university_programs`, following the `kilavuz_kodu` precedent's *shape*
(store the identifier, don't wire it into dedup) but explicitly **not** recommending B2's next
step (measuring toward a dedup-key widening) until QMUL's multi-code-per-row shape is resolved at
the application layer first — storing a single scalar column for a field that can hold several
values would silently drop data the way a premature dedup-key widening would, the same failure
mode this document's Group A findings are about.

### B4. Wisconsin's Individual Major — already solved, not a new finding

**Corrected, not confirmed as described.** Briefed to me as "exists three times across three
schools." The real records (`independent_batch9_2026-08-21.jsonl`, `B9-0200`/`0201`/`0202`) are
**three degree types, not three schools**: `"Individual Major, BA"` (`degree_type: "BA"`),
`"Individual Major, BS"` (`degree_type: "BS"`), `"Individual Major, BSE"` (`degree_type: "BSE"`) —
all three share `faculty_or_school: null` and the identical `official_program_url`. This is exactly
the shape migration `0054` was built for: three rows, identical on every column except
`degree_type`, which the dedup key (`university_id, normalized_name, degree_level,
language_of_instruction, official_program_url, degree_type`) already includes.

**No gap. No schema change.** This is worth stating plainly rather than silently dropping: it
confirms `0054` is doing exactly the job it was designed for, on a case its own author never saw.
If these three rows are colliding in practice, the bug is in ingestion code failing to read
`degree_type` correctly for this source, not in the schema — a different lane's problem, not this
document's.

### B5. NYU Nursing — citation not found

**Citation withdrawn.** Briefed to me as "splits accelerated from traditional in a second
parenthetical." The only NYU Nursing record in the corpus
(`data/research/university-requirements/us_requirements_nyu_2026-08-21.jsonl`, `REQ-2026-08-21-
NYU0023`) is a single chemistry-prerequisite requirement for "Meyers School of Nursing," with a
researcher note about a *different* naming question (whether the canonical name should be "Rory
Meyers College of Nursing"). No "accelerated"/"traditional" program-name variant exists anywhere
in the corpus for NYU. I am not proposing a change against this citation. If a real
accelerated-vs-traditional split exists at NYU or elsewhere, the general shape is likely **already
representable with no schema change** — `normalized_name` already carries the full name string, so
two differently-parenthesized titles should already produce two distinct dedup keys — but that is
a hypothesis this document flags, not a finding it can stand behind.

---

## Group C — An instrument whose nature varies

### C1. Already solved — TR-YÖS threshold-format incomparability

Hacettepe (`400/500`, scored with denominator), Ankara (`"440 points"`, no denominator published),
METU (`"first 5th percentile"`, a rank not a score) — this is precisely what migration `0056` §1's
`test_scale`/`scale_ambiguity` columns exist to hold (`TR_YOS_0_500` vs `TR_YOS_SCALE_UNSTATED` vs
`TR_YOS_PERCENTILE_RANK` as distinct `test_scale` values). **No new work; already designed and
applied.** Cited here so it isn't re-proposed as new.

### C2. New — Italy's OFA: the same test is a hard gate here, a diagnostic there

**The case.** The identical CISIA test (TOLC/CEnT-S) is, at the same university, a **binding
selective ranking criterion** for a restricted-access programme and a **non-binding diagnostic**
for an open-access one — a low score at the second doesn't block enrollment, it triggers a deferred
remedial obligation (OFA, obbligo formativo aggiuntivo) with real downstream consequences.

**Today.** Nothing on `university_requirements` states what happens when a requirement is **not
met**. `requirement_evaluation_status` (`met | likely_met | not_met | unknown | needs_manual_review`,
migration `0020`) is an evaluation *outcome*; nothing upstream of it says whether a `not_met`
outcome should mean "rejected" (true almost everywhere, and the implicit assumption the whole
product is built on) or "conditionally admitted, with a remedial obligation attached" (true for
OFA-diagnostic rows specifically). This finding stands on the Italy OFA evidence alone — solidly
sourced independently in this product's own `docs/counselor-knowledge/italy.md` and the underlying
`fr_it_requirements_bologna_2026-08-21.jsonl`/`polimi` records — and does not depend on A4's
withdrawn Ghent citation above; A4's hypothesised "no consequence field for a non-blocking
instrument" shape would be a lighter version of the identical gap *if* it turns out to be real, but
this column's justification does not require it.

**Must.** Let a requirement row state its own consequence-if-not-met, independent of the threshold
comparison itself.

**Change — forced, new column, product-policy judgement call on how it's surfaced.**
`university_requirements.unmet_consequence text`, CHECK `∈ ('blocks_admission',
'triggers_remediation', 'advisory_only')`, nullable, **null meaning `blocks_admission`** (the
current, universal implicit assumption — this preserves today's behavior for all 84 live rows and
every future row that doesn't explicitly say otherwise; the same "additive, never silently
reinterprets an existing row" discipline every migration in this codebase follows). **Judgement
call:** should the advisor's UI distinguish "you don't meet this and won't be admitted" from "you
don't meet this and will need to complete extra coursework, but can still enroll" — this document
recommends yes (it's a materially different, less alarming fact for a student to hear), but the
exact copy is a product decision, not a schema one.

### C3. Note on collapsing, and on withdrawn citations generally

The coordinator's brief asked this document to surface where several findings turn out to be one
underlying gap. Two genuine collapses happened during this pass: OFA and the hypothesised
Ghent shape (if real) would be the same underlying gap (C2), and Manchester's withdrawn UCAS claim
turned out to overlap with a different, real UCAS-code irregularity (B3, Southampton/QMUL) that
argues for a more cautious change than the original framing implied. Filed here as the explicit
"collapsing is where the value is" note the brief asked for — five of the eleven individually
briefed findings (Brookes Engage, Vienna, Ghent, NTNU, Manchester-as-described) could not be
confirmed as briefed, which this document treats as a real result of the exercise, not a failure
of it: consolidating findings across a dozen parallel lanes is exactly how a one-line summary
drifts from its own source record, and this pass is the first time anyone checked.

---

## Group D — Sources that are stale but authoritative, and a new state: un-refreshable

### D1. Already resolved as non-conflicts — Harvard, and the general lesson

Harvard's 2021 testing page and CMU's three-way deadline "conflict" were both **closed** by a
parallel conflicts-verification lane during this same research window (see
`docs/counselor-knowledge/united-states.md`'s own corrected history) — Harvard's page self-scopes
to the 2021-22 cycle in its own first sentence; CMU's three sources all agree once a business-day
weekend/holiday-shift rule is applied. **Neither needed, or needs, a schema change** — they needed
correct reading, not new columns. Cited here as the negative case: not every "stale-looking source"
finding is a schema gap, and this document should not manufacture one where careful reading
resolves it, the same lesson the conflicts lane's Groningen correction (Netherlands doc) already
taught this pass once.

### D2. Genuinely open — Heidelberg's 2011/2018 PDFs, live, official, banner-less

**The case, distinct from D1.** Heidelberg's uni-assist requirement has **no current dated source
at all** to resolve against — only an undated live faculty page whose *silence* about uni-assist is
the entire counter-evidence, and a third PDF (found via search, presented as current 2026 guidance)
that turned out to be dated **winter semester 2011/12**. Unlike Harvard, there is no self-scoping
sentence and no five-current-pages consensus to resolve against — this is genuinely unresolved, not
merely unverified.

**Today.** `requirement_source_conflicts` (migration `0056` §8) models **two or more competing
official readings** of one fact. Heidelberg is a different shape: there is exactly **one** live
reading, and its problem is that it might be badly out of date with nothing to compare it against —
not two sources disagreeing. Filing Heidelberg into `requirement_source_conflicts` would be a
category error (it implies a second, competing source exists; none does).

**Must.** Represent "this is the only source we have, and its own freshness is itself in doubt" as
a state distinct from both `CONFLICTING_EVIDENCE` (two readings) and ordinary `unverified` (no
particular reason to doubt it).

**Change — forced, small, additive.** Add `'staleness_suspected'` to
`university_requirements.verification_state`'s allowed vocabulary (currently `verified_current |
verified_historical | verified_derived | unverified | conflicting`, migration `0042`) — same
permissive-widening pattern as every other enum addition in this document. **Not** the same fix as
`requirement_source_conflicts`; this is a one-source problem, that table is a two-source one.

### D3. Genuinely new — un-refreshable, distinct from stale and from unavailable

**The case.** Humboldt's two source URLs both now serve an anti-scraping challenge — not a 404
(`unavailable`), not old content read successfully (`stale`), but a source that **cannot currently
be re-checked by this product's own tooling at all**, regardless of how old the last successful
read was.

**Today.** `data_status` (migration `0006`, used on `universities` and — since migration `0020` —
`university_requirements`) is `fresh | stale | needs_review | unavailable`. None of the four
describes "we know this source exists and was readable before, but our own fetch tooling is
currently blocked from it" — that's a materially different situation from `unavailable` (which,
per Phase 29's own original intent, most naturally reads as "the source itself doesn't have this
information" or "404"), and conflating the two means a future refresh job can't distinguish "try
again later, this will probably work" from "this URL doesn't have the answer, stop retrying it."

**Must.** A `data_status` value naming this specific, real, distinct condition.

**Change — forced, additive.** Add `'access_blocked'` to the `data_status` enum
(`create type data_status as enum (...)`, migration `0006`) — Postgres enum types support additive
`ALTER TYPE ... ADD VALUE`, so this is a genuinely trivial, non-breaking widening, no CHECK
constraint rewrite needed the way the text-based enums elsewhere in this document require. Every
existing row keeps its current value; nothing is reinterpreted.

---

## Summary table

| Finding | Group | Evidence | Status | Migration needed |
|---|---|---|---|---|
| Ankara TR-YÖS-only (absence) | A1 | Confirmed (precedent doc) | Designed already | No (0052 columns exist) |
| Deadline applicant-scope gap | A2 | Schema gap confirmed directly; briefed citation (NTNU) not found | Forced | **Yes — `university_deadlines.scope`** |
| Conditional applicability | A3 | Confirmed via Switzerland's EMS; briefed citation (Vienna) not found | Forced infra; policy call on copy | **Yes — `evaluation_gate` widen** |
| Participation-only instrument | A4 | **Not found (Ghent)** — hypothesis only | Not actionable | No |
| THIMUN (school-mediated access) | A5 | **Confirmed**, exact quote | Forced column; policy call on verdict copy | **Yes — `opportunities.access_channel`** |
| Compound eligibility | A6 | **Not found (Brookes Engage)** | Not actionable — awaiting source | No |
| Durham BSc/MChem | B1 | Confirmed | Solved (0054) | No |
| YÖK kilavuz_kodu | B2 | Confirmed | Solved, unbacked (0057, unapplied) | Already written |
| UCAS course codes | B3 | Gap confirmed (Southampton/QMUL); briefed citation (Manchester) not found | Forced column only, NOT dedup key | **Yes — `ucas_code`, plain column** |
| Wisconsin Individual Major ×3 | B4 | Confirmed, corrected (3 degree_types not 3 schools) | **Already solved by 0054** | No |
| NYU Nursing parenthetical | B5 | **Not found** | Not actionable | No |
| TR-YÖS scale incomparability | C1 | Confirmed | Solved (0056 §1) | No |
| Italy OFA dual role | C2 | Confirmed, independently sourced | Forced column; policy call on copy | **Yes — `unmet_consequence`** |
| Harvard/CMU "conflicts" | D1 | Confirmed resolved | Not a gap | No |
| Heidelberg stale PDFs | D2 | Confirmed (own prior research) | Forced | **Yes — `verification_state` widen** |
| Humboldt anti-scraping | D3 | Confirmed (own prior research + coordinator report) | Forced | **Yes — `data_status` widen** |

**Five forced schema changes** (not six — A3/EMS and D2/D3 stand on confirmed evidence, but the
originally-anticipated sixth line, Manchester's UCAS-codes-in-the-dedup-key change, was downgraded
to "plain column only" once the confirmed Southampton/QMUL evidence argued against a dedup-key
change). All additive, all zero-risk to existing rows (nullable columns default null, enum/CHECK
widenings are permissive, no existing row is reinterpreted). Written as migration `0059` — see
`supabase/migrations/0059_schema_gaps_2026-08-22.sql`, unapplied. **Four of the eleven originally
briefed findings (A4/Ghent, A6/Brookes Engage, B3-as-Manchester, B5/NYU Nursing) could not be
confirmed in the corpus and are not represented in the migration** — see each section above for
what was searched and what, if anything, was found in its place. This is reported as a result, not
hidden as a gap in this document's own diligence.

---

## What this document deliberately does not do

Does not resolve any of the five product-policy judgement calls this pass surfaced (A1's
ungrouped-exclusion handling, A3's cycle-contingent copy, A5's verdict taxonomy, C2's
remediation-vs-rejection UI framing) or the judgement calls the precedent doc already left open
(0056 §2/§7/§8's own three). Does not touch `lib/requirements/evaluate.ts`, `shape-audit.ts`, or
any ingestion code — every code-only item above (A1, A4) is flagged as such precisely so it isn't
bundled into "needs a migration" and left waiting on one unnecessarily. Does not apply anything.
