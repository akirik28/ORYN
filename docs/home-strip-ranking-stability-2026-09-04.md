# Home-strip ranking stability (2026-09-04)

CEO's question: this session's own visible-33/34 set was different, in composition, every
single time it was re-measured tonight — reported each time as a measurement inconvenience.
CEO's own reframing: this might be a product question nobody asked. Two candidate causes,
genuinely different in consequence: real data change (healthy) vs. unstable tie-breaking on
`match_score` (a student sees a different product on every visit, which erodes trust directly).

## The code has zero secondary sort key — confirmed by reading it, not inferred

`lib/opportunities/home-strip.ts:175`: `.order("match_score", { ascending: false })`. One
column. No `id`, no `calculated_at`, nothing else. SQL does not guarantee tie order without an
explicit secondary key — this is undefined behavior by the SQL standard, not a Postgres quirk.

## Ties at the exact top-5 boundary are severe, not theoretical

Only 21 distinct `match_score` values exist across 2,039 `opportunity_matches` rows. Measured
per-student how many opportunities share the exact score sitting at rank 5 (the score that
decides who's in vs. out of the visible set):

| Student | Boundary score | Opportunities tied at that score |
|---|---|---|
| 96f3274c | 43 | **191** |
| 46dd6f7e | 67 | 148 |
| 49de3083 | 67 | 142 |
| 6e2f0ff1 | 67 | 67 |
| e9eba798 | 73 | 14 |
| 7722ebe9 | 67 | 5 |
| 026e9295 | 67 | 3 |
| ccf2161e | 59 | 1 (no tie) |

7 of 8 onboarded students have a real, multi-way tie deciding their 5th slot. For the worst
case, one specific student's entire top-5 (all 5 rows) shares the identical score of 43 out of
191 eligible candidates carrying that same score.

## But empirically, right now, the query IS stable — and here's precisely why

Ran the exact production query (and separately, this session's own `ROW_NUMBER() OVER
(PARTITION BY user_id ORDER BY match_score DESC)` replication used for every visible-set
measurement tonight) twice in immediate succession. **Identical results both times, byte-for-
byte, same order.** `EXPLAIN (ANALYZE, BUFFERS)` shows why: the planner uses `Index Scan using
opportunity_matches_match_score_idx`, not a sequential scan or an in-memory sort. A B-tree
index scan over tied keys returns entries in the order they physically sit in the index's leaf
pages — which stays consistent across repeated reads **as long as nothing writes to the
table**, because nothing reshuffles pages that are only being read.

**And nothing has written to `opportunity_matches` tonight during this session's own
measurement window**: `max(calculated_at)` across all 2,039 rows is `2026-09-04 07:49:54 UTC`
— hours before this session's own repeated visible-set measurements began, all of which
returned different compositions from each other despite this. `saved_opportunities` is
similarly quiet — last touched `2026-09-01`, three days ago. And none of tonight's own prepared
status changes (Waterloo's split, the Edinburgh/Garcia/Lehigh consolidation) have actually
been applied to the live database yet — checked directly, all four rows are still
`status = 'active'`.

## Honest conclusion: the structural risk is real and confirmed; this session cannot fully explain its OWN earlier-observed rotation

Two things are true at once, and neither explains the other away:

1. **The ranking has no tiebreaker, and ties are severe enough that this is a real, live
   product risk** — the moment ANY write touches `opportunity_matches` (a routine
   `refreshOpportunityMatches` run, unrelated to a given student, can still split a shared
   B-tree page), the physical order of tied entries can shift for reasons having nothing to do
   with the specific student or opportunity involved. A student is not guaranteed to see the
   same "top 5" today that they saw yesterday, even with identical underlying eligibility and
   scores. This is confirmed by reading the code and the query plan, not assumed.
2. **This session cannot fully reconstruct why its OWN visible-33/34 set differed across three
   separate measurements tonight** — every mechanism that could explain it (match_score
   recompute, an opportunity's status/cycle_status changing, a saved_opportunities change) has
   been checked directly and ruled out as static during this session's own measurement window.
   The two repeated-query tests just run show the mechanism CEO asked about (tie-order
   instability) does NOT reproduce on demand against a quiescent table. Whether this session's
   own earlier rotation came from a write this session didn't have visibility into, or from an
   error in this session's own earlier query construction that wasn't caught at the time, is
   not resolved here — stated as an open, not a closed, question rather than forcing a tidy
   answer this investigation didn't actually prove.

## Recommendation, not applied

Add a stable secondary sort key regardless of the open question above — the structural finding
alone (severe ties, zero tiebreaker, one write away from silently reordering) justifies it on
its own. `.order("match_score", { ascending: false }).order("id", { ascending: true })` (or
any other deterministic column) turns "which of 191 tied rows appears" from an implementation
accident into a defined, stable choice — every repeat visit shows the same opportunities in
the same order until something in the underlying data genuinely changes. Likely the one-line
fix CEO's own framing anticipated; not written here, since this task was look-and-report.

---

## ✅ 2026-09-05 audit — closed (same day)

The recommended fix (secondary sort key) → **Closed** — commit `b798e0f8` (2026-09-05), "Fix
the home-strip ranking tiebreaker, and its twin in the parent panel". See
`docs/ranking-tiebreaker-fix-2026-09-05.md` for the full red-green proof and the empirical
Postgres-level instability demonstration. Verified via `git merge-base --is-ancestor
b798e0f8 origin/main`.
