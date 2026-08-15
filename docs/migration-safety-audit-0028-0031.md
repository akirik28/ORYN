# Migration Safety Audit — 0028 through 0031

Static audit only. No migration was applied, and no past migration file was edited —
this environment has no `SUPABASE_SECRET_KEY` / SQL editor access, and even with it,
editing an already-committed migration is against this project's own convention (fixes
land as a new numbered migration, e.g. `0017_fix_missing_score_rls.sql` fixing `0009`,
never a rewrite of the original file).

Scope: `0028_program_requirement_dedup_indexes.sql`, `0029_story_notes.sql`,
`0030_moderation.sql`, `0031_messages_realtime.sql`. All four are still unapplied to the
live dev database as of this pass (`activities.story_notes` and `message_reports.status`
both re-confirmed missing via a live read-only probe; `supabase_realtime` publication
membership isn't observable via the anon key/PostgREST).

## Summary

| # | Destructive? | Idempotent (safe to re-run)? | Data rewrite? | RLS change | New naming conflicts |
|---|---|---|---|---|---|
| 0028 | No | **Yes** (`if not exists` on both indexes) | No | None | None found |
| 0029 | No | No (`add column` with no guard) | No | None (existing per-row policies already cover new columns) | None found |
| 0030 | No | No (`add column`/`create type`/`create index`/`create policy`, no guards) | No (constant `default` on a `not null` column is a metadata-only op since PG11) | Additive only — one new `select` policy | None found |
| 0031 | No | No (`alter publication ... add table` errors if already a member) | No | None — publication membership ≠ RLS; RLS still gates every row Realtime can ever deliver | None found (first migration to touch `supabase_realtime`) |

**Net: nothing in this range is destructive, and nothing rewrites existing data.** The
only real finding is one privacy-shaped RLS gap in 0030, detailed below — already carried
into the security-regression pass as its own tracked fix, not left as a doc-only note.

## Order and dependencies

- 0028 → `university_programs`/`university_requirements` (created ~0006/0007). Correct
  order, no forward reference.
- 0029 → the 7 target tables (`activities` 0004, `sports_experiences` 0026). Correct
  order.
- 0030 → `message_reports`, `profiles` (both 0027/0002). Correct order.
- 0031 → `messages` (0027) and the `supabase_realtime` publication. The publication
  itself is **not created by any migration in this repo** — Supabase provisions it by
  default on every hosted project (confirmed against current Supabase Realtime docs:
  `alter publication supabase_realtime add table ...` is the documented, recommended way
  to enable Postgres Changes, phrased as adding to an existing publication, not creating
  one). This project only ever runs against a linked hosted project (no local Supabase
  CLI setup — `docs/qa-environment-readiness-audit.md` §3), so this holds. It would need
  re-checking if this repo ever adds a local `supabase start` workflow.
- 0030 and 0031 don't depend on each other and could apply in either order; sequential
  numbering is arbitrary-but-consistent, not load-bearing.

## Existing-data safety

- **0028's uniqueness assumption is time-sensitive.** The migration's own comment states
  it's safe because `docs/data-readiness.md`'s live audit (2026-08-15) found both tables
  at 0 rows. That was true *then*. Writes to these tables are service-role-only (migration
  0014), and `external_sync_jobs` sitting at 0 rows-ever means the ingestion pipeline has
  never run — so nothing should have written to them since. But "should have" isn't
  "has": anyone with SQL editor access could have inserted rows manually in the interim.
  **Recommend re-running a duplicate check immediately before applying 0028**, not just
  trusting the migration's own comment:
  ```sql
  select university_id, lower(name), count(*) from public.university_programs
    group by 1, 2 having count(*) > 1;
  select program_id, requirement_type, count(*) from public.university_requirements
    where program_id is not null group by 1, 2 having count(*) > 1;
  ```
  Both must return zero rows or the `create unique index` step fails outright (safe
  failure — the migration transaction rolls back, nothing corrupts — but worth avoiding).
- **0029**: `add column ... text`, nullable, no default. Metadata-only in Postgres, no
  table rewrite, no existing-row risk regardless of table size.
- **0030**: `add column status ... not null default 'open'` — a constant default on a new
  `not null` column has been a fast, metadata-only operation since Postgres 11 (no
  rewrite, no long lock). Existing `message_reports` rows (if any exist from manual QA
  inserts) retroactively get `status = 'open'`, which is the correct behavior — a report
  filed before this migration existed should still enter the review queue as open, not be
  silently excluded. `reviewed_by`/`reviewed_at`/`resolution_note` are nullable, no risk.
- **0031**: publication membership is metadata only; touches zero rows.

## Duplicate-apply behavior

Only 0028 is idempotent (the one migration in this range that opted into
`if not exists`, for the specific reason stated in its own header comment). 0029, 0030,
and 0031 all lack re-run guards:

- 0029: re-running raises `column "story_notes" of relation "activities" already exists`
  and the whole file's transaction aborts (nothing partially applies — Postgres DDL in a
  transaction is all-or-nothing).
- 0030: `create type ... as enum` has no `if not exists` form in Postgres at all (not a
  gap specific to this migration — 0012/0023/0026's enum-creating migrations have the
  same property; this is this codebase's existing convention, not a new risk). A re-run
  fails at that line before reaching anything else.
- 0031: re-adding an already-member table raises `relation "messages" is already member
  of publication "supabase_realtime"`.

None of this is a defect — it's how the vast majority of this repo's own migrations are
already written (0028 is the outlier, not the norm), and it's a non-issue under normal
Supabase CLI / migration-history-tracked application (each file runs exactly once,
recorded). The only way to actually hit this is applying the same file's SQL a second
time by hand in the SQL editor, outside the tracked flow — worth a caution, not a fix,
and **not a reason to retroactively edit any of these files**.

## RLS impact

- 0028, 0031: none. Index and publication changes don't touch row-visibility rules at
  all.
- 0029: none needed. RLS in Postgres is row-level, not column-level — the 7 tables'
  existing owner-scoped policies (`using (user_id = auth.uid())`, from their original
  creating migrations) already cover `story_notes` automatically; a row that passes the
  policy exposes every column on it, old or newly added.
- 0030: **one finding.** The new `select own filed reports` policy is row-level only, so
  a reporter reading their own `message_reports` row back (e.g. through the export route
  wired up in commit `99c89a8`) also sees `reviewed_by` (an admin's raw profile id) and
  `resolution_note` — a field the admin UI's own placeholder copy calls "internal only."
  Nothing in 0030 restricts this by column. This doesn't require editing the migration
  (the policy is still correct — a reporter *should* be able to read their own filed
  report's reason/status/timestamps back); it means the **consumer** of that policy
  should not select columns it has no reason to expose. Tracked and fixed in the
  security-regression pass as its own change (export now selects an explicit safe column
  list for `message_reports` instead of `*`), not left as a doc-only note.

## Index / publication conflicts

Checked every new index/policy/publication name in 0028–0031 against the full migration
history: `university_programs_university_name_idx`, `university_requirements_program_type_idx`,
`message_reports_status_idx`, the `select own filed reports` policy name, and `messages`'
publication membership each appear exactly once across all 31 migration files — no prior
migration defines, reuses, or collides with any of them. `0027` (the migration that
creates `message_reports`) has exactly one policy on that table before 0030
(`create own report`, insert-only) — 0030 adds a second, distinct policy rather than
redefining or shadowing it.

## Recommended apply order (unchanged from the standing FOUNDER_BLOCKED_BACKLOG item)

1. Re-run the duplicate-check queries above, then `0028`.
2. `0029`.
3. `0030`.
4. `0031`.
5. Then `seed_drive_batch1.sql` (unrelated to this range, already staged per
   `docs/data-readiness.md`).

Each of 0029–0031 is independent of the others in terms of correctness (none will fail
because a *different* one of these four wasn't applied first) — the order above is for
consistency with the numbering, not a hard requirement.
