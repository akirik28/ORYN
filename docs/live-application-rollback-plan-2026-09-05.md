# Rollback plan for tomorrow's live application session — 2026-09-05

CEO's ask: every migration in tonight's queue was proven forward — the attack is blocked, the
legitimate path still works, a second pass is clean. Nobody asked "what happens if something
goes wrong halfway through." The founder is about to run roughly 30 separate operations against
the live database in one sitting — the 7 morning-package migrations, the 8 security migrations
(`0135`-`0142`), and ~22 prepared SQL fill files — plus two migrations not designed yet
(`0143` notifications, `0144` age/grade columns). This is the insurance document for that
session: for every operation, reversible / not reversible / conditional, and the condition
stated when it applies. Written and measured, nothing applied — no code changed, no live
database touched to produce this.

## The one recommendation that matters most

**Take a database snapshot or backup immediately before this session starts, before the first
statement runs.** Every trigger/function/grant migration below is cleanly reversible on its own
— but roughly a third of the ~22 prepared SQL fills **overwrite** a field that already held
real content (a description, a title, a URL), and none of them capture the prior value anywhere.
For that category, a pre-session snapshot is not a nice-to-have — it is the *only* way back.
Everything else in this document is real and worth reading, but this one step is what actually
insures the session; skipping it converts "conditional" into "not reversible" for every file in
§3's second group.

## Summary table

| Item | Reversible? | Rollback mechanism | Condition |
|---|---|---|---|
| `0135`-`0140` (guard triggers) | Yes, cleanly | `drop trigger` + `drop function` | none |
| `0141` (advisor_generation_locks) | Yes, but **don't** | re-`GRANT` + revert to `SECURITY INVOKER` | reopens a real vulnerability — see §2 |
| `0142` (birth_year_changes policy) | Yes, cleanly | `drop policy` | none |
| `0124` (upgrade interstitial columns) | Yes | `drop column` ×4 | loses accumulated dismiss-state (low stakes) |
| `0126`/`0129`/`0133` (eligibility basis/confirmed-open columns) | Yes | `drop column`/`drop constraint` | loses recorded research findings (moderate stakes) |
| `0127` (admission_rate_basis widening) | Conditional | narrow the CHECK back | **fails outright** if any row already holds `'not_published'` |
| `0130` (parent_commentary_entries) | Yes, but time-boxed | `drop function` + `drop table` | safe only before any real commentary is generated and read by a parent |
| `0132` (university_statistics index) | Yes, no data loss | `drop index` + recreate the old one | re-opens the exact duplicate-row bug 0132 closed |
| ~15 fill files: new-column research values | Yes | reset to the column's own default | loses real research work, not corrupts data |
| ~7 fill files: content overwrites (description/title/URL corrections) | **No**, not from the SQL alone | none — prior value was never captured | **needs the pre-session snapshot** |
| `waterloo-cemc-split-execute` (insert + retire) | Yes, cleanly | delete the 5 new rows by natural key, flip the retired row's status back | none — a positive example, see §3 |
| `0143`/`0144` | N/A | not yet designed | write this section when they exist, not now |

## 1. The 8 security migrations (`0135`-`0142`)

**`0135` (notifications), `0136` (target_universities), `0137` (evidence_status, 10 tables),
`0138` (messages), `0139` (connections), `0140` (recommendations)** — all six are the identical
shape: a trigger function that resets specific columns to `OLD` on a non-service-role UPDATE.
Rollback is exactly what every one of tonight's own proofs already did in their own
"restore and re-confirm" step:

```sql
drop trigger <name> on public.<table>;
drop function <function_name>();
```

Zero data loss either way — these guards never touch row content, only who may write specific
columns. Reverting simply restores the pre-migration permissive state (whatever gap the
migration closed reopens, nothing more, nothing less). The 17 trigger/function name pairs are
listed in each migration's own file for the exact names to use.

**`0141` (advisor_generation_locks) is a different class, and CEO is right to flag it
separately.** Its mechanism is `REVOKE INSERT, UPDATE, DELETE ... FROM authenticated` plus
switching both RPC functions from `SECURITY INVOKER` to `SECURITY DEFINER`. The rollback is
mechanically simple — `GRANT` the three privileges back, switch both functions back to
`SECURITY INVOKER` — but doing so **restores the exact bypass this migration closed**: a
student could once again delete and re-insert their own lock row directly, defeating the "one
concurrent generation" mutex and running two AI generations against one quota. This is not a
neutral rollback the way the six triggers above are. **If something breaks after `0141`
applies, the right response is almost always to diagnose and fix forward, not revert** — reverting
this one specific migration is choosing to reopen a known, already-proven vulnerability, and
that choice should be made deliberately by whoever is running the session, not executed
reflexively as "step 1 of the standard rollback playbook."

**`0142` (birth_year_changes select policy)** — `drop policy "select own birth year changes"
on public.birth_year_changes;`. Zero data loss (this is read-access only; no application code
ever wrote through this policy). Already proven re-runnable in the forward direction (the
sequence test found and this migration's own header now documents that it needed
`drop policy if exists` first — already fixed, not a live risk).

## 2. The 7 morning-package migrations

Every one of these adds a column (or, for `0127`/`0132`, alters an existing constraint/index)
on `opportunities`, `university_statistics`, or `profiles`. None of them delete or overwrite
existing rows by themselves — the risk in this group is entirely in **dropping a column removes
whatever real data has since been written to it**, not in the migration statement itself.

- **`0124` (upgrade_interstitial_dismissal)**: 4 new nullable/defaulted columns on `profiles`
  (`upgrade_interstitial_soft_dismissed_until`, `_not_now_at`, `_not_now_count`,
  `_dismissed_forever`). Rollback: `drop column` ×4. Loses whatever dismiss-state students have
  recorded since this applied — the practical cost is the full-screen interstitial might
  reappear for someone who already dismissed it. Low stakes, no cross-table references.

- **`0126` (age/grade `_confirmed_open` booleans)** and **`0129` (age/grade `_basis` text
  columns)**: both add columns to `opportunities` with `not null default false` /
  `default 'not_researched'`, plus (0126) two CHECK constraints. Rollback: `drop constraint` ×2
  (0126 only), then `drop column` ×2 each. Since the default is the honest "nothing has been
  researched yet" state, dropping these columns doesn't corrupt anything — but it silently
  erases every real research finding recorded since (`checked_not_stated`,
  `confirmed_no_restriction` values from the D2/D3 eligibility passes). That is real,
  hours-of-work research product, not just a flag — worth naming as a genuine cost, not a
  "safe, no big deal" rollback the way `0124` is.

- **`0127` (admission_rate_basis widening)** is the one migration in this group that is
  **conditionally, not unconditionally, reversible.** It only widens an existing CHECK
  constraint to also allow `'not_published'` — the column itself predates this migration
  (0119). Reverting means dropping the current (4-value) constraint and re-adding the old
  (3-value) one — and Postgres validates ALL existing rows against a new CHECK constraint at
  the moment it's added. **If any `university_statistics` row already holds
  `admission_rate_basis = 'not_published'` by the time a rollback is attempted, re-adding the
  narrower constraint fails outright** (a real, loud error, not silent corruption) until those
  specific rows are first reset to a value the old constraint accepts — which means erasing the
  exact research finding (NUS/Tsinghua/Peking-style "actively researched, deliberately
  withheld") this migration exists to record. **Condition: check
  `select count(*) from university_statistics where admission_rate_basis = 'not_published'`
  before attempting this specific rollback — zero rows means a clean revert, any other number
  means the narrower constraint cannot be restored without first deciding what to do with those
  rows.**

- **`0130` (parent_commentary_entries)**: a new table plus one `SECURITY DEFINER` read
  function. Rollback: `drop function get_parent_child_commentary`, `drop table
  parent_commentary_entries`. This one is genuinely time-sensitive in a way the others aren't:
  it is a completely clean rollback **only as long as no real commentary has been generated and
  shown to a parent yet.** The moment this feature is live and actually running (P5/B3b's batch
  job persisting real monthly narratives), dropping the table destroys content a parent may
  already have read and may expect to find again next month. Confirm this feature's own batch
  job hasn't fired for real before treating this as a no-cost rollback.

- **`0132` (university_statistics unique index, COALESCE-based)**: `drop index`, then recreate
  the plain `(university_id, stat_year)` index. This is the one rollback in this whole document
  that is genuinely **zero data loss either direction** — it only changes which index enforces
  uniqueness, and 0132's own header already confirms zero duplicate rows existed when it was
  written. The real cost of reverting is reopening the exact bug 0132 closed: 97.7% of
  `university_statistics` rows carry no real uniqueness guarantee once `stat_year` is null
  again, since Postgres never treats `NULL = NULL` as a match. A staged package could silently
  re-duplicate rows the same way one already did once before this migration existed. Safe to
  revert mechanically; **not free** in the same sense `0124` is.

- **`0133` (country_eligibility_basis)**: identical shape and identical rollback profile to
  `0129` — `drop column`, loses recorded D2 research findings, no constraint-widening risk like
  `0127`'s (this migration only ever adds the wider set of values from the start, nothing
  narrows later).

## 3. The ~22 prepared SQL fill files

All but one (`waterloo-cemc-split-execute-2026-09-04.sql`) are pure `UPDATE public.opportunities`
statements, no inserts. They split into two genuinely different risk shapes:

**Shape A — filling a brand-new column from its own known default** (the bulk of the D2/D3/
slice-a files: `d2-checked-not-stated-requires-0129...`, `d2-country-checked-not-stated-
requires-0133...`, `slice-a-requires-0126-0129-0133...` and its part-2/additions siblings,
`citizenship-restrictions-classification...`, `catalog-age-mismatch...`). These set
`age_eligibility_basis` / `grade_eligibility_basis` / `country_eligibility_basis` /
`*_confirmed_open` from their column's own well-known default (`'not_researched'` / `false`) to
a real researched value. Rollback: reset the specific rows back to that default — reversible
with zero ambiguity, since the "before" state is the column's own default, not something that
has to be separately remembered. The real cost is losing the research itself, same as `0129`/
`0133` above — hours of verified work, not corrupted data.

**Shape B — overwriting a field that already held real content**
(`opportunity-hub-description-fixes-2026-09-05.sql`, `d2-amc-aime-url-correction-2026-09-04.sql`,
`edinburgh-duplicate-row-parity-fix-2026-09-04.sql`, `opportunity-duplicate-consolidation-
2026-09-04.sql`, `opportunity-past-deadline-cycle-status-fix-2026-09-05.sql`,
`citizenship-restrictions-boilerplate-cleanup-2026-09-04.sql`, and any other file whose name says
"fix"/"correction"/"cleanup" rather than "fill"/"additions"). These set `description`, `title`,
`cycle_status`, or similar fields to a corrected value, targeted by `id`, with no prior-value
capture anywhere in the SQL itself. **This is the category with no rollback path from the fill
files alone.** The only way back to the pre-fill text is a database snapshot taken before the
session — see the headline recommendation above. Read each of these once before the session to
know which specific rows are at stake if a snapshot isn't taken; do not assume "fix"-named files
are lower-risk than they are just because the change looks small.

**The positive counter-example, worth citing by name: `waterloo-cemc-split-execute-2026-09-04.sql`.**
This file is genuinely, fully reversible, and shows what the safer shape looks like when it's
deliberately designed in: the five new rows are each protected by
`on conflict (normalized_title, coalesce(organization, '')) do nothing`, so they can be deleted
by their own natural key (`normalized_title` + organization) without ever needing to know the
`gen_random_uuid()` values that were actually generated; and the "retirement" of the old bundled
row is a `status = 'disabled'` UPDATE, never a delete — the original row and its full original
content still exist, so reverting is `set status = 'active' where id = '<the one named id>' and
status = 'disabled'`, restoring the exact pre-split state. No other fill file in this batch has
this property; it's named here as the pattern worth reusing for future data-changing files, not
just as a one-off.

## 4. `0143`/`0144` — not yet designed

CEO named these as coming ("0143 bildirim, 0144 yaş/sınıf sütunları") but neither exists as a
file yet. Nothing here can be said about their rollback shape without inventing it — this
section is a placeholder, to be written once each migration actually exists, not guessed at now.

## What this document is not

Not a set of ready-to-run rollback SQL scripts — CEO's own instruction was explicit
("kod yazma, canlıya dokunma"): this is the classification and the reasoning, so whoever is
running tomorrow's session knows, for each step, whether reverting is free, costly, conditional,
or actively unwise, and can make that call deliberately in the moment rather than discovering
the answer by trial and error half way through thirty live operations.
