# D6 — "row exists but is the wrong kind" audit

**Generalizing D5's own MIT finding**: `lacksResearchDepth` and every count-based emptiness
check D3 measured are structurally blind to one failure shape — a table has a row for a
university, so every "does it have data" check says yes, but the row doesn't answer the
question a student is actually asking. Not an empty field — a *populated* field that answers
the wrong thing. D3's own methodology (measure, then confirm the render chain) can't see this
class at all: it counts rows, never what's in them.

Checked all 12 universities on any student's real `target_universities` list (the same
student-demand scoping [[project_oryn_d5_caltech_deadlines]] established) against every
candidate CEO named, plus one CEO didn't. **Two independently confirmed, two checked and
found clean, one blocked by an unapplied migration.**

## Confirmed: `university_deadlines` (2 of 12)

| University | Rows | Types present | Real application deadline? |
|---|---|---|---|
| Caltech | 0 → 4 (this pass's own D5 fill, staged not applied) | — → early, document, application | No → yes, once applied |
| MIT | 1 | scholarship | **No** |
| Every other targeted university | 1–22 | includes `application` and/or `early` | Yes |

MIT is targeted 10 times — second-most of the 12 — and its one row answers "when's the
scholarship deadline," never "when do I apply." A count-based check (`deadline_row_count > 0`)
marks it identically to Stanford's 11-row, fully-answered case.

## Confirmed, independently, in a different table: `university_statistics` (1 of 12 checked)

| University | Rows | admission_rate | sat/act range | cost_of_attendance |
|---|---|---|---|---|
| Oxford | 1 | null | null | null |
| Every other targeted university with a row | 1 | set | set (5 of 6) | set |
| 6 targeted universities | 0 | — | — | — |

Oxford's one row has only bookkeeping columns populated (`stat_year`, `source`,
`data_confidence`) — none of the four figures a student actually reads. `hasStatistics: true`
(the exact signal `lacksResearchDepth` already uses) marks it as covered; the stat grid on its
detail page renders four cards reading "Unavailable," identical to having no row at all.
Worth naming precisely because `hasResearchDepth`-style logic is not hypothetically blind to
this — it is *currently, actively* reporting Oxford as fine.

(The 6 targeted universities with zero statistics rows at all are D3's own already-measured
category, not a new finding — flagged here only so this table's own "0 rows" line isn't read
as new.)

## Checked and found clean — reported honestly, not forced

**`university_requirements`**: CEO's own named example (a requirement row exists but not of
the type a student asks about — specifically language proficiency). Measured
`requirement_type in ('english_proficiency','language_proficiency')` across all 12 targeted
universities: **every one has at least 2 such rows**, minimum first (Caltech, MIT, Stanford
all at exactly 2). This candidate does not reproduce among universities students actually
target — reporting the negative rather than lowering the bar to manufacture a hit.

**`profile_scores`**: CEO's hypothesis was a dimension row existing with its `state` never
evaluated. Checked the schema directly: `confidence` is a 3-value enum (`high`/`medium`/`low`)
with no fourth "not yet evaluated" state — every row that exists represents some completed
evaluation by construction. This candidate doesn't have the shape CEO described; the real
question for this table (does a row exist at all per dimension per student) is D3's own
row-presence category, not D6's wrong-type category. Noted rather than silently dropped.

## Blocked, not measured: `opportunities`

CEO's own note that 0126 "partially closed" this is correct in principle
(`age_eligibility_confirmed_open`/`grade_eligibility_confirmed_open`, per
[[project_oryn_d2_d3_opportunity_eligibility]]) but not yet in practice — checked
`information_schema.columns` directly: **0126 is still unapplied to the live database**
(confirmed 2026-09-04, same finding [[project_oryn_d2_d3_opportunity_eligibility]] itself
reported at push time). The mechanism to distinguish "confirmed no restriction" from "never
checked" doesn't exist live yet, so this axis of D6 has nothing to measure against until 0126
lands. Revisit once it's applied.

## The permanent check (CEO's second deliverable)

Two new pure predicates, `lib/universities/data-depth.ts`, sibling to `lacksResearchDepth`:

- `lacksApplicationDeadline(deadlineTypes: readonly string[]): boolean` — true unless
  `"application"` or `"early"` is among the types present.
- `lacksAdmissionStatistics(stats: {...} | null): boolean` — true if no row, or every one of
  admission rate / SAT range / ACT range / cost is null.

**Proved red, not just asserted, for both** — CEO's explicit bar. Temporarily swapped each
function's body for the naive row-count/row-presence logic it's meant to replace, reran the
suite, confirmed exactly the MIT-shaped and Oxford-shaped tests failed (and only those —
tests exercising cases where naive and correct logic happen to agree stayed green throughout,
proving the discrimination is real, not a tautology), then reverted to the correct
implementation and confirmed all 16 tests pass. The red-state runs themselves aren't in this
branch's commit history (temporary, reverted before committing) — described here instead:
naive `deadlineTypes.length === 0` failed 2/16 (MIT's real shape, and a
document+international+scholarship shape); naive `stats === null` failed 1/16 (Oxford's real
shape). Both reverts left `git diff` against the committed version at zero before staging.

Neither function is wired into `app/(app)/universities/[id]/page.tsx` or any card/filter —
per this pass's own scope ("kod değiştirme, ölç ve kontrol yaz"), this is the check existing
and proven, not the render path consuming it. That wiring, plus deciding what a student sees
when either fires (a footnote? a different empty-state? folded into `lacksResearchDepth`
itself as a fifth signal?), is real, separate front-end work this pass doesn't include.

## What this means for the next fill batch

Same shape as D3 → D1: this doesn't just count a gap, it reprioritizes the existing one.
- **MIT** now has a proven code check flagging it and a clear one-field fix waiting on a
  tie-breaking source (unchanged from D5 — see that doc for the Jan 4/Jan 5 conflict).
- **Oxford** needs a real `university_statistics` row researched — admission rate, test-score
  range, cost of attendance, from Oxford's own official site, same discipline as every other
  fill this pass: source_url + retrieval date, blank over guessed.
- Both are now higher-priority than the 6 targeted universities with zero rows in a table
  they've never had any coverage in at all, on the same reasoning D5 already established:
  these are universities students are actually looking at, right now.
