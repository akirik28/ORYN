# Requirements & deadlines audit — 2026-08-22

**Lane:** requirements-deadlines-verification. **Posture:** verifier, not editor. **No DB writes, no row edits.**
**Scope:** `university_requirements` (1,254 rows) and `university_deadlines` (396 rows). Both counts confirmed live.
**Branch:** `oryn/requirements-deadlines-audit-2026-08-22` off `origin/main` (dcce22f).
**Project:** `qtcvcflzxbuagvvwahhu`.

Every finding below is reproducible from a SQL query or a file:line reference given inline.

---

## The result that reframes the brief

**`structured_rule` is NULL on all 1,254 requirement rows.** No exceptions, across all 85
universities that carry requirements at all.

```sql
select count(*) filter (where structured_rule is not null) from university_requirements;  -- 0
```

`evaluateRequirement` (lib/requirements/evaluate.ts:258) returns `NO_RULE_RESULT` —
`needs_manual_review` — for every ungated row, and gate copy for every gated one. Confirmed
empirically rather than by reading code alone:

```sql
select status, count(*) from student_requirement_evaluations group by 1;
-- needs_manual_review | 78     (the only row in the result)
```

**There is not one `met` in the system.** So the honest answer to the question this audit is
supposed to end with is: *this corpus cannot tell a student they qualify today, because it cannot
tell them anything today.*

Two consequences shape everything below:

1. The 233 evaluation gates currently do nothing the universal NULL rule isn't already doing.
   They are insurance for a future in which rules get authored. Auditing them is still right —
   but the risk they guard is **latent**, and findings about them should be read that way.
2. The **live** risk surface is `university_deadlines`, because a deadline is **rendered
   directly to a student, not evaluated**. A wrong date needs no rule to reach a screen. Finding 1
   is there, and it is the only finding in this document that is hurting a student today.

**Scoping correction that matters.** Only **753 of 1,254** rows are machine-evaluable at all. The
other 501 are blocked by category before any gate is consulted (`MANUAL_REVIEW_CATEGORIES` /
`INFORMATIONAL_CATEGORIES`, lib/requirements/types.ts:42-53): `supplemental_requirement` 268,
`international_requirement` 141, essay/recommendation/interview/portfolio 83,
`application_deadline` 9. Of the 753, **138 are gated and 615 are not**. "Should this row be
gated?" is only a real question for the 615. A missing gate on a category-blocked row is recorded
here as a non-finding, not padding.

Gate count is **233**, one more than the 232 briefed: `named_exclusion` 67, `historical` 64,
`recency_window` 47, `binding_commitment` 31, `eligibility_restriction` 15, `age_bar` 7,
`incomparable_scale` 1, `inverted_recency` 1.

---

# Findings, severity-ranked

## SEV-1 — 60 expired deadlines render under a heading that says "Upcoming"

**Live today. Student-facing. One line of code.**

`app/(app)/universities/[id]/page.tsx:166-170` builds the deadline list by filtering on
**verification_state only. There is no date filter.**

```ts
const actionableDeadlines = (deadlinesRes.data ?? []).filter((d) => !NON_ACTIONABLE_VERIFICATION_STATES.has(d.verification_state));
const datedDeadlines = actionableDeadlines
  .filter((d) => d.recurrence === "dated_specific" && d.deadline_date)
  .sort((a, b) => a.deadline_date!.localeCompare(b.deadline_date!));
```

Line 449 renders that array under the literal title **"Upcoming"**. The sort is ascending, so the
**most stale dates render at the top of the list.**

```sql
with actionable as (
  select d.*, u.name uni from university_deadlines d join universities u on u.id=d.university_id
  where d.verification_state not in ('VERIFIED_HISTORICAL','CONFLICTING_EVIDENCE','NEEDS_REVIEW','CURRENT_CYCLE_NOT_PUBLISHED')
    and d.recurrence='dated_specific' and d.deadline_date is not null)
select count(*) total, count(*) filter (where deadline_date < current_date) passed from actionable;
-- total 171 | passed 60
```

**60 of 171 (35%) have already passed**, across 15 universities. Oldest: **2025-10-01**, eleven
months expired.

| University | Expired rows | Oldest |
|---|---|---|
| Vrije Universiteit Amsterdam | 16 | 2025-12-01 |
| Technische Universität Berlin | 8 | 2026-01-04 |
| Humboldt-Universität zu Berlin | 6 | 2026-01-15 |
| University College Cork | 6 | 2025-12-01 |
| Complutense University of Madrid | 5 | 2026-01-22 |
| University of Göttingen | 5 | 2026-04-30 |
| Maynooth University | 3 | 2025-11-05 |
| TU Darmstadt / UC3M / Lausanne | 2 each | 2026-03-01 |
| KFUPM, METU, UCLA, Galway, Geneva | 1 each | 2025-10-01 |

**This is not a data-entry defect.** The rows are correctly sourced and correctly dated. The
defect is that `verification_state` was made to carry the entire "is this actionable" judgement
and **the read path trusted it alone**.

The sibling read path is the proof, and makes this cheap to fix. `lib/deadlines/upcoming.ts:95-96`
applies `.not("deadline_date","is",null).gte("deadline_date", today)` *in addition to* the state
filter, so the dashboard "Due soon" feed is clean. The university page's own comment says it
reuses the state rule "rather than re-derived so this page can't quietly drift from what *Due
soon* already treats as actionable" — and then drifted anyway, in the one dimension the comment
did not cover.

---

## SEV-2 — `verification_state` is being applied under two different meanings

Migration 0056:298 defines it: *"VERIFIED_HISTORICAL rows are real and correctly sourced but
describe a **closed cycle**; read paths must exclude them from anything that reads as actionable."*

Some lanes have instead applied it as *"this specific date has passed."* The two coincide on most
rows and diverge exactly where it matters. The cleanest proof is one cycle label, one date, three
institutions:

| University | Cycle | Date | State |
|---|---|---|---|
| Albert-Ludwigs-Universität Freiburg | Sommersemester 2026 | 2026-01-15 | `VERIFIED_HISTORICAL` |
| Universität Bonn | Sommersemester 2026 | 2026-01-15 | `VERIFIED_HISTORICAL` |
| **Humboldt-Universität zu Berlin** | **Sommersemester 2026** | **2026-01-15, 2026-02-28** | **`VERIFIED_CURRENT`** |

Under **either** reading, Humboldt's two rows are wrong: the date has passed *and* the cycle is
closed. They are why Humboldt shows a January deadline under "Upcoming" in August.

```sql
select u.name, d.application_cycle, d.verification_state, d.deadline_date
from university_deadlines d join universities u on u.id=d.university_id
where d.application_cycle in ('Sommersemester 2026','Wintersemester 2026/27')
order by d.application_cycle, u.name;
```

The mirror-image error also exists, in the safe direction: **9 rows for `Wintersemester 2026/27`
— an open cycle, entry this October — are marked `VERIFIED_HISTORICAL`** because their individual
dates passed (Freiburg 3, LMU 2, Bonn 2, Hamburg 2), so they are suppressed everywhere. Real
deadlines hidden rather than fake ones shown. Same column, opposite error, same root cause.

Freiburg is internally consistent and shows the intended pattern: its passed WS26/27 rows are
HISTORICAL, its 30 Sep and 8 Oct rows are CURRENT.

---

## SEV-2 — five requirement rows cite ETS as the source for a claim ETS does not make

The brief flagged four Edinburgh rows citing `ets.org`. It is **five rows across two
institutions**, and three of them are worse than "a URL that can't corroborate the claim":
**the cited page is about a different test from a different provider.**

All five carry `source_url = https://www.ets.org/toefl/institutions/ibt/score-scale-update.html`
and `data_confidence = 'high'`.

| Row | Institution | What the row states | Who actually owns that fact |
|---|---|---|---|
| `4564db58` | Edinburgh | TOEFL-iBT 92, pre-21-Jan-2026 | Edinburgh (ETS owns the scale, not the threshold) |
| `adf9f150` | Edinburgh | TOEFL-iBT 4.5, from 21-Jan-2026 | Edinburgh |
| `9ec26dfa` | Edinburgh | **Cambridge C1/C2: 176 with 162 each** | Cambridge Assessment English — **an ETS competitor** |
| `a97ec7c8` | Edinburgh | **IELTS Academic 6.5** + One Skill Retake refusal | British Council / IDP / Cambridge — **not ETS** |
| `6d2dd7a0` | **Glasgow** | **IELTS 6.5, no subtest under 6.0** | not ETS |

An ETS page about the TOEFL rescale cannot contain a Cambridge threshold or an IELTS threshold.

**Edinburgh's four are a batch stamp**, and the timestamps prove it — all four created inside 1.2
seconds with sequential research record ids:

```sql
select id, retrieved_at, created_at, research_record_id from university_requirements
where source_url ilike '%ets.org%' order by created_at;
-- 19:42:54.458 REQ-2026-08-21-4004 … 19:42:55.612 REQ-2026-08-21-4010
```

Glasgow's row is a separate ingestion event (11:06:38) that reached the same wrong URL
independently — so this is a repeatable failure mode, not one bad batch.

The sharpest detail: Edinburgh row `a97ec7c8` **carries the correct source inline in its own
prose** — `"(study.ed.ac.uk)"` — while `source_url` points at ETS. The right URL was known at
ingestion and did not make it into the field a student clicks.

**Not findings** (checked and dismissed under the README's "who owns this fact?" test — pattern 3):
`admission.universityofcalifornia.edu` ×27 (UC systemwide owns the UC Application),
`info.studielink.nl` ×14 (Dutch national application system), `www2.cao.ie` ×8, `usg.edu` ×5,
`hochschulstart.de` ×4, `uni-assist.de` ×3, `ucas.com` ×1, `commonapp.org` ×1 — all correct
upstream owners. `sfs.mit.edu` ×2 and `liverpool.ac.uk` ×3 are **false positives of my own host
comparison** (MIT's stored `website_url` is `web.mit.edu`; Liverpool's is the legacy `liv.ac.uk`).

---

## SEV-2 — four gates tell the student something false about their own eligibility

A gate forces `needs_manual_review`, so the **verdict** is safe. But each gate carries dedicated
student-facing copy (`GATE_COPY`, evaluate.ts:49-70), and on these rows that copy **contradicts
the row's own sourced text**.

| Row | Institution | Row's sourced text | Gate | What the copy tells the student |
|---|---|---|---|---|
| `a6a13d44` | **Southampton** | "(IELTS) Academic UKVI SELT **(including One Skill Retake)**" | `named_exclusion`, `excluded_provenances` NULL | "This university **refuses** some ways of obtaining a score…" |
| `b3377f2e` | **Georgia Tech** | "IELTS Academic **(including IELTS Online and One Skill Retake)**: 6" | `named_exclusion`, `excluded_provenances` NULL | same refusal copy |
| `2e5a0bec` | **TU Dublin** | "There is a **€50 non-refundable application fee**… apply online through the application link" | **`age_bar`** | "This depends on your **exact date of birth**, and Oryn stores only your birth year…" |
| `e1d66322` | UvA | genuinely excludes IELTS Indicator / OSR / TOEFL Home / MyBest | `named_exclusion`, `excluded_provenances` NULL | correct direction, but the list is empty so nothing can ever resolve |

The first two are the inverse of the truth: both pages **explicitly accept** One Skill Retake, and
`excluded_provenances` is correctly NULL — the gate is the only thing that is wrong, and it is
saying the opposite of the source.

TU Dublin's is a **page-level stamp**: `2e5a0bec` (the fee) and `452eafa1` (the real age bar)
share `source_url = .../how-to-apply/undergraduate-courses/`. Both texts were verified live and
both appear on that page; the `age_bar` gate was applied to everything extracted from it.

This matters more than it looks precisely *because* the verdict is safe. Nobody checking
"did any row wrongly return `met`?" would ever catch it, and a student reading "this depends on
your exact date of birth" under a €50 application fee learns something false.

---

## SEV-3 — Ankara: "expressed as an absence" is not expressible

The brief asks to confirm an SAT applicant cannot be shown `met` at Ankara, where high-demand
programmes accept only TR-YÖS, "expressed as an *absence* of SAT rows."

**Ankara Üniversitesi exists as a university row (`4a9446cc-5391-45a9-8b68-39d0531e9246`) and has
zero requirements and zero deadlines.**

```sql
select u.name, (select count(*) from university_requirements r where r.university_id=u.id) reqs,
               (select count(*) from university_deadlines d where d.university_id=u.id) dls
from universities u where u.name ilike '%Ankara%';
-- Ankara Üniversitesi | 0 | 0
```

An SAT applicant cannot be shown `met` — confirmed, but for the wrong reason: **nothing at all can
be shown.** There is no TR-YÖS row either. Absence of *everything* is not a statement, and a
student sees a page identical to a university nobody has researched yet.

Two knock-on facts:

- **`TR_YOS_SCALE_UNSTATED` has zero rows in the database.** The evaluator's `UNSTATED_SCALES`
  set and the `unstated_scale` gate copy were built specifically for it — evaluate.ts:115-117 says
  *"Ankara's TR-YÖS rows are the live case: 'Minimum 440 points', and nothing states 440 out of
  what."* **That live case is not live.** The comment will read to a future maintainer as though
  real data exercises this path. Nothing does.
- The scale mechanism itself is otherwise sound and verified: Hacettepe `TR_YOS_0_500` (400 of
  500) and METU `TR_YOS_PERCENTILE_RANK` (`incomparable_scale`, the corpus's only one) are both
  present and correctly typed, so the three-way incommensurability the design was built around is
  represented by two of its three cases.

**No numeric comparison treats the TR-YÖS variants as commensurable** — confirmed. `SCALE_FAMILY`
(evaluate.ts:96-113) maps `TR_YOS_0_500 → tr_yos_500` and gives the rank and unstated variants no
family at all, and `evaluateTestScore` checks both before looking at any student score.

---

## SEV-3 — 128 undated deadlines can never notify a student

**The brief's explicit question first: no row has had a year inferred into its date.** Confirmed:

```sql
select count(*) filter (where recurrence='recurring_annual_undated' and deadline_date is not null) from university_deadlines;  -- 0
```

All 128 `recurring_annual_undated` rows have `deadline_date` NULL with month+day populated, the
0056 shape constraint held, and `formatRecurringDate` never constructs a `Date`, so there is no
path for a missing year to become 1970 or the current year. **This is correct and was done well.**

It has an uncompensated cost. Both consumer paths exclude NULL dates:

- `lib/deadlines/upcoming.ts:95` — `.not("deadline_date","is",null)` → never in "Due soon"
- `lib/deadlines/scan.ts:136` — `.not("deadline_date","is",null)` → **never triggers a notification**

So Harvard Restrictive Early Action (1 Nov), Princeton Single-Choice Early Action (1 Nov) and
Georgia Tech Early Action 1 (15 Oct) — all roughly seven to ten weeks out — **cannot reach a
student through the deadline engine at all.** They render only on the university detail page under
"Recurring — exact year not published".

This is the exact mirror of SEV-1: one path shows dates that have passed, the other hides dates
that have not yet arrived. Both come from the same architectural choice — one column asked to
carry the actionability judgement for a read path that then does no date reasoning of its own.

**13 undated rows carry a non-null `cycle_year`** (Georgia Tech 7, NYU 3 → 2027; Lausanne 3). I
checked whether this was year inference through a back door and it is **not** — see the
verification table: Georgia Tech's page prints the cycle in its table header while printing only
month and day per date, so 2027 is sourced. One genuine inconsistency remains: **two Lausanne rows
whose `cycle_label` names the same "academic year 2026/2027" carry different `cycle_year` values**
— `1ece0d9e` → 2027, `cee99d01` → 2026.

---

## SEV-3 — dual-scale TOEFL rows encode their date boundary only in prose

The TOEFL rescale was handled by **splitting each threshold into two rows**, one per scale, with
the date boundary stated in the row text and the scale pinned in `test_scale`. Groningen, NYU,
Yale, VU Amsterdam, TU Dublin and Columbia all follow this pattern, and it is a good design: 157
rows carry `test_scale`, and `SCALE_FAMILY` keeps `toefl_ibt_1_6` and `toefl_ibt_0_120` in
separate families so the two can never be compared.

The gap: these rows carry `scale_ambiguity = 'resolved_unambiguous'` (which **bypasses** the
ambiguity block, evaluate.ts:82) and **no `recency_rule`**, so the "taken on or after 21 January
2026" clause exists only as English in `requirement_detail`. Nothing machine-readable carries it.
Today the rows are still safe — the scale-family mismatch catches a wrong-scale student score —
but they are safe **by side effect rather than by the mechanism built for date conditions**.

**One row does not even get the side effect.** University of Waterloo `0cd4c9d3` keeps **both
scales in a single row**:

> "TOEFL iBT, for tests taken before January 21, 2026: 90 overall… TOEFL iBT, for tests taken from
> January 21, 2026 onward (rescaled): 4.5 overall…"

`test_scale` NULL, `scale_ambiguity` NULL, `evaluation_gate` NULL. It is protected only by
`needsScaleQualifier` (evaluate.ts:133-140), which blocks any bare-number TOEFL threshold — a real
backstop, but the row is un-authorable: no single `test_scale` value is correct for it. University
College Cork's equivalent row (`efb59913`) has the same two-scales-one-row shape and *is* gated
(`recency_window`). Waterloo is the outlier.

Related, same class: **TU Berlin `ec34222a`** states in its own text that its values *"map to none
of this schema's enumerated `test_scale` values"* (TOEFL ITP 543/620) and carries **no gate**. A
row that documents its own unrepresentability is the clearest possible `incomparable_scale`
candidate.

**TOEFL scale coverage:** 96 rows mention TOEFL; 38 carry no `test_scale`; 10 of those pair a bare
number with no scale. All 10 are currently blocked by `needsScaleQualifier` regardless of the
column — but that guard keys on the **rule's** `testName`, so it protects only as long as every
future rule spells the instrument "TOEFL". Per institution, the no-scale rows cluster at TU Berlin
(3), Groningen (2), VU Amsterdam (3), with singles at CMU, Waterloo, UCC, Galway, Darmstadt (2),
Trinity, Tilburg, Maynooth, DCU, Humboldt.

---

## SEV-4 — Edinburgh's stated two-year certificate validity is not recorded anywhere

Verified live at study.ed.ac.uk: *"IELTS, TOEFL, Trinity ISE, Oxford ELLT test, or Oxford Test of
English Advanced"* must be *"no more than two years old"*, and most other qualifications are valid
*"three and a half years"*.

None of Edinburgh's English-proficiency rows carry a `recency_rule`. Corpus-wide, 46 rows do carry
one, so the mechanism exists and is used elsewhere — Edinburgh simply has the rule stated on its
source page and absent from its rows. 23 machine-evaluable rows across the corpus contain explicit
validity language in their text with `recency_rule` NULL and no gate:

```sql
select u.name, r.id, left(coalesce(r.title,''),90)
from university_requirements r join universities u on u.id=r.university_id
where r.requirement_type::text in ('curriculum','required_subject','prerequisite_coursework','minimum_grade',
                                   'standardized_test','entrance_exam','english_proficiency','language_proficiency')
  and r.evaluation_gate is null and r.recency_rule is null
  and (coalesce(r.title,'')||' '||coalesce(r.requirement_detail,'')) ~* '(valid for|validity|no more than .{0,25}(year|month)|not older than)';
```

---

## SEV-4 — CEFR levels are stored but not evaluable, and would produce a wrong `not_met`

Five rows (Politecnico di Milano ×2, Sorbonne ×3) carry `test_scale = 'CEFRL'` for B2 thresholds.
**`CEFRL` is not a key in `SCALE_FAMILY`** (evaluate.ts:96-113).

It is inert today, because the scale block only runs for TOEFL and TR-YÖS. But the
`language_proficiency` branch (evaluate.ts:326-346) matches student proficiency with
`/native|fluent/i`. A student who records French at exactly **"B2"** — precisely meeting Sorbonne's
stated requirement — fails that regex and receives:

```
status: "not_met"
reasoning: 'Your recorded French proficiency ("B2") may not meet this — review manually.'
```

A **confident `not_met`** whose own sentence asks for manual review. This is the opposite of the
error this audit hunts, and far less harmful — but it is the same defect class (a status asserted
where the data does not support one), and it would tell a qualifying student they do not qualify.

---

## SEV-5 — orphans and programme linkage

`program_id` is NULL on **1,227 of 1,254** requirements and on **all 396** deadlines. As the brief
anticipated, this is usually correct — a university-wide English requirement genuinely has no
programme. But it means **no deadline in the corpus is programme-specific**, while both consumer
paths contain explicit logic for programme-scoped deadlines (upcoming.ts:118, scan.ts:147). That
branch is currently dead.

Rows that name a programme in their text while carrying no link do exist and are concentrated in
UCC's per-course deadline set (Pharmacy 1 Mar, Applied Psychology 20 Mar, Computer Science & Data
Science/AI 8 May, Finance 12 May), TU Darmstadt's named master's programmes ("Mechanics Master of
Science", "Mathematics Master of Science", "Particle Accelerator Science Master of Science" —
`8928fe3e`), and VU Amsterdam's extended-deadline rows ("B Bewegingswetenschappen",
"B Philosophy, Politics and Economics"). These are correct as text and unlinkable as data; a
student targeting Finance at UCC gets the same undifferentiated list as everyone else.

Coverage context: **934 of 1,019 universities have zero requirements**, and 65 of 1,019 have any
deadline at all.

---

# Part 2 — source verification record

~30 rows verified against a live source, plus full structural verification of all 1,650 rows.
Fewer live fetches than the 50-60 briefed: I reallocated effort once the NULL-`structured_rule`
result showed no requirement row can currently produce a verdict, toward the deadline paths that
render directly. Each source page below covers several rows.

| Row(s) | Institution | Claim | Result |
|---|---|---|---|
| `5663f898` | METU | IELTS taken **on or after** 24 Dec 2022 refused | **VERIFIED** — live text: *"IELTS exams taken on or after the 24th of December 2022 will not be anymore accepted."* `recency_rule = {"direction":"not_valid_on_or_after","boundaryDate":"2022-12-24"}`. **The direction survived.** |
| `a6a13d44` | Southampton | OSR **accepted** | **VERIFIED** — *"(IELTS) Academic UKVI SELT (including One Skill Retake)"*. `excluded_provenances` correctly NULL. (Gate direction wrong — SEV-2.) |
| `a97ec7c8` | Edinburgh | OSR **refused** | **VERIFIED** — *"We do not accept IELTS One Skill Retake…"*. `excluded_provenances = {one_skill_retake}`. **Neither has been generalised to the other.** |
| `9ec26dfa` | Edinburgh | Cambridge C1/C2 176 / 162 each | **VERIFIED** content, **MISMATCH** source (ets.org) |
| `4564db58`, `adf9f150` | Edinburgh | TOEFL 92 legacy / 4.5 new | **MISMATCH** source (ets.org); thresholds are programme-level, see below |
| `6d2dd7a0` | Glasgow | IELTS 6.5 / 6.0 | **MISMATCH** source (ets.org) |
| `452eafa1` | TU Dublin | 18 before 31 Dec (Sep start) / 31 May (Jan start) | **VERIFIED** verbatim. `age_bar` + `is_exclusion` correct — **unevaluable from birth year alone, and correctly refuses to try.** |
| `2e5a0bec` | TU Dublin | €50 non-refundable application fee | **VERIFIED** text, **MISMATCH** gate (`age_bar`) |
| 7 rows | Georgia Tech | EA1 15 Oct, EA2 2 Nov, RD 6 Jan, undated | **VERIFIED** — page prints month+day only per date; cycle appears in the table header, so `cycle_year=2027` is **sourced, not inferred** |
| 6 rows | Princeton | SCEA Nov 1/6/9, RD Jan 1/8, Feb 1, undated | **VERIFIED** — *"The page does not include a specific year designation with these dates."* All six month/day values match exactly |
| 9 rows | Hacettepe | TR-YÖS 400/500; quota split 60/30/10 | **VERIFIED** against the cited PDF — *"TR-YÖS için %60, SAT için %30 ve GCE-A LEVEL için %10'dur."* **60/30/10 confirmed.** But see CHANGED_SINCE |
| — | Hacettepe | source PDF freshness | **CHANGED_SINCE** — see below |
| — | `iso.hacettepe.edu.tr/Hu_Yurt_Disindan_ogr.pdf` | alternate official regulation | **SOURCE_UNREACHABLE** (DNS failure, curl exit 6). Not treated as evidence. |

### CHANGED_SINCE — the Hacettepe PDF is a cycle stale, and its filename hides it

All nine Hacettepe rows cite
`www.hacettepe.edu.tr/duyuru/yonergeler/Ogrenciyurtdisindanbasvurukayit230525.pdf`, with
`retrieved_at = 2026-08-21`. The filename fragment `230525` reads as 23 May 2025. The **embedded
metadata does not agree**:

```
/CreationDate(D:20250327145032+03'00') /ModDate(D:20250327145032+03'00')
```

**Created 27 March 2025** — seventeen months before retrieval, and neither date matches the
filename. Hacettepe republishes these international-admission regulations per admission cycle, so
a March 2025 document describes the **2025-26** cycle, not 2026-27. **No Hacettepe row carries
`evaluation_gate = 'historical'`**, and all nine present as current.

This is exactly the pattern the method note warned about: the extraction is flawless — the Turkish
verbatim is correct, the 400/500 scale is right, the 60/30/10 split is right — and the document is
a cycle out of date. `retrieved_at` cannot see this; only the embedded `CreationDate` can. A
search of hacettepe.edu.tr surfaced a **second official regulation at a different subdomain**
(`iso.hacettepe.edu.tr/Hu_Yurt_Disindan_ogr.pdf`) which I could not fetch — a human should compare
the two before anything is changed.

### MISMATCH needing a human read, not a fix — Edinburgh's IELTS floor

Row `a97ec7c8` records **IELTS 6.5 with 5.5 in each component** as a university-wide requirement
(`program_id` NULL). The live page states a minimum overall band of **6.0** with 5.5 in each
component, *and* notes that requirements for some degrees are higher. A web-search snippet of the
same page reported 6.5.

I am **not** recording this as a corrected value. It has the exact shape of README pattern 2/3 —
a university-wide floor (6.0) and a common programme-level requirement (6.5) are two true
statements about different things, and 6.5 stored university-wide is the *conservative* direction
(it would under-qualify a student, never over-qualify). Two readings of one page, neither
established: it stays a MISMATCH flagged for a human, per the governing rule that only new
evidence resolves a conflict.

### Conflict-pattern screen

Every candidate contradiction above was checked against the four README patterns before being
recorded. Dismissed as **not conflicts**: the UC / Studielink / CAO / hochschulstart / uni-assist /
UCAS / Common App source hosts (pattern 3 — correct upstream owner); the split TOEFL legacy/new
row pairs (pattern 4 — two scales, both simultaneously valid under ETS dual reporting to Jan 2028);
Freiburg's own WS26/27 split across two states (pattern 1 — two sub-windows of one cycle);
Edinburgh 6.0 vs 6.5 (patterns 2/3 — left open rather than resolved). Recorded as real: only where
one institution's row contradicts **itself** or its own cited page.

---

# The question that matters

**Could this data tell a student they qualify when they do not — and where?**

**Through the requirement evaluator: no, not today, and not by accident.** `structured_rule` is
NULL on all 1,254 rows, so every requirement resolves to `needs_manual_review`; all 78 persisted
evaluations confirm it. Where the evaluator *can* be traced forward, it is genuinely well built —
the gate runs before the category and before the rule, qualifiers can only ever make a verdict more
cautious (`applyBlock`), GPA is never converted across grading systems, METU's backwards recency
rule survived with its direction intact, and TR-YÖS's three incommensurable forms are kept in
separate scale families. The defensive work is real.

**But that safety currently rests on the wrong thing.** It rests on the corpus being empty of
rules, not on the qualifier columns. The moment rules are authored, the 615 ungated machine-
evaluable rows become the risk surface, and these are the shapes that will produce a wrong `met`
first:

- **Waterloo `0cd4c9d3`** — two scales, two thresholds, one row, no scale, no gate. Un-authorable
  without picking one number and silently dropping the other. Its sibling at UCC is gated;
  this one is not.
- **TU Berlin `ec34222a`** — states in its own text that its values map to no enumerated
  `test_scale`, and carries no gate.
- **The 23 rows carrying validity language with no `recency_rule`**, Edinburgh's two-year rule
  among them — a stale certificate that clears the number would evaluate `met`.
- **The dual-scale split rows**, which today are saved by scale-family mismatch rather than by the
  date mechanism built for exactly this, and whose date boundary exists only as English prose.

**Where it can mislead a student today is deadlines, and it does.** SEV-1 is live: 60 expired
dates, across 15 universities, render under a heading that says "Upcoming", sorted so the stalest
appears first — a student looking at VU Amsterdam sees sixteen of them. That will not tell a
student they *qualify*, but it will tell them a door is open that closed eleven months ago, which
is the same category of harm arriving by a different route. And SEV-3 is its mirror: Harvard's and
Princeton's 1 November deadlines cannot generate a notification at all, because refusing to invent
a year — the right call, made well — also removed them from every path that reasons about time.

The single most useful thing this audit found is not any one row. It is that **`verification_state`
was asked to carry the whole actionability judgement, and two read paths disagreed about whether
that was enough.** One added a date filter and is correct; one did not and is wrong. Everything in
SEV-1, SEV-2 and SEV-3 follows from that one unshared assumption.
