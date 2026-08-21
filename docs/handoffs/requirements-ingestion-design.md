# Requirements & deadlines ingestion — shape inventory and schema design

**Status:** design + measurement. **No database was written. No migration was applied.**
**Date:** 2026-08-21
**Corpus:** `data/research/university-requirements/` — 53 files, 1,296 records (830 requirements,
466 deadlines), UK / Ireland / Turkey / Germany / Netherlands, all gathered 2026-08-21.
**Tools produced:** `lib/requirements/shape-audit.ts`, `scripts/ingest-university-requirements-batch.ts`
(dry-run only, no `--apply` branch exists), `supabase/migrations/0056_requirement_shape_representability.sql`
(proposed, unapplied).

---

## The answer

**This corpus should not be ingested until the schema changes land.** Running the existing
`--apply` path tonight would write roughly 290 rows, silently strip the qualifiers off 160 of
them, destroy 341 correctly-decided rows at the database, and leave 230 records — 17.7% of the
corpus — as clean, meaningful landings.

The single largest problem is not any of the eight shapes in the brief. It is one unique index.

---

## Measured live state (re-queried, not taken from the brief)

Queried directly against project `qtcvcflzxbuagvvwahhu` at the time of writing:

| | live |
|---|---|
| `university_requirements` | **84** |
| — of which resolve to a `program_id` | **26** |
| `university_deadlines` | **26** |
| `university_programs` | **9,423** |
| `universities` (active, superseded excluded) | **1,010** of 1,019 |
| `requirement_research_queue` | **131** |
| `deadline_research_queue` | **49** |
| `requirement_groups` | **0** |

Two corrections to the brief, both worth carrying forward:

1. **`university_requirements` has no `program_name` column.** The brief says the 58 non-linked
   rows "carry a bare `program_name` string". They do not — there is no such column, so those 58
   rows carry no programme identification at all, not even a weak one. The free-text
   `program_name` lives on `requirement_research_queue.program_name_input` (the audit table) and
   in the research corpus. This makes the linkage gap worse than described, not better.
2. **18 source conflicts, not 13** — 7 requirement records and 11 deadline records at
   `verification_state = CONFLICTING_EVIDENCE`. One of those (Edinburgh) has since been
   superseded by a `VERIFIED_CURRENT` record that explicitly supersedes it, which is the corpus's
   own supersession mechanism working correctly.

---

## What the existing pipeline is, and what it has already done

`lib/requirements/ingest.ts` + `lib/deadlines/ingest.ts` + `scripts/ingest-requirements-deadlines.ts`
already implement the structure the brief describes: a pure decision function, an audit row for
every record regardless of outcome, sequential key-claiming. That work is sound and this pass did
not rebuild it.

It has run once. `requirement_research_queue` holds 131 rows: 43 accepted, 36 rejected, 23
unresolved_university, 17 not_ingestible, 8 duplicate, 4 malformed_source.

### The low yield is a schema defect, not a data-quality one

**All 36 of the 36 `rejected` rows are the same unique-constraint violation.** Verified by
querying `outcome_detail` directly — every one contains
`duplicate key value violates unique constraint "university_requirements_university_type_scope_idx"`.

Those 36 records were decided `accepted`. They carried real, sourced, page-confirmed facts. The
database threw them away. Where they landed:

| institution | requirement type | scope | rows lost |
|---|---|---|---|
| Sabancı University | international_requirement | international_undergraduate | 7 |
| University of Glasgow | minimum_grade | (null) | 5 |
| **The University of Edinburgh** | **english_proficiency** | **(null)** | **4** |
| LSE | minimum_grade | (null) | 3 |
| Koç University | supplemental_requirement | international_undergraduate | 3 |
| University of Glasgow | required_subject | (null) | 3 |
| …9 further groups | | | 11 |

The Edinburgh row is the tell. Edinburgh publishes four alternative English-proficiency routes —
*any one of which* satisfies the requirement. Migration `0052` built `requirement_groups`
specifically to model that, and `evaluateRequirementGroup()` in `lib/requirements/evaluate.ts`
already evaluates it correctly, with a documented test case naming Edinburgh as the motivating
example. **`requirement_groups` holds 0 rows** — because this index prevents the alternatives
from ever landing, and because `AcceptedRequirementRow` has no field for `requirement_group_id`
or `group_role` anyway. The feature exists at both ends and is severed in the middle.

### Coverage gap: 41 of 53 files have never been read

`scripts/ingest-requirements-deadlines.ts` globs `requirements_batch*` and `deadlines_batch*`.
That matches **12** files. The 41 files named `uk_tr_requirements_*`, `uk_tr_deadlines_*`,
`de_nl_requirements_*`, `de_nl_deadlines_*` — 1,165 records, the large majority of the corpus —
have never been seen by any ingestion path. The new dry-run script classifies by content
(`"deadline"` in the filename) rather than by batch prefix and reads all 53.

### Two stale guards found by reading the code against today's corpus

Both are in `lib/requirements/ingest.ts` and both would let a bad row through:

- `UNSAFE_VERIFICATION_STATES` omits **`VERIFIED_HISTORICAL`**. Its comment asserts the state
  "never appears on a requirement record in this corpus". That is no longer true — **14**
  requirement records now carry it. `lib/deadlines/ingest.ts` blocks the same state correctly, so
  the two modules currently disagree.
- `UNSAFE_SCALE_AMBIGUITY` omits **`possibly_discontinued_instrument`** (2 records).

---

## Dry-run result across all 53 files

Command: `npx tsx scripts/ingest-university-requirements-batch.ts`

```
Corpus records                                       : 1296
Would be ACCEPTED by the current decision path       :  631 (48.7%)
Carry a shape the schema CANNOT HOLD                 :  631 (48.7%)
ACCEPTED *and* unrepresentable <-- the dangerous cell:  160 (12.3%)
Accepted requirements destroyed by the unique index  :  341
CLEAN LANDINGS (accepted, representable, slot free)  :  230 (17.7%)
   of which requirements                             :  172 of 830
   of which deadlines                                :   58 of 466
```

Outcome breakdown:

| | requirements (830) | deadlines (466) |
|---|---|---|
| accepted | 572 (68.9%) | 59 (12.7%) |
| not_ingestible | 107 (12.9%) | 347 (74.5%) |
| duplicate | 87 (10.5%) | 58 (12.4%) |
| unresolved_university | 30 (3.6%) | 2 (0.4%) |
| malformed_source | 27 (3.3%) | — |
| superseded | 7 (0.8%) | — |

Shapes the schema cannot hold (a record may carry more than one):

| requirement shape | n | deadline shape | n |
|---|---|---|---|
| scale_qualifier_dropped | 142 | undated_cycle | 243 |
| score_provenance | 92 | historical_as_current | 86 |
| incomparable_scale | 44 | no_date_published | 24 |
| recency_window | 35 | binding_semantics | 13 |
| eligibility_by_absence | 34 | unresolved_conflict | 11 |
| historical_as_current | 14 | | |
| unresolved_conflict | 6 | | |
| unevaluable_age_bar | 5 | | |
| inverted_recency | 1 | | |

### How to read "accepted *and* unrepresentable" — and why it is the number that matters

`accepted` and `unrepresentable` answer different questions and they come apart in both
directions. A record can be blocked and perfectly representable (`NEEDS_REVIEW` is a judgement
about evidence, not a missing column — such records are counted as *blocked, representable*, and
deliberately excluded from the shape counts). A record can also be accepted and unrepresentable,
and that is the dangerous cell: it lands, it looks like a complete self-contained fact, and the
qualifier that made it true has been dropped on the floor.

**Ingestion writes `structured_rule = null` on every row.** So `evaluateRequirement()` returns
`needs_manual_review` for everything ingested, and *no student can be shown a wrong "met" through
the evaluator today*. That is worth stating plainly because it changes the shape of the risk: the
harm is deferred, not absent.

The qualifier-stripped row is precisely what a later reviewer — or
`lib/ai/interpret-requirement.ts` — reads when authoring `structured_rule`. At that point the
scale version, the validity window and the "we do not accept this variant" clause exist only in
`requirement_research_queue.raw_payload`, which that reviewer is not looking at and cannot easily
join to (there is no `research_record_id` on the live row; §9 of the migration adds one). The
confident wrong answer gets authored later, from a row this schema made look trustworthy. That is
the mechanism the 160 measures.

---

## Shape inventory

Each shape: what the schema does today → what it must do → the specific change.
Where a change is a judgement call rather than forced, it says so and lays out the options.

### 1. Inverted recency — `inverted_recency` (1 record), `recency_window` (35)

**The case.** METU: *"IELTS exams taken on or after the 24th of December 2022 will not be anymore
accepted."* The certificate is disqualified by being **new**, not by being old.

**Today.** There is no recency column at all, in either direction. The record carries
`is_exclusion=true`, so `decideRequirementIngestion` blocks it as `not_ingestible` — correct by
accident, via a rule aimed at something else. The 35 ordinary max-age windows ("valid for two
years", "no older than two years prior to the start of the academic year") are mostly *accepted*,
with the window dropped.

**Must.** Store direction, magnitude, unit and **anchor**. The anchor is load-bearing and varies
within one institution: Edinburgh says "no more than two academic years prior to **entry**" for
Mathematics and "no more than two years old from the **start date of this programme**" for
English; Koç says "valid for 2 years from the **exam date**" for tests while "there is no time
limitation on eligible diploma grades".

**Change.** `university_requirements.recency_rule jsonb` (§2 of the migration), shape
`{direction, value, unit, anchor, boundary_date}` where `direction ∈ {max_age,
not_valid_on_or_after, not_valid_before}`. **Judgement call:** typed columns would be tidier but
would force one anchor semantics onto three different published anchors, silently re-anchoring
two of them. jsonb is recommended because the vocabulary is still growing; the cost is that
validation lives in application code rather than a CHECK.

**Also required, and not in the migration:** a `date_achieved` on the student-side fact
(`test_scores`, `education_records`). Without it a recency rule cannot be evaluated even once
stored — which is why §4's gate matters more than §2 in the short term.

### 2. Eligibility encoded as absence — `eligibility_by_absence` (34 records)

**The case.** Ankara University's high-demand programmes (Medicine, Dentistry, Computer Eng, AI,
Software, Law, Veterinary, Pharmacy) accept **only** TR-YÖS. The rule exists on the page as a
heading — `REQ-2026-08-21-9321`, *"VALID EXAMINATIONS AND REQUIRED SCORES FOR PROGRAMMES EXCLUDING
THE ABOVE-LISTED"* — plus the absence of any SAT or A-Level row beneath it.

**This is the sharpest failure in the corpus and it is worth tracing exactly.** In the same file,
`REQ-2026-08-21-9324` carries *"SAT … Minimum 1100 in total and minimum 650 in Math"* with
`is_exclusion=false` and `verification_state=VERIFIED_UNDATED`. That record is **accepted**. Its
governing exclusion heading is **dropped**. What lands is a positive SAT threshold with nothing
recording that it does not apply to the programmes a student is most likely to be asking about.

**Today.** `university_requirements.is_exclusion` **already exists** (migration 0052), along with
`requirement_group_id`, `group_role` and `clause_ref`. But `AcceptedRequirementRow` never sets any
of them, and `decideRequirementIngestion` blocks every `is_exclusion=true` record with the detail
*"university_requirements has no column to mark a row as an exclusion"* — **a statement that was
true when it was written and is now false.** The schema grew the capability; the ingestion path
was never updated to use it.

**Must.** Carry `is_exclusion`, `requirement_group_id`, `group_role` and `clause_ref` through to
the written row, and gate any positive sibling whose exclusion did not land.

**Change.** Extend `AcceptedRequirementRow` (code, not schema — no migration needed for this
part) and set `evaluation_gate = 'eligibility_restriction'` (§4). **Judgement call, and it is a
product-policy one:** when an exclusion cannot be attached to its positive sibling, the options
are (a) block the positive sibling too — safest, costs real facts; (b) land it gated to
`needs_manual_review` — keeps the fact visible, relies on the student reading; (c) land it
ungated. **(c) must not be chosen.** This document recommends (a) for the specific pattern
"exclusion and sibling share university + requirement_type + scope", where the link is
unambiguous, and (b) elsewhere. That recommendation is not implemented; it needs a decision.

### 3. Mutually incomparable scales — `incomparable_scale` (44), `scale_qualifier_dropped` (142)

**The case.** TR-YÖS thresholds in a single cycle: Hacettepe `TR_YOS_0_500` — "500 puan üzerinden
en az 400 puan" (scored, denominator published); Ankara `TR_YOS_SCALE_UNSTATED` — "Minimum 440
points" with no denominator published anywhere; METU `TR_YOS_PERCENTILE_RANK` — "first 5th
percentile", a rank. No numeric column holds all three; comparing across them means nothing.

The larger version is TOEFL. Per `docs/research/university-requirements/scalar-thresholds-are-not-enough.md`,
ETS changed the scale effective 21 January 2026 (1–6 in half-bands, overall now the *average* of
sections, not the sum — so the two overalls are not interconvertible by arithmetic) and supplies
comparable 0–120 overall scores for two years only. Edinburgh's "4.5 with 4.0 per component" and
Glasgow's "92 Overall, Reading 22…" are both official and both current.

**Today.** No `test_scale` column. 142 records carry a scale qualifier that is discarded on write.

**Must.** Store the scale with the number, and refuse to evaluate an unqualified one.

**Change.** `test_scale text` + `scale_ambiguity text` (§1). Forced, not a judgement call — the
January 2028 cliff makes it a deadline rather than a preference: when dual reporting ends, every
unqualified legacy threshold in the table silently becomes unmeasurable rather than merely
ambiguous. Also add `possibly_discontinued_instrument` to `UNSAFE_SCALE_AMBIGUITY` in
`lib/requirements/ingest.ts` (code fix).

### 4. Score provenance is per-institution — `score_provenance` (92 records)

**The case.** Southampton accepts IELTS One Skill Retake; Edinburgh refuses it. Groningen: *"We do
not accept IELTS Online and IELTS One Skill Retake certificates. TOEFL MyBest Scores are also not
taken into consideration."* Koç: superscores not accepted. A superscored 1300 and a single-sitting
1300 are the same number and only one is accepted.

**Today.** No column. The clause survives only as prose inside `requirement_detail`, if the
research record happened to put it in `requirement_text` rather than `limitations`.

**Must.** A per-requirement list of refused provenances, and a matching provenance flag on the
student's stored score.

**Change.** `excluded_provenances text[]` (§3) plus `evaluation_gate = 'named_exclusion'` (§4)
until the student-side flag exists. Note the count includes *inclusive* mentions ("TOEFL iBT
(includes Special Home Edition) 95") as well as exclusive ones — both need the column, because
provenance acceptance cannot be a global property of the test either way.

*Detector honesty:* 32 of the 92 are strong structured-vocabulary matches; the remainder are
text leads, marked `evidenceKind: "text_lead"` in the classifier output. An earlier, looser
version of this regex used a bare `\bonline\b` and fired 38 times on phrases like "the online
application portal" and "complete the online self-test"; it was tightened to require a test name
or an explicit version/edition word, and that is regression-tested.

### 5. Unevaluable by design — `unevaluable_age_bar` (5 records)

**The case.** TU Dublin: *"Applicants must be 18 before 31st December (September Start programmes)
or 31st May (January Start programmes)."* The research record's own `limitations` field names the
shape: *"AN AGE BAR, expressed as two bare day-and-month cut-offs with no year."*

**Today.** ORYN stores **birth year only**, deliberately (AGENTS.md Phase 2, minor-safe design).
For a student born late in the year the answer is genuinely unknowable from what this product
holds. The record carries `is_exclusion=true` so it is currently blocked.

**Must.** Return `needs_manual_review`. Permanently — this is the one shape where better data
does not fix it, and collecting a full birth date to resolve it would trade a standing privacy
commitment for an edge case.

**Change.** `evaluation_gate = 'age_bar'` (§4). Explicitly *not* recommending a birth-date
column; that would be a privacy regression and the founder's call, not this lane's.

### 6. Legitimately null years — `undated_cycle` (243 of 466 deadline records)

**The case.** The convention is **per-institution**, and the spread is total. Measured across the
corpus:

| institution | undated | institution | undated |
|---|---|---|---|
| Universität Heidelberg | 24/24 (100%) | TU Berlin | 0/17 (0%) |
| Universität Stuttgart | 17/17 (100%) | Oxford | 0/4 (0%) |
| Bonn | 22/25 (88%) | Cambridge | 0/8 (0%) |
| Tilburg | 29/37 (78%) | Koç | 0/5 (0%) |
| Delft | 17/22 (77%) | Groningen | 4/22 (18%) |

Studielink's national 15 Jan / 1 May dates were confirmed undated six times independently against
Studielink's own page.

*(The brief's "201 of 396" is from an earlier snapshot; the current corpus is 243 of 466. The
brief's Heidelberg figure of 92% now measures 100%.)*

**Today.** `deadline_date` is a real `date` column. `decideDeadlineIngestion` correctly refuses
`recurring_annual_undated` as `not_ingestible` — which is why deadlines show only 12.7% accepted.
That refusal is right, but it means the majority of German and Dutch deadlines are simply absent
from the product.

**Must.** Store the day and month without a year, and never infer one. A NOT NULL year fabricates
facts for Heidelberg; refusing to store undated dates discards most of two countries.

**Change.** `recurrence` + `recurrence_month` + `recurrence_day` + nullable `cycle_year` +
`cycle_label`, with a CHECK enforcing the shape (§6). Also `no_date_published` (24 records) needs
to be storable: "we confirmed no central date exists" is a sourced finding and is currently
indistinguishable from "not yet researched".

### 7. Binding deadline semantics — `binding_semantics` (13 records)

**The case.** Early Decision is a contract; Restrictive Early Action forbids other early
applications. The deadline **type** carries eligibility logic, not just a date. Mostly US and
arriving later, but 13 records already carry `deadline_type = 'early'`.

**Today.** `deadline_type` is free text with no binding semantics.

**Change.** `binding_policy text` with CHECK `∈ {non_binding, binding, restrictive_single_choice}`
(§7). **Judgement call, deferred deliberately:** whether ORYN actively *warns* a student that a
planned application conflicts with a binding commitment they have already recorded, or merely
*displays* the restriction, is a product decision with real stakes — a wrong warning is as bad as
a missing one. The column supports either. Nothing in the migration decides it.

### 8. Source conflicts must survive as conflicts — `unresolved_conflict` (18 records)

**The case.** No policy resolves these. At Groningen the older-looking page is correct; at Erasmus
the newer one is — so "trust the more recent page" gets exactly one of them right. Manchester is
worse: one sentence on one official page binds *"15 October 2026"* to *"September 2024 entry"*,
self-contradicting within a single source, where no cross-source rule helps at all. Hamburg's
central page and its Psychology department page state different TOEFL figures for the same
programme.

**Today.** Blocked as `not_ingestible`. The conflict survives in the research corpus and is
invisible to the product — which is safe, but means the research was wasted.

**Must.** Both readings stored, linked, neither presented as settled.

**Change.** `requirement_source_conflicts` table + `conflict_group_id` on both tables (§8).
**Judgement call:** whether a conflicted fact is shown to students at all. Options: (a) hide
entirely — safest, silently unhelpful; (b) show "we found conflicting official sources" with both
values and both links — honest, consistent with Phase 68's "Oryn should know when it does not know
enough"; (c) show one with a caveat. **Recommend (b)**, and note it is exactly the surface
`SourceBadge` (Phase 36) already exists to carry. Not implemented; needs a decision.

### 9. The unique index — 341 rows (not in the original brief; the largest single loss)

Covered in full above. `university_requirements_university_type_scope_idx` permits one row per
`(university_id, requirement_type, scope)`. The program-scoped twin,
`university_requirements_program_type_idx`, is worse — one row per `(program_id,
requirement_type)`, with no scope term at all — and matters less today only because programme
linkage is rare.

**Change.** §5 replaces both, folding `md5(title)` into the key. **Judgement call**, three options
argued in the migration header:
- **(a) drop uniqueness, rely on application dedup.** Rejected — removes the only DB backstop.
- **(b) widen with a content discriminator.** ← recommended and encoded.
- **(c) scope uniqueness to `requirement_group_id`.** Rejected — the grouping decision is made
  after ingestion, so it cannot protect the insert.

Accepted cost of (b): a reworded title inserts a second row rather than auto-merging — occasional
and human-visible (both rows are factually true), rather than the current failure, which is
systemic and silent. This is the identical tradeoff migration `0053` took for programmes.

Verified against live data: **0** existing rows would violate either replacement index, **0**
existing deadline rows would violate the new recurrence CHECK, **0** requirement rows have a null
title.

---

## `lib/requirements/evaluate.ts` — what it can and cannot express today

The brief refers to `lib/admissions/evaluate.ts`; the file is `lib/requirements/evaluate.ts`.

**What it gets right, and should not be changed:**
- Returns `needs_manual_review` when `structured_rule` is null or fails Zod — which today is
  *every ingested row*, so the module is currently failing safe.
- Refuses to convert GPAs across scales, with the reasoning written down: a Turkish 100-point
  average and a US 4.0 do not correspond linearly. Returns `needs_manual_review` instead.
- `evaluateRequirementGroup()` already models "any one of N alternatives satisfies this", and
  already forces `needs_manual_review` when an `exclusion` or `qualifier` member is present, with
  an explicit comment that exclusions must never be auto-resolved by negating the inclusion set.
  This is correct and is exactly what shapes 2 and 4 need. **It has never had data to run on.**

**What it cannot express:**

| shape | status today | why |
|---|---|---|
| Recency (either direction) | **cannot** | No max-age or boundary-date on the rule; no `date_achieved` on the student fact. `RequirementFacts` has no date field at all — the group evaluator's comment says so directly. |
| Test scale / version | **cannot** | `evaluateTestScore()` does `Number.parseFloat` and `>=`. A TOEFL 4.5 on the 1–6 scale compares as less than a legacy 79. No scale qualifier anywhere in `StructuredRuleSchema`. |
| Score provenance | **cannot** | No provenance on `facts.testScores` (`{testName, score}` only) and no excluded list on the rule. |
| Age bar | **cannot** | No age or birth-year in `RequirementFacts`, by design. |
| Eligibility-by-absence | **partially** | Only if the exclusion lands as a group member — and it never has, because no exclusion has ever been written. |
| Incomparable scale (rank vs score) | **cannot** | `Number.parseFloat("first 5th percentile")` → NaN → `needs_manual_review`. Fails safe **by accident**, not by design; a percentile written as "5" would compare as a score. |
| Source conflict | **cannot** | No notion of a contested fact. |

**The two open tasks named in the brief are the right ones, and §4's `evaluation_gate` is the
mechanism for both.** A single nullable, indexed reason code checked *before* `structured_rule`
turns every shape above into an honest `needs_manual_review` without touching the comparison
logic. That is a small change and it is available before any of the richer columns are populated.

One correction worth making regardless: the fuzzy fallback in `evaluateTestScore()` returns
`likely_met` when a *similarly-named* test's score clears the bar. Given that TOEFL now has two
live scales with an order-of-magnitude difference between them, name similarity is no longer a
safe basis for `likely_met` on any English test. Recommend gating that fallback behind an exact
scale match.

---

## Programme resolution — how many corpus records can link to a real programme

Live programmes are now 9,423, so the question is worth re-asking. Method: resolve the university
first via the platform's alias-aware `resolveIdentity()` (exact name, registered aliases, external
ids — never fuzzy), then require an **exact normalized programme-name match within that
university's own programme set**. No fuzzy fallback; a multi-hit resolves to `null` rather than
picking one.

| | requirements (830) | deadlines (466) | total |
|---|---|---|---|
| University resolved | 800 (96.4%) | 464 (99.6%) | 1,264 (97.5%) |
| **Programme resolved** | **51 (6.1%)** | **34 (7.3%)** | **85 (6.6%)** |

Why the other 1,211 cannot:

| reason | n |
|---|---|
| no `program_name` on the record (institution-level fact) | 419 |
| no exact normalized name match at this university | 290 |
| university has no programmes loaded | 29 |
| university unresolved | 30 |
| 2–5 programmes share the normalized name — ambiguous, **not guessed** | 11 |

**The 419 are not a failure.** An institution-wide English requirement genuinely has no programme;
`program_id` is correctly null for those. The 290 are the real gap, and they are mostly a naming
mismatch: the corpus says `"Computer Science BSc (Hons)"` where the programme table says
`"Computer Science"`, or `"Information Technology (INFOTECH), M.Sc."` where degree type is a
separate column.

**These must not be closed by similarity matching.** The ground rule holds and today produced two
concrete reminders of why: an `ILIKE '%ITU%'` matched Georgia Tech for İTÜ, and ROR's ranked search
returned Uşak University first for "Anadolu". An exact identifier is evidence; rank, substring and
name similarity are leads. Closing the 290 needs either the research lane emitting the programme's
`official_program_url` (which *is* an exact identifier, already present on the programmes side) or
a reviewed mapping — not a looser matcher.

**Recommendation:** ingest institution-level requirements with `program_id = null` (as today), and
treat programme linkage as a separate, later pass keyed on `official_program_url`. Note that §5's
replacement of `university_requirements_program_type_idx` matters more as linkage improves — at
6.6% the program-scoped index is barely exercised, which is why its identical defect has not yet
shown up in the audit trail.

---

## Flag: the Al-Farabi supersession may be modelling a rename, not a duplicate

Not changed, per instruction. Verified live: 9 supersession pairs exist. Eight point from an
abbreviated or parenthetical variant to a clean canonical name — `UCL` → `University College
London`, `MIT` → `Massachusetts Institute of Technology`, `The University of Warwick` →
`University of Warwick`, and so on. All eight are unambiguous duplicate resolutions.

The ninth is different in kind:

```
Farabi University (former Al - Farabi Kazakh National University)   [6f0df596…]
  superseded_by →  Al-Farabi Kazakh National University             [37f12391…]
```

The superseded row's own name string asserts that **Farabi University is the current name** and
Al-Farabi Kazakh National University is the **former** one. The supersession therefore points from
the current name to the historical name — backwards, *if* this is a rename.

That "if" is the point, and it cannot be settled by reasoning about the strings. `superseded_by_id`
may be modelling "which row wins" (a deduplication concept) rather than "which name is current" (a
lifecycle concept), and those are different things that happen to coincide for the other eight
pairs. Resolving it needs a source — the institution's own site, or ROR's record for the
identifier — not a judgement. Flagged for a lane that can fetch one.

---

## Recommended order

1. **Fix the unique index (§5).** Largest single win: 341 rows, and it unblocks
   `requirement_groups`, which is built, tested, and starved.
2. **Add `evaluation_gate` (§4) and honour it in `evaluate.ts`.** Small, closes both open
   evaluator tasks, and makes every remaining shape fail honestly instead of confidently.
3. **Carry `is_exclusion` / `requirement_group_id` / `group_role` / `clause_ref` through
   `AcceptedRequirementRow`** (code only, no migration). Unblocks 34 exclusion records.
4. **Add `VERIFIED_HISTORICAL` and `possibly_discontinued_instrument` to the unsafe sets**
   (code only). Two-line fix, stops 16 records landing as current fact.
5. **Widen the file glob to all 53 files** (code only).
6. **Scale, recency, provenance columns (§1–3).** Needed before any `structured_rule` authoring
   pass, and hard-deadlined by January 2028 for TOEFL.
7. **Deadline recurrence (§6).** Unlocks ~243 records currently refused outright.
8. **Conflicts (§8) and binding policy (§7).** Both need a product decision first.

Steps 1–5 are mechanical and involve none of the judgement calls. Step 1 alone takes clean
landings from **230 to 471** — with the slot constraint gone, every accepted record lands, so the
clean count becomes simply *accepted minus unrepresentable* (631 − 160). Steps 3–4 add the 34
exclusion records and stop the 16 historical/discontinued ones landing as current fact. (Step 5
does not move these numbers: the dry-run script already reads all 53 files. It is needed so the
*existing* runner sees them too.)

Steps 6–8 are where this document stops and the founder starts.
