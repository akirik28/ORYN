# What a student cannot do yet — measured 2026-09-01, 20:30

Written for a founder conversation, not as a plan. Every number below was queried live against
`oryn-qa-scratch` on the evening of 2026-09-01. Nothing is carried forward from an earlier
document, because every document that answers this question is stale: `feature-inventory.md`
(16 Aug), `current-product-capability-map.md` (20 Aug), `final-product-audit.md` (15 Aug),
`launch-readiness.md` (16 Aug), `pilot-readiness.md` (19 Aug) — the newest predates **92 merges**.

The frame is the founder's own MVP list (spec Phase 53, sixteen things a student should be able
to do), because that is the bar the product was written against. Each item is marked by what the
live data shows, not by whether code exists.

---

## Works, with real students behind it

| MVP item | evidence |
|---|---|
| Create an account, complete onboarding | **8 students onboarded** |
| Enter or import a profile | 3 CV imports; **21 career goals** set |
| Add activities and achievements | populated across all 8 |
| Receive profile analysis | **7 of 8** have at least one assessed dimension |
| Understand strengths and gaps | dimension states + confidence render on Home |
| Receive prioritised actions | **8 weekly plans** generated |
| Browse personalised opportunities | **1,921 matches** across 8 students |
| Explore and save universities | **18 target universities** saved |
| Ask Oryn personalised questions | **26 advisor messages** |
| Track deadlines | **3 applications**, deadline engine live across 3 sources |
| See the profile evolve | **26 score snapshots** |

That is eleven of sixteen genuinely working. The product is not a shell.

---

## The five that do not work yet, in the order they cost a student most

### 1. The loop that makes this a career OS and not a to-do list has never completed

**Reflections saved: 0.** Four actions were completed on 22–23 August — `product_events` proves
it — and all four rows are gone. `lib/plan/persist.ts:70` hard-deletes every action on a week's
plan when the plan regenerates, including completed ones and the notes written about them.
`lib/ai/student-context.ts:201` reads exactly those fields into the advisor's prompt, so the
deletion doesn't merely lose history — **the advisor permanently forgets what the student did.**

Two clicks did it, on two separate accounts. A confirmation dialog landed tonight, which stops it
being silent; **it does not stop it happening.** What regeneration should do with completed work
is an open product decision (backlog item 39): carry forward, delete only incomplete, or archive.

### 2. The admission outlook shows nothing for 17 of 18 saved universities

This is closer to working than it looks, which is why it belongs high on the list:

- **9 of 18** have university-side statistics
- **12 of 18** have requirements
- **13 of 18** belong to a student with 3+ assessed dimensions
- **6 of 18 have both sides ready** — and only **1** has an outlook computed

So five targets have the data and no result. That is a much smaller problem than "the feature is
empty", and nobody has yet established whether the remaining gate is stricter than expected or
the refresh simply hasn't run for them. **Worth one session's investigation, not a rebuild.**

### 3. The university catalogue is a name and a photo for most of it

**1,019 universities. 150 with programmes, 111 with requirements, 105 with deadlines.** A student
clicking most schools finds nothing that changes a decision — the plan's Gate F, and its own
words: *breadth is not coverage.*

Sharpest instances, all measured:

- **MIT — the most-targeted university in the product, 5 of 8 students — has zero requirements.**
  The research has existed since 21 August (16 records). All 44 MIT and Caltech records were
  rejected because `mitadmissions.org` fails a `looksOfficial()` check requiring `.edu`/`.ac.`/
  `.gov`. **MIT's own admissions site is a `.org`.**
- **Türkiye: 12 universities in the catalogue**, for a pilot cohort of Turkish students.
- **Warwick: 190 programmes, 5 requirements.**
- ~466 further research records sit rejected; `unresolved_university` names *"Ankara University"*
  as having no match in Türkiye, which reads as an alias gap rather than bad research.

Five sessions are working this now. **None of it requires new research to start** — most of the
data already exists and is stuck behind gates.

### 4. Evidence is effectively unused

**1 evidence file across 8 students.** The upload path works and the four-state vocabulary
(`self_reported` → `evidence_added` → `verified`) is honest and wired through the advisor's
prompt. But with one file, nothing in the product has been exercised against real evidence, and
the counsel currently describes almost every achievement as `[self-reported]`. That is truthful
and it is also the product's weakest claim about any student.

Not a bug. An unanswered question about whether students will ever attach anything, which the
pilot answers and nothing else will.

### 5. Peer benchmarking cannot say anything, correctly

`MIN_COHORT_SIZE = 100`, exactly as the spec requires; **8 students exist.** The feature refuses
to show a percentile and says so. This is the system working as designed and it will keep showing
nothing until the cohort is two orders of magnitude larger. Listed so it isn't mistaken for
broken.

---

## Specified, not built

Neither is a defect; both are scope the founder has never been asked to rule on.

- **Application readiness (Phase 70)** — a percentage measuring how much of a known application
  is assembled. `lib/opportunities/readiness.ts` is a different thing (opportunity
  recommendation-readiness); there is no application readiness anywhere.
- **Job D (weekly plan generation) and Job E (stale data detection)** — Phase 30 specifies five
  scheduled jobs; four routes exist and are correctly wired. Job D's absence is why every weekly
  plan in the database was generated by a student sitting on the page rather than on a schedule.
- **Academic Fit / Profile Fit as two displayed numbers (Phase 16)** — the mandatory *explanation*
  (strengths, gaps, unknowns) is implemented and live; the two 0–100 figures are not displayed,
  and the columns that look like they hold them hold something else (`academic_fit_score` is a
  selectivity-adjusted composite, not an academic measure).
- **Four of five notification categories** — only `weekly_plan` has ever fired. Deadline, new
  opportunity, profile update and university-data-changed have produced nothing.

---

## What this list is not

It is not ranked by effort, and it deliberately excludes everything already on
`founder-blocked-backlog.md` — credentials, migrations, the lawyer, production, the credit
decision. Those are known and waiting. This document answers a different question: *if a student
opened Oryn tomorrow, what would they find missing?*

The honest summary is that **eleven of sixteen MVP capabilities work with real students behind
them**, one is destroyed by a bug with a decision attached, one is five sessions away from
working, one is a research problem already under way, and two are waiting on a pilot rather than
on engineering.
