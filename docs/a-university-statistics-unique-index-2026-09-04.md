# A7 (working label) — university_statistics's unique index never actually fires

CEO's assignment, in the exact sequence given: measure first, only write the migration if
clean, prove red-to-green, never touch existing duplicate rows without bringing the number
back first.

## 1. Measure — does the index actually fire today?

```sql
select count(*) as total_rows,
       count(*) filter (where stat_year is not null) as with_stat_year,
       count(*) filter (where stat_year is null) as without_stat_year
from university_statistics;
```
→ **133 rows total, 3 with `stat_year` set, 130 (97.7%) without.** (CEO's own cited number was
128/2 — close but not identical, likely from an earlier check the same night; the underlying
finding — near-total absence of `stat_year` — is unchanged either way, reported as measured
just now rather than matched to the earlier number.)

The live index is `UNIQUE (university_id, stat_year)`. Postgres never treats `NULL = NULL` as
true, so this index cannot fire on any of the 130 rows missing `stat_year` — those rows have
carried no real uniqueness guarantee at all.

## 2. Measure — do duplicates already exist?

```sql
select university_id, count(*) from university_statistics
group by university_id having count(*) > 1;
```
→ **Zero rows returned.** No duplicates exist on the live table right now, confirmed directly,
not assumed. Per CEO's own branching: clean, so proceed to the migration. (The five-row
duplication CEO referenced was a package re-run hitting this same defect — already resolved
before this check, not evidence of a currently-broken table.)

## 3. The fix

`supabase/migrations/0132_university_statistics_year_index_coalesce.sql` — same pattern
migration 0056 already used for `university_requirements_university_type_scope_title_idx`:
wrap the nullable column in `COALESCE` so every row participates in the uniqueness check.

```sql
drop index if exists university_statistics_university_year_idx;

create unique index if not exists university_statistics_university_year_idx
  on university_statistics (university_id, coalesce(stat_year, -1));
```

`-1` is never a real academic year and is never written to the column by any application code
— it exists only inside the index's own key expression. Reversible and re-runnable by
construction: no data is read, written, or deleted; `IF EXISTS`/`IF NOT EXISTS` make a second
run a no-op, and rolling back is the mirror-image drop/recreate with zero data-loss risk.

**Dry-run verified against the live schema, in a rolled-back transaction** (per the standing
no-live-writes rule) — applied cleanly (no violation, matching the 0-duplicates measurement
above), the resulting index definition confirmed exactly as intended, then confirmed the
rollback actually reverted it (re-checked `pg_indexes` afterward — the live index is
unmodified, still the original `(university_id, stat_year)`).

## 4. Proven red-to-green, on a local Postgres cluster, not asserted

Built a minimal local reproduction of the real table (same relevant columns, no RLS/auth
scaffolding needed — this is a plain unique-index test, not a policy test).

**RED — the current bug, reproduced exactly**: under the live index, inserted two rows for the
same `university_id`, neither with `stat_year` set (the real-world shape — 130 of 133 live rows
look like this). **Both inserted successfully.**
```
label                                        | row_count_for_this_university
RED: duplicate rows under the current index  | 2
```

**Bonus confirmation of CEO's own stated risk**: attempted to apply the new coalesced index
directly on top of that already-duplicated table — `CREATE UNIQUE INDEX` failed immediately:
```
ERROR: could not create unique index "university_statistics_university_year_idx"
DETAIL: Key (university_id, COALESCE(stat_year, '-1'))=(..., -1) is duplicated.
```
Directly confirms why "measure duplicates first" isn't optional — exactly what step 2 above
was checking for, now independently corroborated rather than only reasoned about.

**GREEN — the fix, on clean data**: fresh table, new index applied, three legitimate rows
inserted (a null-`stat_year` row, a different university's null-`stat_year` row, and a real
second year for the first university) — all three succeed, proving the fix doesn't over-widen
the constraint. Then a genuine duplicate attempt (same university, still no `stat_year`) —
**rejected**, exact right reason:
```
ERROR: duplicate key value violates unique constraint "university_statistics_university_year_idx"
DETAIL: Key (university_id, COALESCE(stat_year, '-1'))=(..., -1) already exists.
```

## What was not done

No cleanup of existing data — none was needed (step 2 measured zero duplicates). No change to
any `.ts`/`.tsx` file — grepped the repo for the index's own name, nothing references it by
string; `tsc --noEmit` unaffected. No `types/database.ts` regeneration — index definitions
aren't represented in generated Supabase types, and that file is hand-authored per standing
convention regardless.
