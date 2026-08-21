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

**Reconciliation note (2026-08-22, same day).** The first version of this document searched a
corpus snapshot at its own branch point (`origin/main`@`2601c71`) and could not confirm 4 of 11
originally-briefed findings (Ghent, Brookes Engage, Vienna, NTNU) plus one detail (Manchester's
specific framing). All four institutional findings turned out to be real — they landed on `main`
in a Nordic/Benelux requirements batch and an opportunities-discovery batch that arrived *after*
this branch's start point, not before it. Re-verified each directly against the actual records
(not the coordinator's paraphrase) after merging `origin/main` forward — see each section below
for the exact record IDs and quoted text now cited. **None of the corrections below changed the
migration's SQL** — Ghent, Brookes Engage, and NYU Nursing all independently confirm conclusions
already reached (a code fix, not a schema one; free text already sufficient; already representable
respectively), and Vienna/NTNU strengthen A3/A2's evidence without changing their column design.
One genuinely new item was added: B6, a real 23-programme Turkish dual-admission-track gap found
by a peer lane the same day, which does need one additional index-widening line in migration 0059.

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

### A2. Deadlines have no applicant-scope column — NTNU's citizenship-dependent deadline, confirmed

**Citation confirmed on re-check.** The first pass searched a snapshot that predated the Nordic/
Benelux requirements batch; NTNU's record landed on `main` after this branch's start point.
Verified directly: `data/research/university-requirements/nordic_requirements_ntnu_2026-08-22.jsonl`
gives four deadline rows, all `program_name: "International Master's programmes"` at the
**identical** university and programme — `DL-2026-08-22-NO-NTNU-001` ("Non-EU/non-EEA: 1
December"), `-002` ("EU/EEA: 1 March"), `-003` ("Nordic/Norwegian: 15 April"), and `-004`, which
states the rule explicitly rather than leaving it implicit in the other three: *"Note that the
deadline is 1 March for all applicants with a Norwegian or Nordic Citizenship and an education
background from a country outside the Nordics."* Same programme, same seat, three real dates keyed
purely on citizenship — exactly the shape originally briefed.

**Today.** `university_requirements.scope` already exists (migration `0042`); `university_deadlines`
has no equivalent column at all, checked directly against `types/database.ts`'s
`UniversityDeadline` interface. Two rows for NTNU's International Master's programmes with
different dates and no scope column are indistinguishable from a source conflict (which
`conflict_group_id` exists for) even though they are not one — all three dates are correct, for
three different applicant populations, simultaneously.

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

### A3. Conditional applicability — Vienna's demand-triggered entrance exam, confirmed, plus a second case

**Citation confirmed on re-check, and it is a better citation than the substitute I first used.**
The first pass searched a snapshot that predated the Nordic/Benelux batch and found no Austria
research at all, so I substituted Switzerland's EMS. Vienna's own record has since landed:
`data/research/university-requirements/nordic_requirements_vienna_2026-08-22.jsonl`,
`REQ-2026-08-22-AT-UNIVIE-001`, `VERIFIED_CURRENT`, quoting the university's own FAQ verbatim:
*"My desired degree programme says 'Test doesn't take place.' What does that mean? There is no
written test because there are fewer applications for admission than there are study places
available this year."* The record's own researcher notes name the shape precisely: *"An aptitude
test that may simply not happen. Storing 'entrance exam: required' is wrong in the years it is
waived and 'not required' is wrong in the years it is held. The honest representation is
conditional, with the condition named."* This is now the primary citation.

**The case, with two independent confirmations.** Vienna's entrance exam is skipped entirely in a
cycle where applications don't exceed available places — not a fixed requirement a student can be
told about with certainty in advance. Switzerland's **EMS** (required for Medicine/Dentistry/Vet
Med at Basel/Bern/Fribourg/Zurich/USI/ETH Zurich, activating specifically "when the number of
study-interested persons exceeds the number of available study places by more than 20 percent" per
swissuniversities' own published rule, already cited in this product's Switzerland
counselor-knowledge doc) is the same shape at a second institution in a second country — this is
now a confirmed, recurring pattern, not a single example.

**Today.** No shape in the corpus resembles this in the precedent doc's inventory. Every existing
`evaluation_gate` value (`inverted_recency`, `recency_window`, `unstated_scale`,
`incomparable_scale`, `named_exclusion`, `eligibility_restriction`, `age_bar`, `source_conflict`,
`historical`, `binding_commitment`) answers "can this specific row be safely evaluated," never "does
this requirement even exist this cycle." Storing Vienna's exam (or EMS) as an ordinary `entrance_exam` row
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

### A4. Participation-only instruments — Ghent's positioning test, confirmed

**Citation confirmed on re-check.** The first pass found zero hits for "ijkingstoets" because the
Nordic/Benelux batch containing Ghent's record had not yet landed on `main`. It has since:
`data/research/university-requirements/nordic_requirements_ghent_2026-08-22.jsonl`,
`REQ-2026-08-22-BE-UGENT-004`: *"Note that certain programmes require you to participate in a
positioning test or that you have passed the entrance examination and have obtained favourable
ranking. ... Some programs require you to participate in a mandatory positioning test in order to
enrol."* The record does not itself use the Dutch term "ijkingstoets" (this is the university's own
English-language page), so I'm citing the record's own wording rather than asserting a translation
I can't verify from the source text. The researcher's own note names the shape precisely: *"A
mandatory test with no threshold is a genuinely new shape for the corpus. It is a procedural
precondition, not an assessment."*

**The case.** An instrument that is mandatory to sit and has **no pass mark at all** — satisfied by
participation, not by a score threshold. Different from Italy's OFA (Group C below): OFA's
threshold means two different things depending on programme type; Ghent's positioning test has no
threshold to mean anything at all — there is nothing to fail.

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

### A6. Compound eligibility with no structured home — Brookes Engage, confirmed, and it validates the free-text recommendation

**Citation confirmed on re-check.** The first pass searched a snapshot that predated the
opportunities-discovery batch containing this record. Verified directly:
`data/research/opportunities/discovery_academic_program_2026-08-22.jsonl`,
`RSRCH-OPP-2026-08-22-0005`, "Brookes Engage" (Oxford Brookes University). The compound eligibility
rule is real and lives, in full, in the `residency_restrictions` field: *"Must attend a
non-selective state school or college in England (independent/private-school and non-England
students are not eligible); must additionally meet at least one widening-participation criterion
(free school meals, care experience, young carer, ethnic minority background, refugee/asylum
seeker status, or residence in a high-deprivation area by postcode)."* One correction to the
original brief worth naming: this is not strictly "residency + school type + means-testing" as
three ANDed conditions — it's residency AND school-type AND (at least one of six OR'd
widening-participation criteria, of which income/free-school-meals is only one option among six).

**This confirms the recommendation already reached, rather than changing it — the free-text
fallback already worked.** The record landed cleanly in `residency_restrictions`, capturing the
full three-part compound rule (including the six-way OR clause) without needing any new column.
`eligible_countries` is nation-level, not sub-national, and there is no school-type or
means-testing column anywhere on `opportunities` — but migration `0047`'s own stated reasoning
(*"too complex or ambiguous to safely reduce to a flat list stays in free text"*) anticipated
exactly this shape, and the free-text fallback held. **No schema change — this is direct evidence
the existing pattern is sufficient**, not just an untested hypothesis. If a second and third scheme
with the same three-part shape turn up, revisit with real population numbers; one confirmed record
is not enough to justify three new narrow columns, the same "don't guess a schema change to fit a
handful of records" discipline migration `0054` applied to Istanbul's three-record collision.

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

### B5. NYU Nursing — confirmed, and it confirms "already representable" rather than a gap

**Citation confirmed on re-check.** The first pass searched a requirements-corpus snapshot that
didn't have it; the actual record is in the programmes corpus, landed the same day:
`data/research/university-programs/us_programs_nyu_2026-08-22.jsonl` holds two distinct rows —
`USPROG-2026-08-22-NYU-ff0ea38b` ("Nursing (Accelerated 15-Month)") and
`USPROG-2026-08-22-NYU-98b3b6a2` ("Nursing (Traditional 4-Year)") — both `degree_type: BS`, but
each with its **own distinct `official_program_url`**
(`.../nursing-accelerated-15-month-bs/` vs. `.../nursing-traditional-4-year-bs/`).

**This confirms the original hypothesis rather than revealing a gap.** The two rows are already
fully distinguished under the current dedup key
(`university_id, normalized_name, degree_level, language_of_instruction, official_program_url,
degree_type`) two ways over — `normalized_name` differs (the parenthetical is part of the name) and
`official_program_url` differs. **No schema change needed.** If these two rows were ever observed
colliding in practice, the defect would be in ingestion code failing to capture one of those two
already-distinguishing fields correctly, not in the schema.

### B6. New — 23 Turkish programmes with two real admission tracks map onto one row, and this is the fifth instance of the whole group's shape

**Found by a peer lane the same day** (`docs/handoffs/yok-placement-key-gap-2026-08-22.md`), while
applying the YÖK bilingual-name bridge — not this document's own search, cited here because it's
the same underlying shape as B1–B5 and belongs with them, per the coordinator's own framing:
*"Five institutions, four countries, one shape."*

**The case, verified against that document's own evidence.** A 288-row placement-cycle batch dry-
ran clean and then failed on apply with **zero rows inserted** — the insert is atomic — because 23
records collided on `university_program_placement_cycles_key_idx`. Every one of the 23 collisions
is a **genuine** pair, not a duplicate: Yıldız Teknik's İktisadi ve İdari Bilimler Fakültesi carries
two real admission tracks for the same DB programme, same faculty, same score type, same cycle —
kılavuz kodu `110190084` (kontenjan 50, başarı sırası 3,690, taban puan 460.10) against kılavuz kodu
`110110137` (kontenjan 70, başarı sırası 6,520, taban puan 444.48) — almost certainly Turkish-medium
against English-medium, or day against evening (İÖ) instruction. Both are real; keeping one and
dropping the other would show a student the wrong quota and the wrong cut-off for the track they
actually intend to apply to.

**Today.** `university_program_placement_cycles`'s unique key is `(program_id, cycle_year,
COALESCE(burs_orani_adi,''), COALESCE(fymk_id,''))` — it does not include `kilavuz_kodu`, which is
already stored on the row (migration `0055`) and is YÖK's own stable per-programme identifier, the
exact field that distinguishes the colliding pairs.

**Must.** Let two genuinely distinct admission tracks for what this schema currently models as one
programme both land, rather than silently discarding whichever one loses the race.

**Change — the widening itself is forced and low-risk; the deeper question underneath it is a
genuine judgement call, and this document takes a side.** Widening
`university_program_placement_cycles_key_idx` to add `coalesce(kilavuz_kodu, '')` as a fifth key
column is safe in the identical "can only split an existing group further, never wrongly merge
two that are already distinct" sense migrations `0053`/`0054` already established for
`university_programs_dedup_idx` — `kilavuz_kodu` is populated at insert time from a live fetch for
this specific table (unlike `university_programs`' own `kilavuz_kodu`, which is unbacked and
not-yet-backfilled), so this is not a speculative widening. **The peer lane's own document raises
the sharper question, and it deserves a direct answer, not just the mechanical fix:** *if YÖK
publishes two admission tracks where Oryn holds one `university_programs` row, is the missing row
in `university_programs` itself, rather than in the placement-cycle index?* Two options: **(a)
widen the index** (this migration) — cheap, reversible, unblocks all 288 rows including the 265
that were never in question, and lets both placement records land against the one existing
programme row. **(b) split the programme** — model two `university_programs` rows (e.g.
Turkish-medium and English-medium sections of the same İktisadi ve İdari Bilimler Fakültesi
programme) so the placement data's own two-track reality is reflected one level up, not just
absorbed by a wider index. **This document recommends (a) now, revisit (b) later**: (a) is
reversible and unblocks real, currently-stuck data today; (b) is a genuinely bigger data-model
question — how many of Oryn's existing single-row Turkish programmes are actually silently
merged two-track programmes, not just these 23 — that deserves its own measurement pass before a
decision, the same discipline this whole document has tried to hold to rather than guess at a
population size. Applying either against the live, populated table needs the founder's
authorization regardless, per that document's own note — this migration only proposes (a).

**Collapsing note.** This is the fifth confirmed instance of the same underlying shape as Group B's
other findings: an external system publishes more identity granularity than `university_programs`'
own key currently captures — YÖK's `kilavuz_kodu` (this finding and, unbacked, migration `0057`),
UCAS's course code (B3), `degree_type` (B1, already solved), and name-string granularity (B5,
already sufficient). Four countries, one recurring gap: the schema keeps discovering, one national
system at a time, that "the same title" is not the same guarantee as "the same programme."

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
`fr_it_requirements_bologna_2026-08-21.jsonl`/`polimi` records. Ghent's positioning test (A4, now
confirmed) is a related but genuinely different shape — it has no threshold or consequence to
gate on at all, satisfied by participation alone — so it stays a code fix in `evaluate.ts`, not a
second motivating case for this column; `unmet_consequence` answers "what happens when a real
threshold isn't cleared," which Ghent's instrument never asks.

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

### C3. Note on collapsing, and on the verification pass generally

The coordinator's brief asked this document to surface where several findings turn out to be one
underlying gap. Two genuine collapses happened: Ghent's positioning test and Italy's OFA are
related but distinct shapes (a code fix vs. a schema column, per A4/C2 above), not one; and
Manchester's specific citation turned out to overlap with a different, real UCAS-code irregularity
(B3, Southampton/QMUL) that argues for a more cautious change than the original framing implied.

**A second, honest thing worth recording is what the first version of this document got wrong, and
why.** Five of eleven individually-briefed findings (Ghent, Brookes Engage, Vienna, NTNU, and
Manchester's specific framing) could not be confirmed against the corpus this document first
searched. All five turned out to be real — four (Ghent, Brookes Engage, Vienna, NTNU) had simply
landed on `main` in batches that arrived after this document's branch point, and re-checking after
merging `origin/main` forward confirmed every one with an exact citation (see A2–A4, A6 above).
Manchester's specific claim remains uncited directly (it lives in a different lane's URL-repair
records, not the requirements/programmes corpus this document searched), but the coordinator
confirmed it's real and, more importantly, confirmed the substitute evidence this document found in
its place (Southampton/QMUL) correctly argues for a more cautious fix. **None of the five
corrections changed a single line of migration `0059`'s SQL** — Ghent, Brookes Engage, and NYU
Nursing (B5) all independently confirmed conclusions already reached without their citations
(a code fix; free text already sufficient; already representable, respectively), and Vienna/NTNU
strengthened existing column designs rather than changing them. This is worth stating plainly as a
result of the exercise, not a failure of it: refusing to ship a change on an uncitable claim was
the correct instinct regardless of whether the claim later turned out true, and it caught nothing
that needed catching this time — the discipline paid for itself in confidence, not in prevented
error, which is a real and different kind of value.

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
| Deadline applicant-scope gap | A2 | Confirmed — NTNU, exact citation | Forced | **Yes — `university_deadlines.scope`** |
| Conditional applicability | A3 | Confirmed — Vienna (primary) + Switzerland EMS (second case) | Forced infra; policy call on copy | **Yes — `evaluation_gate` widen** |
| Participation-only instrument | A4 | Confirmed — Ghent, exact citation | Code fix only | No |
| THIMUN (school-mediated access) | A5 | Confirmed, exact quote | Forced column; policy call on verdict copy | **Yes — `opportunities.access_channel`** |
| Compound eligibility | A6 | Confirmed — Brookes Engage, exact citation | Validates free-text fallback | No |
| Durham BSc/MChem | B1 | Confirmed | Solved (0054) | No |
| YÖK kilavuz_kodu (university_programs) | B2 | Confirmed | Solved, unbacked (0057, unapplied) | Already written |
| UCAS course codes | B3 | Gap confirmed (Southampton/QMUL); Manchester's specific citation lives in a different lane's records | Forced column only, NOT dedup key | **Yes — `ucas_code`, plain column** |
| Wisconsin Individual Major ×3 | B4 | Confirmed, corrected (3 degree_types not 3 schools) | **Already solved by 0054** | No |
| NYU Nursing parenthetical | B5 | Confirmed — already distinguished two ways | Already representable | No |
| Turkish dual-admission-tracks | B6 | Confirmed (peer lane, `yok-placement-key-gap-2026-08-22.md`) | Forced (index widening); judgement call on the deeper split-vs-widen question | **Yes — `university_program_placement_cycles_key_idx` widen** |
| TR-YÖS scale incomparability | C1 | Confirmed | Solved (0056 §1) | No |
| Italy OFA dual role | C2 | Confirmed, independently sourced | Forced column; policy call on copy | **Yes — `unmet_consequence`** |
| Harvard/CMU "conflicts" | D1 | Confirmed resolved | Not a gap | No |
| Heidelberg stale PDFs | D2 | Confirmed (own prior research) | Forced | **Yes — `verification_state` widen** |
| Humboldt anti-scraping | D3 | Confirmed (own prior research + coordinator report) | Forced | **Yes — `data_status` widen** |

**Six forced schema changes**, all additive, all zero-risk to existing rows (nullable columns
default null, enum/CHECK widenings are permissive, index widenings can only split existing groups
further, never wrongly merge — no existing row is reinterpreted). Written as migration `0059` — see
`supabase/migrations/0059_schema_gaps_2026-08-22.sql`, unapplied. **Every one of the 11 originally
briefed findings is now confirmed** — five (A2/NTNU, A3/Vienna, A4/Ghent, A6/Brookes Engage,
B5/NYU Nursing) required a second search after `origin/main` moved forward with a Nordic/Benelux
requirements batch and an opportunities-discovery batch that landed after this document's first
pass; see C3 for what that correction changed (four SQL-relevant conclusions unchanged, one new
index-widening item added from a genuinely separate, same-day finding). Manchester's own specific
citation still isn't in the requirements/programmes corpus this document searches — it lives in a
different lane's URL-repair records — but the coordinator confirmed the underlying finding is real
and that this document's substitute evidence (Southampton/QMUL) correctly argues for the more
cautious fix it already recommended.

---

## What this document deliberately does not do

Does not resolve any of the six product-policy judgement calls this pass surfaced (A1's
ungrouped-exclusion handling, A3's cycle-contingent copy, A5's verdict taxonomy, C2's
remediation-vs-rejection UI framing, B6's split-vs-widen data-model question) or the judgement
calls the precedent doc already left open (0056 §2/§7/§8's own three). Does not touch
`lib/requirements/evaluate.ts`, `shape-audit.ts`, or any ingestion code — every code-only item
above (A1, A4) is flagged as such precisely so it isn't bundled into "needs a migration" and left
waiting on one unnecessarily. Does not apply anything.
