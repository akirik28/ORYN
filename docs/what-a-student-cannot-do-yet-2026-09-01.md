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

### 2. The admission outlook works. It just never recomputes as a student improves

**This item was wrong when first written, twice, and the corrected version is much smaller.**
It said the feature was empty for 17 of 18 saved universities. All 18 are now accounted for with
nothing left over:

- **12 rows (4 students) were never saved through the app at all.** Each shares an *identical
  microsecond* `created_at` with its siblings — impossible for real saves, which are one HTTP
  round-trip each, and no other code path in `app/`, `lib/` or `scripts/` inserts into
  `target_universities`. They were bulk-seeded straight into the database. The save-time refresh
  never fired because there was no save.
- **6 rows (3 students) are genuine saves** — individually timestamped, minutes apart. They are
  null because all three students' dimensions sit at `low` confidence, which
  `evidenceStateFor` maps to `limited_evidence` and `isAssessed` excludes. **The honesty gate
  working exactly as designed**, refusing to publish an outlook for a profile it hasn't really
  read.
- **1 row has a real outlook** — the control, proving the mechanism works when a real save meets
  confident signal.

**My own arithmetic was the error.** I reported one student as having "9 of 9 dimensions
assessed" from a query counting `jsonb_array_length(reason_codes) > 0`. The product does not
define "assessed" that way — `isAssessed` reads the evidence *state*, and a dimension scored at
`low` confidence is `limited_evidence`, not assessed. I invented a predicate instead of using the
product's own, which is the specific mistake this codebase has a standing rule against.

**What is genuinely missing, and it is a product decision rather than a bug:** nothing
retroactively refreshes a saved university's outlook when a student's profile later crosses the
confidence threshold. The only two triggers are the save itself and a visit to that university's
detail page. So a student who saves five universities in week one and fills in their profile in
week three still sees five empty badges — the outlook is frozen at whichever moment they happened
to click. A weekly sweep, or refreshing stale rows on dashboard load, would close it; neither
exists.

A missing error check on that write was real and has been added (logged, not thrown) — useful for
the next failure, though it was not this one.

### 2b. The requirements queue is lying about its own state

Established tonight, and it changes how the corpus should be read: **~193 records that the queue
labels `rejected` or `unresolved_university` are not losses.** 35 of 36 `rejected` rows match live
`university_requirements` by exact text — later re-ingestion captured them and the outcome labels
never caught up. Of 157 `unresolved_university`, **143 are correct non-matches** (national bodies:
swissuniversities, Ireland's CAO, OUAC, Québec, EducationPlannerBC — not universities), 12 are
already recovered, and exactly **one fact is genuinely missing** (Ankara's TR-YÖS 200-point
baseline).

The 219 `not_ingestible` are the gate working: mostly January 2026's TOEFL rescale making several
universities' per-subtest thresholds literally unsatisfiable, plus genuine
conflicting-official-source cases. Correct refusals.

So the depth problem is **narrower than the queue makes it look** — but the queue's labels need
reconciling, or the next person reads 466 losses that aren't there.

### 3. The university catalogue is a name and a photo for most of it

**1,019 universities. 150 with programmes, 111 with requirements, 105 with deadlines.** A student
clicking most schools finds nothing that changes a decision — the plan's Gate F, and its own
words: *breadth is not coverage.*

Sharpest instances, all measured:

- **MIT — the most-targeted university in the product, 5 of 8 students — has zero requirements.**
  Research has existed since 21 August, spread across **six corpus files** (34 records). All
  **44** rows it produced in `requirement_research_queue` are `malformed_source`, because
  `mitadmissions.org` fails `looksOfficial()` (`lib/acquisition/source-authority.ts:204`), which
  accepts only `.edu`/`.ac.`/`.gov`/`.go.jp` — no `.org` anywhere. **MIT's own admissions site
  is a `.org`.**
- **Caltech is a different gap and must not be lumped in with MIT.** It has **zero rows** in
  `requirement_research_queue` and **zero records anywhere in the corpus** — never researched,
  not blocked. The allowlist fix that unblocks MIT's 44 will not touch it; Caltech needs a
  fresh research pass.

  *Corrected 2026-09-01 21:00.* The first version of this section said "44 MIT and Caltech
  records rejected" and cited "16 records". Both were wrong in the same way: 16 was one file's
  line count quoted next to a 44-row queue count **without reconciling the two**, and the 44 are
  entirely MIT. Caught on independent verification. Two numbers about the same thing that don't
  add up are the night's own recurring tell, and I published a pair of them.
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
