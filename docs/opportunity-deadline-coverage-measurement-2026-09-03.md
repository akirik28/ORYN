# Deadline coverage: measured, not filled

**Date:** 2026-09-03. **Author lane:** this session. **CEO dispatch**: 421 opportunities, 82
(19%) carry a deadline. Before filling anything, measure whether the missing 81% is
genuinely undated versus a real date sitting on the official page that was never captured —
different problems, only one fillable, and "tell me the measurement first if it's large." It
is large, and it doesn't resolve into a clean two-way split — that's the actual finding.

## The numbers, re-verified before trusting the relay

Confirmed live, matching the relayed figures exactly: 421 total, 82 with a deadline
(summer_program 28/245, competition 35/101). Among **active** rows specifically — the
population that actually reaches a student — 282 total, 205 missing a deadline (72.7%).

**The first real finding, before fetching a single page: a meaningful share of "missing"
isn't missing at all.** Broken down by `cycle_status` among active rows:

| `cycle_status` | active total | missing deadline |
|---|---|---|
| `date_not_announced` | 52 | 50 (96%) |
| `unverified` | 74 | 73 (99%) |
| `open` | 38 | 25 (66%) |
| `upcoming` | 47 | 20 (43%) |
| `closed` | 63 | 34 (54%) |
| `historical` | 8 | 3 |

A `date_not_announced` row missing a deadline is **the correct, honest state** — that's what
the value means, and it's the exact bucket this session's own state-machine fix
([[project_oryn_reverification_turkish_patterns_and_statefix]]) unblocked tonight. Those 50
rows are not part of "the gap" by construction. `unverified` is the real question mark: it's
the largest bucket (74 rows, the single largest cycle_status in the whole active catalogue)
and means "never confirmed either way" — could be genuinely rolling, could be simply
unresearched. `open`/`upcoming` missing a deadline is the most operationally consequential
shape (a program taking applications right now with no visible closing date) and the
smallest population, so highest-value to resolve first.

## Method

A stratified, not priority-ranked, sample of 69 active rows with a missing deadline and a
real URL on file — weighted toward `open`/`upcoming` (the highest-stakes, smallest buckets,
sampled near-exhaustively: 15 and 12 respectively) and `unverified` (the largest bucket, 20
sampled), with smaller checks on `closed`/`historical` (13) and `date_not_announced` (6, to
verify the "correctly honest" assumption empirically rather than trust the label — this
session found labels can be wrong once already tonight, on `notify-university-changes`'s
own catalogue-research backfill). Fetched with the same `runFetchLadder`
(`lib/opportunities/reverification/fetch-ladder.ts`) the reverification job uses — reused,
not reimplemented. **61 of 69 fetched successfully (88%)** — a real, current confirmation
that the earlier reverification measurement's own finding (real host-blocking is rare, most
"unreadable" is something else) generalizes beyond that job's own corpus.

Every fetched page was searched for deadline-language and date-like tokens, then **read by
hand** — the same discipline as every prior measurement pass tonight, not a keyword count
trusted at face value.

## What the reading actually shows — not a clean split

**Confirmed, specific, current deadlines sitting on the page, uncaptured — the clean
fillable case:**
- International Psychology Olympiad: *"Qualification deadline: before June 30, 2027"* —
  stored `closed`, but this is a live, future date. Also means the stored `cycle_status`
  itself is stale, not just the deadline — a second, related gap on the same row.
- Northwestern CTD Summer Camps: *"The application deadline for this scholarship is April
  15"* (tied to real 2026 session dates on the same page).
- Universidad de Navarra: *"Application deadline: March, 31st... Registration and payment
  Deadline: April 30th."*
- NFTE Youth Entrepreneurship: *"Launch: September 9, 2026... Submission Deadline:"* (cut off
  in this fetch depth — the number is there, capturing it needs a slightly deeper read).

**Confirmed, explicit, genuinely no deadline — must not be filled, and this is the case that
makes the schema question real:**
- International Journal of High School Research: *"There is no deadline for submission for
  any issue. IJHSR accepts submissions all year long without a deadline."*
- Wharton M&TSI: *"M&TSI APPLICATIONS FOR SUMMER 2027 TBA! Deadline to Apply: TBA"* — the
  program's own page says TBA. `date_not_announced` is exactly right here, not a gap.

**A structurally different bug, found in the same pass, not folded into "missing
deadline":** Summer at Stanford Program for High School — the catalogue record's own title
carries "2025" and is marked `historical`, but the live page already shows *"program runs
June 20–August 16, 2026"* — a real, current cycle. The record is frozen on a stale snapshot
while the institution's own page has moved on. Filling a deadline onto the `historical` row
as-is would attach a 2026 date to a record labeled as a past cycle — the identity/currency of
the row needs fixing first, which is a different kind of correction than this pass is
scoped to make.

**The largest and most honest finding: most raw date mentions on these pages are not
deadlines, and the largest single bucket resists a single-page fetch entirely.**

Of 61 readable pages, 19 (31%) contained deadline-specific language (the cases above and
their siblings), 19 more (31%) contained a date-like token with **no** deadline word nearby,
and 23 (38%) contained neither. Read all three buckets by hand, not just counted:

- **In the 19 "date but no deadline word" rows, the substantial majority are program session
  dates, blog/news post dates, or event dates — not application deadlines.** KU Leuven's
  "Session I: 20–24 July 2026" is when the camp runs, not when applications close. American
  Legion Boys State's dates are news-article timestamps. Purdue University's are research
  press releases. This is the same lesson from tonight's reverification work
  ([[project_oryn_reverification_excerpt_scoped_dates]] — a page-wide date scan attributes
  the wrong date to the wrong fact) at catalogue scale: **a bulk pass that grabbed "any date
  on the page" would produce systematically wrong deadlines for most of this bucket, not
  just fail to find real ones.**
- **The 23 "neither" rows are the genuinely unresolved third of the sample.** Spot-checked
  six of the largest (2,500–200,000+ characters of real content each): most show clear
  "Apply"/"Enroll"/"Register" call-to-action language with *no* date anywhere in the fetched
  text — the actual date likely sits behind a form, on a sub-page an "Apply" link points to,
  or genuinely isn't published anywhere text-visible. One (Nat Geo Slingshot) is a PDF whose
  extracted "content" is unreadable binary metadata — the same rung-4 gap the reverification
  design doc already names and defers (§7.3). **A single-page fetch cannot resolve this
  bucket.** Filling it needs either a deeper crawl (following the actual apply link) or a
  targeted search per row — real per-row cost, not a bulk pass.

## The answer to the actual question, stated as honestly as the evidence allows

Not "X% undated, Y% uncaptured." The true shape: **a small, high-confidence set of rows have
a real, specific, current deadline sitting in plain text, ready to fill now. A comparably
small set are explicitly, correctly undated — no fix needed, and this is the case that makes
the schema question real (see below). The largest bucket, by a wide margin, is genuinely
ambiguous from what a single official-page fetch can show, and would need real per-row
research effort — comparable to the university-requirements depth passes tonight, not a
one-shot script — to resolve properly.** Reporting a single blended percentage here would be
false precision the evidence doesn't support.

## The schema question, brought to you rather than resolved

`opportunities.deadline` is one nullable column. It cannot currently distinguish:
- **Genuinely no deadline** (rolling admission, accepts submissions year-round — IJHSR's own
  words) from
- **Deadline not yet announced for the current/next cycle** (Wharton M&TSI's own "TBA") from
- **Deadline unknown to us** (`unverified`, simply never researched).

The second case already has a real value doing real work — `cycle_status = 'date_not_announced'`,
which this session's own reverification fix just made reachable end to end. The first case
has nothing: a genuinely-rolling opportunity and a genuinely-unresearched one both render
identically today, both to the catalogue's own logic and to a student looking at a blank
field. Whether that gap needs a schema change (a fourth `cycle_status` value, or a boolean
`deadline_is_rolling` flag) or is acceptable as-is is exactly the founder-level call this
document exists to bring, not decide — matching the explicit instruction, and the same
"decision, not a research task" framing Phase 16/17 already applies to admission-outlook
precision elsewhere in this codebase.

## Addendum (2026-09-03, same day): the "has a deadline" set is weaker than it looks

A second, independent gap, flagged by a peer session and confirmed live against
`oryn-qa-scratch` before writing it here:

```sql
select
  count(*) filter (where status = 'active') as active_total,
  count(*) filter (where status = 'active' and deadline is not null) as active_with_deadline,
  count(*) filter (where status = 'active' and deadline is not null and deadline >= now()) as active_future_deadline,
  count(*) filter (where status = 'active' and deadline is not null and deadline < now()) as active_past_deadline,
  count(*) filter (where deadline is not null) as all_status_with_deadline
from opportunities;
-- active_total: 282, active_with_deadline: 77, active_future_deadline: 37,
-- active_past_deadline: 40, all_status_with_deadline: 82
```

The "82 (19%) carry a deadline" figure this document opens with is real, but it answers "is
the column non-null," not "is the column useful." Of the 77 active rows with any deadline
value, **40 — more than half — are already in the past.** The value is still sitting there;
nothing has cleared or reclassified it. Only 37 active rows (13% of the 282 that reach a
student) have a deadline that is both present and current.

This is a different problem from the one this document measures, and it doesn't change any
number above: 205/282 missing is still 205/282 missing, regardless of whether the 77 present
ones are current. But it means the "already covered" baseline this document treats as the
solid ground under the gap is itself softer than a raw non-null count suggests — a passed
deadline sitting unflagged in the column is not a neutral absence the way `unverified` or
`date_not_announced` is; it's stored data that reads as coverage. Whether any consumer of this
column (the "due soon" dashboard surface, the deadline-reminder job, the urgency term in
opportunity matching) filters on `deadline >= now()` before trusting the value was not
re-checked here — that's a distinct, boundable question, not re-derived in this pass. What's
confirmed here is only the raw count, independently, against live data.

If a future fill pass touches this table, it should treat these 40 rows as part of its scope
too — either by re-verifying the cycle has genuinely closed (in which case the row likely
belongs in `closed`/`historical`, not still reading as "has an active deadline"), or by
finding the next real cycle's date the same way the fillable cases above were found.

## What this measurement does not do

No writes, staged or otherwise. No deadline filled. This is deliberately a stopping point,
not a batch — CEO's own words were to re-scope early rather than build a big batch on the
wrong assumption, and the assumption ("a clean split, a script can resolve most of it") is
the one this measurement complicates. If the next step is filling the ~19 clean cases plus
whatever a deeper read of the "neither" bucket resolves, that's a real, boundable follow-up
package (`data/research/`, per-row source URL and retrieval date, dry-run validated, no
writes) — sized correctly once this document's own shape is confirmed rather than assumed.

## Gates

Read-only throughout — real fetches via the reverification job's own tested fetch ladder, no
database writes attempted. No code changed.
