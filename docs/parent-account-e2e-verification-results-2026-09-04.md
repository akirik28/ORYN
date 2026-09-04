# Parent-account E2E verification — results (C1, PROXOLA-PLAN.md)

**Run 2026-09-04, against the real live database (`qtcvcflzxbuagvvwahhu`), using the exact
technique and checks `docs/parent-account-e2e-plan-2026-09-04.md` already specified — nothing
redesigned, only the execution mechanics adjusted to fit the tool actually available (see
"Deviations from the plan doc" below).** Confirmed before running: both migrations the script
assumes (0116, 0118) are live — `parent_links`, all three `get_parent_child_*` RPCs,
`is_active_parent_of`, and the guard trigger (`parent_links_00_guard_immutable_columns`, a
`_00_`-prefixed name the plan doc's own reference and my first search both missed) all exist
and are enabled. Every check ran inside a transaction that always rolled back; verified
afterward that zero rows from any run persisted (`parent_links` count for the two test
accounts = 0, `profiles.display_name`/`updated_at` for the student subject unchanged from
before this session).

**Bottom line: 27 of 27 checks pass.** No gap found. The parent-account feature's core access
boundary — read exactly the allowed content, read nothing else, write nothing, ever — holds
under a real RLS/RPC/trigger evaluation against real data, not a fixture.

## Deviations from the plan doc — mechanics only, not the checks themselves

The plan doc was written assuming a SQL editor that shows every statement's result and lets a
transaction survive an individual statement erroring (real Postgres behavior under a normal
client). The MCP `execute_sql` tool used here behaves differently in two ways that needed
working around, discovered empirically while running this, not anticipated in advance:

1. **It aborts the whole call on the first error anywhere in the batch, even one a `SAVEPOINT`
   earlier in the same script would recover from in a normal client.** B7's parent-INSERT
   attempt and B11's duplicate-insert attempt are both *designed* to raise a real Postgres
   error as their pass condition — with this tool, either one aborted the entire batch and
   returned nothing, including the results of every check that ran cleanly before it. Fixed by
   moving both into a `DO $$ ... EXCEPTION WHEN ... END $$` block, which catches the error
   inside PL/pgSQL before it ever reaches the client.
2. **It returns only the last statement's result, not one per statement.** Fixed by having
   every check `INSERT` its own outcome into a temp table (`_e2e_log`, created and dropped
   with the transaction — nothing survives it) and reading the whole thing back with one final
   `SELECT ... ORDER BY seq` as the actual last statement.

Neither adjustment changed what any check tests or what counts as a pass — both are
documented here so the next session reaching for this same tool doesn't have to rediscover
either the hard way.

## A real gap in the plan doc's own discriminating power, found and closed before trusting the result

The `confirmed_at` half of C1/C3a set the "before" value via `confirmed_at = now()` at insert
time, then attempted to smuggle `confirmed_at = now()` again in the parent's own revoke
`UPDATE`. Postgres's `now()` is **transaction-stable** — every call inside one transaction
returns the same value — so a working freeze (value unchanged) and a broken one (update
succeeds, value set to `now()`) would have produced the **identical** result. The check would
have reported "PASS" either way; it wasn't actually testing anything for that one column.
(`last_commentary_sent_at`'s half of the same check was never affected by this — it went
NULL → attempted-non-null-smuggle → still NULL, which *is* a real, discriminating signal
regardless of `now()`'s stability.)

Closed with a small follow-up transaction: inserted the link with `confirmed_at` fixed to
`2020-01-01T00:00:00Z` (a value nothing else in the script could coincidentally produce),
attempted the same parent smuggle, confirmed it read back as still exactly `2020-01-01
00:00:00+00` after the update. Genuinely discriminating this time, genuinely passes.

## Results, in full (checks in the order the script runs them)

| # | Check | Result | Read |
|---|---|---|---|
| 1 | `opportunity_matches` for the linked student, active parent | 211 | matches the plan doc's own stated baseline for Daniel |
| 2 | `profile_scores` | 9 | matches baseline |
| 3 | `profile_score_snapshots` | 3 | non-zero, consistent with a real account |
| 4 | `get_parent_child_profile` returns exactly 1 row | "Daniel Okafor" | pass |
| 5 | `get_parent_child_target_universities` | 3 | matches baseline |
| 6 | `get_parent_child_applications` | 0 | matches baseline — this is the real "active parent, genuinely empty content table" case C2 needs, not synthetic |
| 7 | `profiles.advisor_instructions` exists as a raw column | yes | expected — it's on the base table, the leak test is #8 |
| 8 | **The actual leak test**: `get_parent_child_profile`'s real `RETURNS TABLE` column list, read from `information_schema`, not from source | 9 named columns (`display_name`, `graduation_year`, `curriculum`, `country`, `school_name`, `plan_tier`, `onboarding_completed`, `completeness_percent`, `profile_strength_score`) | `advisor_instructions` is not among them — confirmed against the live function signature, not a comment claiming it isn't |
| 9–14 | Six forbidden-content tables (`advisor_conversations`, `advisor_messages`, `evidence_files`, `feedback_reports`, `weekly_actions`, `weekly_plans`) for the linked student, active parent | all 0 | pass — a parent with a real active link sees zero rows across every one |
| 15 | `confirmed_at` / `last_commentary_sent_at` before the parent's own revoke | set / NULL | baseline |
| 16 | Same row, after a single `UPDATE` from the parent that sets `status='revoked'` **and** smuggles `confirmed_at=now()` **and** `last_commentary_sent_at=now()` in the same statement | `status=revoked`, both timestamps **unchanged** | both smuggled edits frozen in one shot — the trigger fix for migration 0118's later-added column holds |
| — | Follow-up, `confirmed_at` isolated with a non-`now()` baseline (see gap above) | stayed at `2020-01-01`, not `now()` | genuinely discriminating, still passes |
| 17 | The same column written through the **admin-equivalent connection** (no impersonation at all — the future commentary batch job's actual write shape) | succeeds, fresh value | confirms the guard that blocks the parent does **not** also block the legitimate service-role write |
| 18–19 | `get_parent_child_profile` / direct `opportunity_matches`, same student, now-revoked link | 0 rows both | the other half of the two-state seam: an active link with empty content (#6) returns 1 identity row; a revoked link returns 0 rows outright — genuinely different shapes, not the same screen |
| 20–21 | Parent `UPDATE` on `target_universities` / `profiles`, active link restored | 0 rows affected, both | pass |
| 22–23 | Parent `INSERT` on `target_universities` | raises `insufficient_privilege` (RLS denial), 0 rows land | pass — a real error, not a silent no-op, and confirmed nothing landed regardless |
| 24–25 | `get_parent_child_profile` for two different linked students under the same parent (Daniel, then Mei) | "Daniel Okafor" only / "Mei Tanaka" only | no cross-contamination between children |
| 26 | Duplicate `(parent_user_id, student_user_id)` insert | raises `23505 unique_violation` | constraint enforced |
| 27 | `profiles.account_role` values other than `'student'`, right now | 0 | the backfill assumption this feature was built on still holds tonight |

## What this did not do

Did not touch a browser, did not create or need any new fixture account (Daniel Okafor,
Elif Demir, Mei Tanaka all already existed with the right shapes), did not apply any migration
or change any RLS policy, did not verify P5's weekly-commentary batch runner itself (out of
scope — this confirms the *column it will write* isn't wrongly frozen, not the job, which
isn't armed on any cron yet) or P7's upgrade pop-ups (a UI concern, not a schema one).

## Next

Per PROXOLA-PLAN.md's C1 entry: closed. No follow-up SQL work identified. If a session picks
up B3 (parent account scope expansion) later, this result is the current, verified state of
the access boundary those new pages/queries need to keep holding.
