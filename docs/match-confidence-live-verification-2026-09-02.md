# `match_confidence` (migration 0086) is live — confirmed two independent ways

Follow-on to the founder's restart after applying the pending migrations. Asked directly:
does `refreshOpportunityMatches` now write the column for real, no degrade, no retry — and are
any live rows actually carrying a computed value. Both checked, not assumed from the migration
having applied cleanly.

## The column exists, at the schema level

```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_name = 'opportunity_matches' and column_name = 'match_confidence';
-- match_confidence | text | YES
```

Migration 0086 itself adds no default and no backfill (`add column if not exists
match_confidence text check (...)`, nothing else) — so any populated row had to come from a
real write on the application's own path, not from the migration itself.

## The log: degrade warnings fired, then stopped

The shared dev server writes its own log to `.next/dev/logs/next-development.log`. Read
directly rather than started a second server to avoid it (a second `next dev` in this checkout
hit the documented cross-worktree lock immediately, which is itself informative that the lock
is real and situational, not just a stale note). Two snapshots, read minutes apart because a
peer session restarted the shared server in between:

- **First read**: `[opportunity-matches] match_confidence column not yet live (migration 0086
  unapplied) -- retrying without it` fired repeatedly in the first ~70 seconds of that server's
  uptime, then **did not recur again for the following 40 minutes** of log — consistent with
  those early hits landing before the founder's apply, and everything after landing clean.
- **Second read** (a fresh boot, after the restart): **zero degrade warnings from server start**
  onward. A cold boot showing none at all is the cleaner of the two signals, and it agrees with
  the first.

## The data: one real write, from real traffic, not a manufactured test

```sql
select count(*) as total, count(*) filter (where match_confidence is not null) as with_confidence,
  count(distinct match_confidence) as distinct_values, max(calculated_at), min(calculated_at)
from opportunity_matches;
-- total: 1953 | with_confidence: 189 | distinct_values: 1
```

(1,953 total, not the 1,931 last cited — 22 more matches computed since that figure was taken;
noted, not chased further.)

**189 rows, all `match_confidence = 'not_assessed'`, all `calculated_at = 2026-09-02
10:42:16.536` to the millisecond, all one user** — `e9eba798-195d-4859-960c-4b8968df7819`, which
is `oryn.qa.b`. Checked before trusting it, not assumed: `'not_assessed'` is one of the five real
`EvidenceState` values migration 0086's own check constraint allows (`evidenceStateFor()`,
reused from `lib/scoring/signal.ts`), not a placeholder or a migration default — the migration
adds no default at all, so this value was computed and written by the real code, correctly,
for every one of this student's matches in a single request.

**This wasn't manufactured** — it's this session's own earlier `oryn.qa.b` navigation
(dashboard/opportunities visits from the notification-verification and aggregation-verification
passes) incidentally triggering `refreshOpportunityMatches`, for real, after the migration
landed. One student's page render recomputing all of their own matches at once explains both
the shared timestamp and the shared value far better than a batch job would — a real evidence-
state computation returning the identical honest answer for every match on one thin-evidence
profile is exactly what "correctly working, not yet exercised broadly" looks like.

## What this doesn't show

**The other 1,764 of 1,953 matches (90.3%) have not been recomputed since the migration landed**
— exactly the honest "nothing has triggered a recompute" case named as a legitimate possible
answer going in. `refreshOpportunityMatches` only runs when a page renders for the student whose
matches those are; nothing here re-runs it in bulk. That's expected, not a gap this check found
— the column writes correctly when the code path actually runs, which is the question that was
asked, and the answer is yes, confirmed from the log and the data independently rather than
either one alone.

## What this did not do

No writes of any kind — every check was a read (`information_schema`, `opportunity_matches`,
the server's own log file). Did not attempt to trigger a recompute for any other account,
including the founder's. Did not investigate the 22-row count discrepancy beyond noting it. Did
not test migration 0087's `isUniqueViolation` catch branch, now live but never yet fired against
a real collision — flagged as an open caveat by the assigning message, not asked to be exercised
here, and exercising it for real would mean deliberately reproducing the exact race the
migration exists to prevent.
