# Migration 0130 — local Postgres RLS/function proof, 2026-09-04

Per the established recipe (`reference_psql_set_config_local_does_not_survive_psql_f` in the
session's own memory): `initdb`, the corrected `auth.uid()` JSONB-claims shim, the full
`GRANT`/default-privileges bootstrap, all 125 migrations (0001 through 0130) applied in order
against a clean cluster with zero errors, then a `psql -1 -v ON_ERROR_ROLLBACK=on` proof script
against real fixture data.

## A real bug found and fixed before this ever reached a real database

First version of `get_parent_child_commentary` gated on `is_active_parent_of(p_student)` alone
— the same pattern migration 0116's three existing functions use. That pattern is correct for
`profiles`/`target_universities`/`applications` because those tables have exactly one row per
**student**, regardless of how many parents are linked. `parent_commentary_entries` is
different: it's keyed per **relationship** (`parent_link_id`), so a student with two linked
parents has two independent entry series. Gating only on "is the caller an active parent of
this student" doesn't scope which relationship's rows the join returns — an active parent's
query pulled in a second, unrelated (in the test, revoked) parent's own entries too, purely
because both links pointed at the same student.

Fixed by scoping the join directly: `l.parent_user_id = auth.uid() and l.status = 'active'`,
inlining what `is_active_parent_of()` checks rather than calling it as a bare existence gate.
Caught locally, never touched a real database — the migration shipped with the fix already in
it, not as a follow-up.

## Six assertions, one clean run

| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Active parent reads their own linked student's commentary | 1 row | PASS |
| 2 | Unrelated parent (no link at all) queries the same student | 0 rows | PASS |
| 3 | Revoked parent (had a link, no longer active) queries the same student | 0 rows, even though their own entry row still physically exists | PASS |
| 4 | Direct `select * from parent_commentary_entries` as `authenticated` | 0 rows (RLS enabled, zero policies) | PASS |
| 5 | Function re-created with the original (unscoped) bug, re-run test 2's scenario | Now returns rows — the check can detect the exact class of bug it exists to catch | PASS |
| 6 | Real function restored, test 2's scenario re-run | Back to 0 rows | PASS |

Test 5 is the one that matters most, per this session's own standing discipline ("don't say a
check passed without proving it can go red"): a broken version of the function was installed
mid-script, specifically to confirm the assertion actually fails when the real bug shape is
present, not just that it happens to report PASS today.

## What this doesn't cover

The AI generation path itself (`resolveParentMonthlyCommentary`'s `ai` branch) — no
`ANTHROPIC_API_KEY` is configured in this environment, matching every other AI-touching file
in this codebase's own stated testing limits tonight. Only the storage/RLS/read-function layer
this migration adds was proven here; the content-generation logic itself is unchanged from
what B3b already shipped and is out of this migration's scope.
