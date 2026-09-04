# Parent-account E2E — actually run, 2026-09-04

**C1 from `docs/PROXOLA-PLAN.md`, executed.** Migrations 0116 and 0118 confirmed applied
(checked directly — `parent_links` exists, `last_commentary_sent_at` exists, the guard trigger
and all four functions and all four RLS policies exist), then the full script from
`docs/parent-account-e2e-plan-2026-09-04.md` was run against the real database via SQL
impersonation inside always-rolled-back transactions — three separate transaction calls in
total (reasons below), every one ending in `rollback;`. Nothing below persisted; the final
section proves it.

## Result: every check passed

24 checks from the main script, plus B7 and B11 run in isolation (see "Two things this run
found," below, for why). All 26 in total.

| # | Check | Expected | Got | Pass |
|---|---|---|---|---|
| B2 | `opportunity_matches` direct read | 211 (doc baseline) | 211 | ✅ |
| B2 | `profile_scores` direct read | 9 (doc baseline) | 9 | ✅ |
| B2 | `profile_score_snapshots` direct read | readable | 3 | ✅ |
| B2 | `get_parent_child_profile` RPC | 9-column row | 9 keys, no `advisor_instructions` | ✅ |
| B2 | `get_parent_child_target_universities` | 3 (doc baseline) | 3 | ✅ |
| B2 | `get_parent_child_applications` | 0 (real, not revoked) | 0 | ✅ |
| B1 | `advisor_instructions` never in the RPC's columns | absent | confirmed absent, live | ✅ |
| B3 | `advisor_conversations`/`_messages`/`evidence_files`/`feedback_reports`/`weekly_actions`/`weekly_plans` | all 0 | all 0 | ✅ (6/6) |
| **C1/C3a** | parent revokes, smuggles `confirmed_at` + `last_commentary_sent_at` in the same UPDATE | both frozen | both frozen | ✅ |
| **C3b** | admin-equivalent write (no impersonation) to `last_commentary_sent_at` | 1 row, fresh value, not frozen | 1 row, fresh value | ✅ |
| B4/B5 | `get_parent_child_profile` on a revoked link | 0 rows | 0 rows | ✅ |
| B4/B5 | `opportunity_matches` direct read on revoked | 0 | 0 | ✅ |
| B8 | parent UPDATE on `target_universities` | 0 rows affected | 0 | ✅ |
| B8 | parent UPDATE on `profiles.display_name` | 0 rows affected | 0 | ✅ |
| **B7** | parent INSERT on `target_universities` | error or 0 rows | `42501` RLS violation | ✅ |
| B10 | `get_parent_child_profile(daniel)` under multi-child scoping | "Daniel Okafor" | "Daniel Okafor" | ✅ |
| B10 | `get_parent_child_profile(mei)` under multi-child scoping | "Mei Tanaka" | "Mei Tanaka" | ✅ |
| **B11** | duplicate `(parent_user_id, student_user_id)` insert | `23505` unique_violation | `23505` on `parent_links_parent_user_id_student_user_id_key` | ✅ |
| B12 | non-`student` `account_role` count | 0 | 0 | ✅ |

**The two checks this pass specifically added (C1/C3a, C3b) are the ones that matter most.**
The guard trigger — now named `parent_links_00_guard_immutable_columns`, not the name in the
original migration read (see below) — correctly freezes `confirmed_at` **and**
`last_commentary_sent_at` against the parent's own legitimate revoke, in the same UPDATE
statement, and does *not* freeze the same column when the caller carries no
`request.jwt.claims` at all (the admin client's actual shape). Both directions confirmed live,
not read from source.

## Final safety sweep — confirms the rollback held

Run after all three transactions completed:

```
parent_links rows for elif (expect 0):                0
daniel target_universities total (expect 3, baseline): 3
daniel display_name (expect "Daniel Okafor"):           Daniel Okafor
mei display_name (expect "Mei Tanaka"):                 Mei Tanaka
account_role non-student (expect 0):                    0
```

Nothing from any of the three transactions is in the live database. The `target_universities`
row with `status = 'exploring'` count came back as 2, not 0 — that's not a leak, it's two of
Daniel's three pre-existing rows already carrying that status; the total staying at exactly 3
(not 4) is the actual proof no row was added by B7's attempted insert.

## Two things this run found

**1. The trigger's real name isn't the one in the migration file.** `to_regclass` and a plain
`exists(... column_name = ...)` check both came back negative for
`parent_links_guard_immutable_columns` before this ran — reading like the guard was missing
entirely, which would have been a serious finding given the two most recent commits on `main`
at the time ("Make 0116 re-runnable," "Remove dead temp table from package 09 — it broke the
founder's run") pointed at exactly this migration having application trouble. A full
`pg_trigger`/`pg_policies`/`pg_proc` dump against `parent_links` showed the real name:
`parent_links_00_guard_immutable_columns` — a `00_` prefix, presumably added while making 0116
idempotent/re-runnable. Everything else (all 4 functions, all 4 policies) matched the original
names exactly. Worth knowing for whoever next greps this schema by name instead of dumping it.

**2. The plan script's own B7 check has a real design gap.** B7's comment already anticipated
an error ("expect 0 rows — error or empty, either is a pass") but nothing protected it with a
`savepoint`, unlike B11 further down. Run exactly as written, B7's `42501` aborts the whole
transaction — every check after it (B10, B11, B12) never executes, and the script produces no
result at all rather than a partial one. Confirmed by actually hitting it on the first full run
(pasted below is what the tool returned):

```
ERROR: 42501: new row violates row-level security policy for table "target_universities"
```

**Separately, unrelated to the script's own design:** the `execute_sql` tool returns only the
*last* statement's result when given a multi-statement batch — the many individual
`select ... as check` statements in the original script would have silently discarded every
row but the final one, not errored, which is a quieter failure mode than B7's. Worked around
by accumulating every check into a temp table (`create temporary table _results`, one insert
per check, one final `select ... from _results order by seq` as the transaction's last
statement) rather than by relying on the tool returning multiple result sets. Needed
`grant insert on _results to authenticated` immediately after creating it — a temp table
created under the connection's own role isn't automatically writable after `set local role
authenticated` switches into impersonation.

Neither issue affected the result — B7 and B11 were re-run as their own isolated
transactions once the first attempt showed the gap, and both came back exactly as the doc
predicted. But if this exact script is ever run again by pasting it as originally written
(one long batch, no temp table, no savepoint on B7), it will reproduce both problems. Worth
fixing in `docs/parent-account-e2e-plan-2026-09-04.md` itself the next time that file is
touched — not done here, since this file is the run record, not the plan.

## What this confirms about the feature

The parent-account feature's core security model — three whitelisted SECURITY DEFINER RPCs
each gated by `is_active_parent_of()`, direct row policies on exactly three tables
(`opportunity_matches`, `profile_scores`, `profile_score_snapshots`), the guard trigger
protecting provenance columns including the one added after the trigger was written, and
multi-child scoping — all behave, live, exactly as `supabase/migrations/0116_parent_accounts.sql`
and `0118`'s follow-up specify. This is the first time any of it has been exercised against
the real schema rather than read from source or tested against a fixture.

## What this run did not do

Did not touch a browser or a real session. Did not test 0117 (`parent_email_prompt_*`) —
still out of scope, structurally, per the original plan's own reasoning. Did not test P5's
weekly-commentary batch job itself (`lib/digest/parent-commentary.ts`) — not armed on any cron
yet, C3b only proves the column *can* be written by that job's connection shape, not that the
job runs correctly. Did not edit `docs/PROXOLA-PLAN.md` or `docs/parent-account-e2e-plan-2026-09-04.md`
— reporting the B7 gap here rather than fixing the plan doc directly, since it's shared and not
mine to edit unprompted.
