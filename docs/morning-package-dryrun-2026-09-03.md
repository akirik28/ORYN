# Morning package dry-run — both files, end to end

2026-09-03, oryn-6e. CEO's brief: the assembled morning package had never been executed as a
whole — each source file was dry-run by its own lane, but the assembler's own additions (guards,
ordering, stripped transaction commands) were checked three indirect ways, never a real execution.
Begin, run, inspect, rollback, confirm nothing persisted — the same pattern used repeatedly
tonight, applied here to the two files the founder pastes into production on waking.

**Result: both files run clean end to end. Zero silent no-ops found anywhere I could check for
one. The ordering claim is confirmed correct on every case tested, including the file's own two
named examples. One real, reproducible bug found and fixed for reporting purposes only (not
touched in either source file): `01-migrations`' own trailing verification query cannot pass for
2 of its 13 rows regardless of success. One factual claim in `01-migrations`' header is already
stale: migration 0090 is not pending — it's live.**

## Method

Every statement in both files was run for real, inside `begin`/`rollback` transactions via the
Supabase connector (project `qtcvcflzxbuagvvwahhu`), with a verification query inserted before
each rollback and a fresh read-only check run afterward to confirm nothing persisted. `02`'s 377
statements were split across 3 transactions purely because of a practical size ceiling on a single
tool call — never because anything errored; each split point is noted below and every statement
ultimately ran. `01`'s 13 migrations fit in one single transaction.

Before running anything destructive-shaped, two cheap read-only pre-flight checks answered the
highest-value question first without needing an execution at all:

- Section 1's 190 organization-guard target ids, checked against live `organization` state.
- Migration 0090's target columns, checked against live `profiles` schema.

## `02-veri-doldurma-2026-09-03.sql` — 377 statements, 8 sections

### Does it run end to end — yes, confirmed section by section

| Sections | Statements | Result |
|---|---|---|
| 1 (org backfill, guarded) + 2 (2 official-URL fixes) + 3 (59 cycle-status) + 4 (UKMT, 3) | 254 | Ran clean, no errors |
| 1's 4-id subset (seeding) + 2 (repeat) + 3's Winchester line + 5 (84, bulk promotions) + 6 (4, description) + 7 (5, my own deadline work) | ~97 | Ran clean, no errors |
| 6 (4, repeat) + 8 (30, description rewrite) | 34 | Ran clean, no errors |

No SQL error surfaced anywhere across all three passes — every statement is syntactically valid
against the live schema and every referenced id exists.

### The question that mattered most: how many guarded UPDATEs silently no-op

**Zero, across every guarded statement checked — 224 of 224.**

- **Section 1's 190 organization guards** (`AND (organization IS NULL OR btrim(organization) = '')`):
  a read-only pre-flight check against all 190 target ids found **190 still empty, 0 already
  filled**. None of these would return `UPDATE 0`. Query used:
  ```sql
  select count(*) filter (where organization is null or btrim(organization)='') as still_empty,
         count(*) filter (where organization is not null and btrim(organization)<>'') as already_filled
  from opportunities where id in (<190 ids>);
  -- 190, 0
  ```
- **Section 6 + 8's 34 full-text description guards** — the exact failure shape CEO named ("the
  curly-quote guards bd hit twice"): ran all 34 `UPDATE ... WHERE id = ... AND description =
  $ogN$<exact old text>$ogN$` statements for real inside the transaction, then read back each
  row's resulting `description`. **All 34 now show the new (`$rwN$`) text — zero still show the
  old text**, meaning zero guard mismatches. This is the highest-risk category (a single wrong
  character — an em-dash, a curly vs. straight quote, different whitespace — silently zeroes the
  match) and it came back completely clean.

The remaining ~153 statements (sections 2, 3, 4, 5, 7) are unguarded `UPDATE ... WHERE id = '...'`
by primary key — these always affect exactly one row if the id exists, which every one does (no
id-existence check needed beyond confirming the SQL ran without error, which it did).

### The ordering claim — confirmed correct, 4 spot-checks including the file's own 2 examples

The file's own header claims: 75 records get two different `organization` values written by
different sections, and the later, individually-verified section always wins. Spot-checked as
asked, not exhaustively re-verified for all 75:

| Record | Section 1 wrote | Later section wrote | **Live result after full run** |
|---|---|---|---|
| BETA Camp / Prequel (`d70e5392`) — **the file's own cited example** | `'Prequel'` | Section 5: `'Prequel, Inc. (formerly "BETA Camp")'` + official_url | **Section 5's value** ✓ |
| Cambridge Future Scholars (`70519f22`) | `'...Ltd (independent company)'` | Section 5: `'...Ltd (private; not University of Cambridge)'` + official_url | **Section 5's value** ✓ |
| Acıbadem Lise Yaz Programları (`a4451907`) | `'...Sürekli Eğitim Merkezi (ASEGEM)'` | Section 5: `'Acıbadem Üniversitesi (ASEGEM)'` + official_url | **Section 5's value** ✓ |
| Winchester (`483c0af4`) — **the file's own flagged 3-way case** | Section 1: `'Discovery Summer (independent provider...)'` | Section 2: `'Winchester College'` → Section 3: `'Discovery Summer (NOT Winchester College...)'` | **Section 3's value** (the 2-of-3-independent-findings answer) ✓, official_url also correctly lands on Section 3's `discoverysummer.com/winchester/`, not Section 2's `winchestercollegesummerprogramme.com` |

All 4 confirm the design works exactly as the header describes. Winchester in particular is a
genuine 3-way write (Section 1 → 2 → 3), not the simple 2-way case the "75 records" framing
describes for the general population — the file's own header already flagged this row by id as
specially checked, and this run confirms that check was right.

### Live baseline matches the file's own stated numbers exactly

The file's own trailing verification query (its last 6 lines), run fresh right now, before any of
this dry-run's transactions:

```
394 kayıt · 172 kurum boş · 181 doğrulanmamış · 314 tarih boş
```

This is **byte-identical** to the file's own stated "Öncesi (2026-09-03 04:00)" baseline. Nothing
in `organization`/`cycle_status`/`deadline` on this population has drifted since the file was
assembled — its assumptions hold as of this moment. This is a point-in-time reading, not a
guarantee through whenever the founder actually runs it; the fleet is still active.

### New finding: Section 8's own record count doesn't match its own body

Section 8's header comment says "34 kayıt." The section's intro text separately says it "finishes
the remaining 31" (implying 35 total minus the 4 already done in Section 6). The section body
itself contains exactly **30** numbered items (1 through 30, confirmed by listing every `UPDATE`
in that section). None of the three numbers — 34 / 31 / 30 — agree with each other or with what's
actually there. This is a documentation-accuracy issue only: all 30 real statements execute
correctly (see the description-guard check above, which covered all 30 by id), so nothing is
functionally broken — but whoever next touches this file's comments should know the count is
wrong, since a future person recounting by header alone would come away with three different
numbers, none correct.

### Not re-litigated, already surfaced by the file itself

The file's own Section 2 sets Maastricht's `official_url` to
`maastrichtuniversity.nl/education/courses/summer-programme-european-studies` — a third distinct
URL for this record beyond the one I found in an earlier task tonight
(`maastrichtsummerschool.nl/courses/`) and oryn-d0's separate "disable, it's broken" verdict. The
package's own README already surfaces this exact three-way disagreement to the founder as a
reversible decision ("kapatmak mı, yoksa kaydı düzeltip programı katalogda tutmak mı? Bu senin
kararın") — not adding a fourth opinion here, just confirming this dry-run didn't uncover anything
that changes that framing.

## `01-migrations-2026-09-03.sql` — 13 migrations, one transaction

### Does it run end to end — yes

Ran the complete file (all 13 migrations, including every `CREATE TABLE`, `ALTER TABLE`, `CREATE
INDEX`, `CREATE POLICY`, `CREATE TRIGGER`, `CREATE VIEW`, and `COMMENT ON`) inside one
`begin`/`rollback` transaction. Zero errors. Confirmed `public.set_updated_at()` — the trigger
function three of the new tables depend on — already exists before running anything, so none of
the three `CREATE TRIGGER ... EXECUTE FUNCTION public.set_updated_at()` statements were at risk of
failing on a missing function.

**Risk assessment for why this was worth doing, not skipped:** Postgres DDL is transactionally
rollback-safe by design (unlike some other databases) — confirmed empirically here too, not just
asserted. Every `ALTER TABLE ... ADD COLUMN` in this file uses a constant default (`true`,
`false`, `0`, or none) rather than a computed one, so none of them risk the slow table-rewrite
that a non-constant default would force on a large table — these are all fast, metadata-only
changes. Confirmed post-rollback that all 10 new tables and both new `profiles`/`opportunities`
columns are gone again — clean.

### Real finding: migration 0090 is not pending — it's already live

The file's header states plainly: "0083-0089, 0091 ve 0092 UYGULANMIŞ... Aşağıdaki 13 tanesi
uygulanmamış" (0083-0089/0091/0092 applied, the following 13 are not). Checked before running
anything: **all 7 of migration 0090's `notify_*` columns already exist on live `profiles`**, with
exactly the types and defaults the migration specifies (`boolean not null default true`).

```sql
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name like 'notify_%';
-- all 7 present: boolean, NO, true
```

This isn't an execution risk — every column is added with `IF NOT EXISTS`, so re-running 0090
against the live database is a safe no-op (the 7 `ADD COLUMN`s skip cleanly; the 7 `COMMENT ON
COLUMN`s harmlessly re-apply identical text). But the founder should know only **12 of the 13**
listed migrations are actually new; 0090 has already landed, most likely from an earlier session
tonight, sometime after this file's own "0083-0089, 0091, 0092 applied" snapshot was taken and
before this dry-run. Migration 0093 and 0104, checked the same way, are genuinely still pending —
this drift is isolated to 0090, not systemic.

### Real finding: the file's own trailing verification query cannot pass for 2 of its 13 rows

The file's closing instruction says plainly: "Sonundaki doğrulamada 13 satır da 'uygulanmis = true'
dönmeli" (the closing verification should show all 13 rows as `uygulanmis = true`). As written,
that's structurally impossible for 2 of the 13, regardless of whether the migration succeeds.

The verification checks `information_schema.tables` for a table literally named
`notification_preferences` (for migration 0090) and `upgrade_prompt_dismissals` (for migration
0093) — but **neither migration creates a table by that name**. Both add columns directly onto the
existing `public.profiles` table (0090: 7 `notify_*` columns; 0093: 4 `upgrade_prompt_*` columns).
The verification query's own 13th row (added via `UNION ALL` for migration 0104) correctly checks
`information_schema.columns` for `profiles.ultra_gift_granted_at` instead — so the file's author
clearly knows the right technique, and simply didn't apply it to rows 1 and 2.

Reproduced live, not just reasoned about: ran the full migration set (all 13, in the same
transaction as above), then ran the file's own verification query exactly as written. Result:
**11 of 13 rows `true`, and precisely the 2 predicted rows (`notification_preferences`,
`upgrade_prompt_dismissals`) `false`** — on a run where every migration in the file actually
succeeded. A founder pattern-matching against "should all read true" would see 2 red rows on a
completely successful morning and have no way to tell, from the check alone, that nothing is
wrong.

**Corrected version**, checking columns instead of tables for rows 1-2 (not applied to the source
file — reporting only, per this task's scope):

```sql
select t.beklenen, coalesce((
  select count(*) > 0 from information_schema.columns ic
  where ic.table_schema = 'public' and ic.table_name = t.tbl and ic.column_name = t.col
), false) as uygulanmis
from (values
  ('notification_preferences (0090)', 'profiles', 'notify_deadline'),
  ('upgrade_prompt_dismissals (0093)', 'profiles', 'upgrade_prompt_soft_dismissed_until')
) as t(beklenen, tbl, col)
union all
select t.beklenen, coalesce((
  select count(*) > 0 from information_schema.tables it
  where it.table_schema = 'public' and it.table_name = t.beklenen
), false)
from (values
  ('admin_finance_settings'), ('job_controls'), ('quota_grants'), ('admin_action_log'),
  ('admin_actions'), ('job_budget_overrides'), ('ai_model_pricing'),
  ('admin_dead_feature_flags'), ('weekly_plan_budget_settings'), ('opportunity_verification_runs')
) as t(beklenen)
union all
select 'profiles.ultra_gift_granted_at (0104)', exists(
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'ultra_gift_granted_at'
)
order by uygulanmis, beklenen;
```

### No other issues found

The 5 tables deliberately created without `IF NOT EXISTS` (`job_controls`, `quota_grants`,
`job_budget_overrides`, `ai_model_pricing`, `admin_dead_feature_flags`) behave exactly as the
file's own comment describes — a second attempt against an already-applied state would fail loudly
rather than silently, by design. Not adversarially tested (didn't run the file twice to force that
failure), since a clean first run doesn't exercise that path and deliberately triggering a
mid-package failure felt like the wrong kind of "thorough" for a dry-run whose job is confirming
the intended path works. The design matches its own stated intent either way.

## What's not done, named rather than skipped

- **`03-firsat-kayit-duzeltmeleri-2026-09-03.sql`** (2 individual fixes) was not part of this
  brief and was not dry-run here.
- **Section 8's wrong record count and `01-migrations`' verification-query bug were not fixed in
  either source file** — reported only, per "measure first, nothing to live." Both are small,
  clearly-scoped fixes if the founder or CEO wants them made before the file is run for real.
- **The 71 remaining of the 75 dual-organization records were not individually spot-checked** —
  4 were, as asked, chosen to include the file's own two named examples (Prequel, Winchester) plus
  2 more independently picked from the list. The mechanism producing the correct result in all 4
  cases checked is the same simple last-statement-wins transaction ordering for every other pair,
  so this task treats the 4 as representative rather than re-deriving all 75.
- **Migration 0090's actual origin was not traced** — confirmed it's live and matches the file's
  intended shape exactly, not investigated further who applied it or when.

## Gates

Docs only — no source, schema, or the two package files themselves touched. `git status` confirms
this doc is the only change in this worktree. Every number above came from a live query against
project `qtcvcflzxbuagvvwahhu` today, 2026-09-03, with the query shown inline rather than only
asserted, and every transaction's rollback was independently confirmed via a fresh read-only query
afterward.
