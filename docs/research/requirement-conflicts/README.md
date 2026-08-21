# Recorded source conflicts in the requirements corpus

**Lane:** requirement-source-conflicts. **Work date:** 2026-08-22.
**Scope:** every record in `data/research/university-requirements/` carrying
`verification_state: CONFLICTING_EVIDENCE`.

## What was found

Grepping the corpus for the verification state itself (not just string mentions of it) returns
**31 records across 29 files**. Those 31 records group into **14 distinct conflicts** — several
conflicts span multiple records, CMU alone accounting for six and Humboldt for four.

Of the 14: **12 are resolved**, **2 remain open**.

The headline result is not the resolution count. It is *how* they resolved:

> **Nine of the twelve were never conflicts.** They were two true statements about different
> things — different cycles, different applicant groups, different scales, different levels of a
> national system — recorded as if they were two competing answers to one question.

That failure mode matters more than any individual date, because it is systematic. A conflict
detector that compares two values without first checking that they are answers to the *same
question* will keep generating these. See [the cross-cutting patterns](#what-actually-generated-these) below.

## The governing rule

Only **new evidence** resolves a conflict. Never a heuristic, and specifically never
*"the more recently updated page wins."* The corpus already holds worked counterexamples in both
directions, and this pass produced two more:

- **Heidelberg (#11)** — the older document appears to describe the real process; the newer,
  cleaner-looking faculty page simply omits a step. Unresolved, but the newer page is *not*
  the safe bet.
- **Hamburg (#10)** — the 2019 page and the 2026 page disagree, and the 2026 page is probably
  right. It is recorded as probably right **because ETS's published CEFR B2 floor is exactly the
  number it states**, not because of its date. The recency signal pointed the same way and was
  deliberately not used.

Where evidence did not settle a conflict, it stays a conflict. An unresolved conflict honestly
recorded is a good outcome; a wrong resolution published as truth is the worst thing this product
can do.

## Index

| # | Subject | Status | What settled it |
|---|---|---|---|
| [01](01-manchester-medicine-entry-year.md) | Manchester — Medicine/Dentistry October deadline | **Resolved (split finding)** | UCAS's dated 2027-entry event page. Manchester's *date* is right, its *entry year* is wrong — and the page is still live and still self-contradicting |
| [02](02-cmu-early-regular-decision-dates.md) | CMU — ED/RD deadline dates | **Resolved — not a conflict** | Weekend/holiday shifting plus cycle. One rule predicts all six numbers |
| [03](03-harvard-standardized-testing-policy.md) | Harvard — SAT/ACT required vs optional | **Resolved — not a conflict** | The 2021 page self-scopes to a closed cycle; supersession is dated (11 Apr 2024) |
| [04](04-harvard-questbridge-deadline.md) | Harvard — QuestBridge deadline | **Resolved** | QuestBridge owns the deadline: 1 October, 23:59 PT |
| [05](05-spain-preinscripcion-foreign-systems.md) | Spain — preinscripción closing date | **Resolved — not a conflict** | Comunidad de Madrid owns the Madrid district calendar: 6 July, 14:00 |
| [06](06-erasmus-euc-application-deadlines.md) | Erasmus EUC — application deadlines | **Resolved — not a conflict** | Each figure is correct for its own cycle; the page labels both |
| [07](07-groningen-feb-master-deadlines.md) | Groningen — FEB master's deadlines | **Resolved — not a conflict** | A 2×2 table was read as a 1D list. The sources agree exactly |
| [08](08-humboldt-uniassist-master-window.md) | Humboldt — uni-assist master's window | **OPEN** | Source is behind anti-scraping protection; not bypassed |
| [09](09-vu-law-in-society-deadlines.md) | VU Amsterdam — Law in Society deadlines | **Resolved — not a conflict** | Different applicant populations; page has since been clarified |
| [10](10-hamburg-psychology-english-thresholds.md) | Hamburg — Psychology English thresholds | **Split: half resolved, half unmeasurable** | ETS's CEFR B2 floor; and ETS discontinued the paper test |
| [11](11-heidelberg-uniassist-medicine.md) | Heidelberg — uni-assist for Medicine/Dentistry | **OPEN** | No current dated source exists; stale PDFs from 2011 and 2018 both still live |
| [12](12-glasgow-equal-consideration-date.md) | Glasgow — equal consideration date | **Resolved** | UCAS owns the date: 13 January 2027 |
| [13](13-toefl-january-2026-rescale.md) | Glasgow vs Edinburgh — TOEFL threshold | **Resolved — not a conflict** | ETS dual-reports both scales until Jan 2028; the record's premise was false |
| [14](14-ucla-application-filing-period.md) | UCLA — application filing period close | **Resolved** | UC systemwide owns the UC Application: closes 30 November |

## What actually generated these

Four patterns account for nine of the twelve resolutions. Each is mechanical enough to be worth
checking *before* a value is ever recorded as conflicting.

**1. Two cycles, not two answers** (#02, #03, #06, #12)
A page states a date for a cycle it does not name, or names a cycle in one paragraph and a
different one in a heading. Two figures that look contradictory are each correct for their own
year. **Check:** can each figure be bound to a cycle? If yes, and they bind to *different*
cycles, there is no conflict — there is a staleness or labelling problem, which is a different
defect with a different fix.

**2. Two populations, not two answers** (#07, #09)
A deadline differs by applicant group (EU vs non-EU, own-bachelor's vs external, NC vs non-NC) or
by start month. Collapsing a table into a list pairs the wrong cells. Groningen's "conflict" was
entirely this: a 2×2 grid of *(prior education) × (start month)* read as a flat list, pairing
`1 August` and `1 January` as if they were the two competing answers when they are the two cells
of the *same* row. **Check:** does the source's own layout carry an axis the extraction dropped?

**3. Two levels of a system, not two answers** (#05, #04, #14, #01, #12)
A national service, an application platform, and an individual institution each state "the"
deadline, and they are not all describing the same object. UNEDasiss is a national credential
service and owns no region's admission calendar; the Comunidad de Madrid owns Madrid's.
**Check:** which body actually *owns* this fact? That body's figure governs, and a restatement by
someone else is a paraphrase, not a competing fact. This is the single most productive question in
the whole pass — it settled five of the fourteen.

**4. Two scales, not two answers** (#13, #10)
The same test reported on two scales during a transition looks like two irreconcilable numbers.
ETS dual-reports the 1–6 and 0–120 TOEFL scales until January 2028, so both are simultaneously
valid and both are evaluable against one score report. **Check:** is there a `test_scale` that
would make both true?

A fifth pattern produced no resolutions but is the most dangerous:

**5. The instrument no longer exists** (#10)
Both sides of Hamburg's paper-based TOEFL figures name a test ETS discontinued. Neither is right,
neither is wrong, and a student cannot satisfy either. **Unmeasurable is a real answer** and no
amount of comparing the two figures would ever have produced it.

## Populating `requirement_source_conflicts`

Migration 0056 created the table and nothing has ever written to it. Each document below ends with
a proposed row. **This lane wrote nothing to the database** — no DB writes, no migrations. The rows
are specified here for whichever ingestion path owns writing them.

Schema (`supabase/migrations/0056_requirement_shape_representability.sql`):

```
requirement_source_conflicts (
  id, university_id, subject, status, resolution_note, resolved_at, created_at, updated_at
)
status ∈ ('unresolved', 'resolved', 'superseded')
```

with `conflict_group_id` on both `university_requirements` and `university_deadlines` pointing back.

Two notes on populating it:

- **`subject` is student-facing.** The column comment says it is "shown to students as the reason a
  value is withheld." Write it in product language — "Master application deadline", not
  "DL0015/DL0016 divergence".
- **Resolved rows still belong in the table.** The nine that dissolved should land as
  `status: 'resolved'` with the mechanism in `resolution_note`, not be dropped. Dropping them loses
  the audit trail and invites the next pass to re-flag the same pairs. A resolved row is the record
  that someone checked.

Two conflicts (#08, #11) should be written `status: 'unresolved'` with **both readings intact and
neither presented as settled fact**. That is their correct final state today, not a gap to be
closed later by guessing.
