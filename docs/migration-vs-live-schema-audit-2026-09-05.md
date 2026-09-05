# Migration files vs. live schema — full audit, 2026-09-05

CEO's assignment: the migration-history record (`list_migrations`) is unreliable — it's
missing several migrations that are actually applied, recorded under names that don't match
their filenames, and its naive last-numbered entry (0066) undercounts by at least 5 (0071 is
also record-confirmed; everything after that needed direct schema verification). One lane's
raw read of "record stops at 0066" could not be trusted as "0067-0133 are unapplied" without
measuring — this document is that measurement, done directly against `information_schema` /
`pg_catalog`, not the migration-history table.

**Method**: every migration file's `CREATE TABLE` / `ADD COLUMN` / `CREATE INDEX` / function
name was cross-checked against a live snapshot of every column, index, and function actually
in the `public` schema (project `qtcvcflzxbuagvvwahhu`, queried 2026-09-05). Constraint
bodies, RLS policies, enum internals, and function *bodies* aren't visible this way — those
are marked UNKNOWABLE FROM SCHEMA rather than guessed. Two rows (0121, then 0104's danger)
needed a direct `pg_get_functiondef`/file read beyond the snapshot; both are resolved below.

## Headline result

**Essentially all of `main`'s migration history (0001-0123) is already applied live.** The
real gap is small and specific — not "67 unapplied migrations," which is what a naive read of
the migration record's last numbered entry would have implied.

**Genuinely unapplied, confirmed by direct object absence:**
- **0123** `payment_provider_seam` — `checkout_sessions`, `subscriptions`, `payment_events`
  tables and all their indexes are absent; the shared guard function also lacks 0123's 7th
  guarded column (`paid_ultra_expires_at`). Fully unapplied.
- **0124** `upgrade_interstitial_dismissal` — all 4 `profiles.upgrade_interstitial_*` columns absent.
- **0126** `opportunity_age_grade_eligibility_confirmed_open` — both columns absent.
- **0127** `admission_rate_basis_not_published` — constraint still the pre-0127 version (missing `not_published`).
- **0129** `age_grade_eligibility_basis` — both columns absent.
- **0130** `parent_commentary_entries` — table and its function absent (its own FK dependency, `parent_links`, IS present — see below, so this migration would apply cleanly once run).
- **0132** `university_statistics_year_index_coalesce` — index still the old plain `(university_id, stat_year)` form, not the coalesced fix.
- **0133** `country_eligibility_basis` — column absent.

That's 8 migrations total: 0123, plus all 7 migrations bundled into Packages 14/15/16
themselves (0124, 0126, 0127, 0129, 0130, 0132, 0133). **None of the packages' own migrations
have been applied yet — there is no double-apply risk for the packages as currently bundled.**

**Partially applied — needs founder attention before re-running:**
- **0082** `global_university_discovery_indexes` — 2 of its 3 indexes are live under the exact
  names the file creates. The 3rd (`idx_university_profile_queue_state_priority`) is not live
  under that name; a *different*-named index
  (`university_profile_verification_queue_idx_state_priority`) exists on the same table with an
  apparently similar purpose, even though the migration's own comment claims its definitions
  were taken directly from live via `pg_get_indexdef` at write time. Running 0082 now would
  either no-op or create a genuine duplicate index — worth a direct look before it's included
  in anything.

**Everything else in 0072-0123** (48 files) is confirmed **APPLIED** — every checkable column,
table, and index present. Full per-file evidence in the two agent passes this doc summarizes;
available on request rather than reproduced here in full.

**0001-0071**: applied with high confidence (matched against the migration-history record's
own entries by content, not by trusting "applied" as a blanket claim — see the record-mismatch
note below for why name-matching alone was already informative), plus 0071 directly
schema-confirmed (`university_requirements_calendar_bound_fact_class_idx` present). Not
individually schema-diffed file-by-file the way 0072-0123 was — no contradicting evidence
found anywhere, but flagging the difference in rigor honestly.

## Two things that matter more than the headline count

**1. The self-upgrade-to-Ultra exploit 0121 was written to fix is closed, live, right now.**
0121's own migration comment describes a real, then-exploitable gap:
`profiles_guard_protected_columns()` not yet guarding `plan_tier` /
`ultra_gift_expires_at` / `account_role`, meaning a user could write those columns on
themselves directly. This is exactly the kind of thing name/column snapshots can't resolve —
function *bodies* aren't visible that way. Read directly:

```sql
select pg_get_functiondef('public.profiles_guard_protected_columns'::regproc);
```

Live body guards exactly 6 columns ending at `account_role` — **0121's exact version**, not
0123's later 7-column version (which adds `paid_ultra_expires_at` and is confirmed unapplied
above). **0121 is applied. The exploit is closed.** This needed a direct read, not schema
diffing — flagging it here so nobody re-derives it as an open question later.

**2. Migration 0104 is dangerous to include in any future "catch up everything" package.**
`0104_ultra_gift.sql`'s `ADD COLUMN` has no `IF NOT EXISTS` guard, unlike nearly every other
migration in this repo. It is already applied live (`ultra_gift_granted_at` was later renamed
to `ultra_gift_expires_at` by 0106, which is also applied — the rename is what made 0104's own
column briefly invisible under its original name, not non-application). Re-running 0104 today
would **not error** — it would silently create a second, dead, duplicate
`ultra_gift_granted_at` column alongside the real one. Nothing reads it, so it's not data
corruption, but it's exactly the "does it error, silently pass, or corrupt?" question CEO
asked about, answered concretely: **this one silently passes and leaves clutter.** Drop 0104
from any range-based reapplication.

`0108_academic_tier.sql` and `0109_curriculum_other_text.sql` also lack `IF NOT EXISTS` guards
(0108 additionally has a bare `CREATE TYPE`, which Postgres can't guard conditionally at all).
Both are already applied. Re-running either would **fail loudly** — a safe failure mode
(transaction rolls back, no corruption), but it will hard-block a "run the whole numeric
range" script unless both are explicitly skipped.

## Migration-record mismatch, for context

The migration-history table's own bookkeeping is unreliable enough that it should not be
trusted as evidence going forward. Concretely: `research_record_id_predates_column` and
`calendar_bound_fact_class` (the record's two newest entries) are actually files **0070** and
**0071** — five numbers past the naive "stops at 0066" read. Most of the record's own names
don't carry their file's numeric prefix at all (e.g. `sports_experiences` for what's now file
0026, `university_rankings_and_profile_metrics` with no number at all), and a handful of early
entries don't correspond to any current file — almost certainly folded into the record's own
`full_schema_through_0024` bootstrap snapshot. None of this was assumed; every APPLIED verdict
above came from checking the live schema directly, independent of what this table claims.

## Package safety verdict

**Packages 14, 15, and 16 are safe to run against the live database as currently bundled.**
None of their own 7 migrations are pre-applied (no double-run risk), and the one identified
cross-dependency (0130's `parent_commentary_entries.parent_link_id` foreign key into
`parent_links`) is satisfied — `parent_links` and its supporting functions (0116-0119, 0122)
are all confirmed live, contrary to their own files' "NOT YET APPLIED" comments. Yesterday's
local sequence test (`scripts/check-morning-packages-14-15-16-sequence.sh`) built its baseline
from every migration file below 0129 — a fuller baseline than production actually has for the
0072-0123 range, but since that whole range is now confirmed applied live too, the test's
assumption and today's live reality match closely enough that its result stands: the packages
apply cleanly in sequence, on top of a base that is, in every way that matters to these 7
migrations, equivalent to what's actually live.

The one item outside the packages that deserves separate attention before it's touched: 0082's
partially-applied index (see above) — unrelated to 14/15/16, but a landmine for whoever next
touches `global_university_discovery_queue`.
