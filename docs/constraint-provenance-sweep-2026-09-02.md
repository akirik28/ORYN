# Every constraint, both directions — does the live database match what the migrations declare?

**Read-only. No constraint was added, dropped, or altered live to produce this.**
Prompted by a single finding in the account-deletion audit
(`docs/account-deletion-audit-2026-09-02.md`): `canonical_entity_merges.merged_by`'s
foreign key existed live with no migration ever having created it. oryn-3f's replay
audit compared tables, columns, triggers, policies and indexes and found three untraced
indexes — but constraints weren't in that comparison set, so it couldn't have found
this one. This sweep closes that gap: every foreign key, check, unique, and primary key
constraint on the live database, checked against the migration files in both directions.

## Method

1. Pulled the complete live constraint inventory from `pg_constraint` (all four types,
   `public` schema): 294 constraints — 124 foreign keys, 79 primary keys, 66 checks, 25
   unique constraints.
2. **Forward check** (live → migration): for each of the 294, searched the full
   concatenated migration text for a matching declaration — foreign keys by
   column-and-target-table (not by auto-generated name, which an inline `references`
   clause never states literally), checks by their distinctive literals or normalized
   condition text, uniques by column list, primary keys by confirming `primary key`
   appears within that table's own `create table` block.
3. **Reverse check** (migration → live): every `alter table ... add constraint` (15
   statements) and every `alter table ... add column ... references` (19 statements) —
   the two forms that add a constraint to an *already-existing* table rather than
   inline with `create table`, and therefore the only forms where "the migration ran
   but this one statement didn't" is structurally possible — checked against the live
   inventory. Deliberately did not exhaustively re-derive inline `create table`
   constraints in the reverse direction: those either land atomically with the table or
   the whole table is absent, which is the already-tracked ledger-vs-live category, not
   a new one.
4. Every automated "missing" flag was manually verified by reading the actual migration
   source before being treated as a finding — six check constraints were
   auto-flagged and all six were false positives (see below).

## Result: one gap total, and it's the one already found and fixed

**Forward direction: 294 of 294 live constraints trace to a real migration.** Zero new
untracked constraints beyond `canonical_entity_merges_merged_by_fkey`, which
`docs/account-deletion-audit-2026-09-02.md` already found and migration `0081` already
fixes. This was not a second finding waiting to be discovered — it was the one already
known, confirmed not to have siblings.

**Reverse direction: every `ALTER`-added constraint on a live table is present live.**
Checked all 15 explicit `add constraint` statements and all 19 inline
`add column ... references` statements. Every one targeting a table that exists live is
present live. The only absences found are fully explained by their entire containing
table (and therefore migration) being deliberately unapplied — `university_notification_log`
doesn't exist live at all, so its `_source_check` constraint from migration `0080`
correctly doesn't either; `message_reports.post_id` belongs to the switched-off social
feature (migration `0058`), same story. Neither is a partial-application gap; both are
the already-tracked "whole migration not applied" category, not a new one.

## The six false positives — worth documenting so the next sweep doesn't repeat the search

The automated first pass flagged six check constraints as "missing": `messages.body`,
`recommendations.body`, `profile_scores.score`, `profiles.headline`/`about` length, and
`university_profile_metrics`'s value-presence check. All six are live in the migration
files, verbatim. The mismatch is `pg_get_constraintdef()` normalizing the SQL on the way
out: the migrations write `check (char_length(body) between 1 and 4000)`, and Postgres
reports that back as `CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000)))`
— semantically identical, syntactically unrecognizable to a substring match written
against the migration's own `BETWEEN` phrasing. Confirmed by reading
`0027_messaging.sql:21`, `0035_recommendations.sql:11`, `0009_scoring.sql:10`, and
`0033_professional_profile_core.sql:16-17` directly. Any future automated pass over
`pg_get_constraintdef()` output needs to normalize `BETWEEN`/`IS NULL OR` phrasing before
comparing, or re-verify every "missing" check constraint by hand the way this pass did —
the false-positive rate on checks specifically was 100% of what got flagged.

## What this means for spec §58

`docs/account-deletion-audit-2026-09-02.md` concluded spec §58 (no cascading deletion of
global university/opportunity data) holds structurally, because zero foreign keys point
from any global table back to `profiles`/`auth.users`. That conclusion is only as strong
as the constraint set being what the migrations say it is — if constraints could appear
live without a tracked source, they could equally be *absent* live while a migration
claims one exists, which would make a `pg_constraint` snapshot an unreliable basis for
a safety argument either way. This sweep checked exactly that concern, comprehensively,
and found nothing to weaken it: the live constraint set and the migration-declared
constraint set agree, everywhere, except the one place already found and already fixed.
The §58 conclusion stands on a re-verified foundation, not just the original snapshot.

## No new migration

Nothing here needed one. The single gap this whole investigation started from was
`canonical_entity_merges_merged_by_fkey`, already fixed in migration `0081`
(`fix/account-deletion-partial-failure-2026-09-02`, merged). This sweep is the check that
confirms it was the only one, not a second source of fixes.
