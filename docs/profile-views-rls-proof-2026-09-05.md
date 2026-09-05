# `profile_views` visibility guard — migration 0048 re-verified, proven, still not applied

CEO's own live check (2026-09-05): any signed-in account can insert a "profile viewed" row
against an arbitrary UUID — `profile_views`' `"record own view"` policy only ever checks
`viewer_id = auth.uid()`, never who is actually being viewed. The fix already existed:
migration `0048_profile_view_visibility_guard.sql`, written 2026-08-20
(`docs/handoffs/claude-b-2026-08-20-session.md`), never applied. Per instruction, this pass
is verification and proof, not a rewrite — the file's own SQL needed no changes.

## What was checked before trusting a 3-week-old migration

`0048` references `profiles.is_public`, `connections.status`/`requester_id`/`recipient_id`,
and `profile_views`' own columns. Grepped every later migration touching those names (0058,
0061, 0062, 0090, 0116) — all comment-only references confirming these columns are still
exactly what `0048` assumed; nothing renamed, restructured, or dropped. Confirmed live,
directly, rather than trusting the grep alone:

- All four referenced columns and the `profile_views` table exist, unchanged.
- `can_record_profile_view` does **not** exist live — the migration is genuinely unapplied.
- `pg_policies` shows the exact vulnerable policy CEO described:
  `"record own view"` / INSERT / `with_check: (viewer_id = auth.uid())` — nothing else.
- `profile_views` currently holds **exactly 1 row** (confirmed by count, not repeated from
  memory) — a real gap, not yet exploited by a real user.
- The real write path (`app/(app)/u/[id]/page.tsx:122` → `lib/social/profile-views.ts`'s
  `recordProfileView`) uses `createClient()` — the RLS-scoped session client, not admin — so
  this is a genuine, directly-reachable RLS gap, not a theoretical one behind a server-only call.
- Checked for a test that might have pinned the vulnerable behavior, per the day's own
  standing warning: `__tests__/social/profile-views.test.ts` covers self-view exclusion,
  duplicate-error handling, and 7d/30d aggregation — none of it touches the
  can-you-record-this-view check at all. Nothing to correct.

## Real Postgres proof

Same method as every proof today: a scratch local Postgres 17 cluster, minimal but
byte-for-byte faithful schema (`profiles`, `connections`, `profile_views` — exact column
shapes from `0014`/`0023`/`0036`), the real unmodified policy/function text, one continuous
transcript (`psql -1`, `ON_ERROR_ROLLBACK`).

**Phase 1 — RED.** Student A has a private profile. B, with zero relationship to A (no
accepted connection, A not public), inserts a `profile_views` row against A anyway — using
B's own session, the exact client the app itself uses. `INSERT 0 1` — succeeds. RLS did not
stop it, because nothing in the current policy asks whether B may view A at all.

**Phase 2 — apply `0048` verbatim** (the `can_record_profile_view` function plus the
replaced policy, copied unchanged from the file).

**Phase 3 — GREEN, three directions checked, not just the attack:**
- The identical attack against a fresh private profile now fails —
  `ERROR: new row violates row-level security policy for table "profile_views"`
  (SQLSTATE `42501`, confirmed directly before writing the test around it).
- A **genuinely public** profile can still be viewed by anyone, no relationship required —
  the ordinary, common case the fix must not break.
- A **genuinely private profile with an accepted connection** can still be viewed by that
  connection — the other legitimate case `can_record_profile_view`'s OR-clause exists for.

**Phase 4 — proving the proof can fail.** Reverted to the original, vulnerable policy and
reran the identical attack against a fresh profile: it succeeded again immediately, exactly
as it did in Phase 1 — confirming this is a real, live-sensitive check, not one that would
pass regardless of what policy is actually in effect.

**Phase 5 — restore, reconfirm clean.** Reapplied `0048`'s policy, reran the attack once
more: blocked again.

All five phases ran in one script with zero stray `ERROR` lines outside the two deliberate
ones (Phase 3's expected rejection, both caught and asserted; Phase 4's expected reopening,
which is a `NOTICE` confirming the attack succeeded, not an exception — that phase's whole
point is that it should re-succeed).

## Status

`0048`'s content is unchanged — confirmed correct as originally written, just re-verified
against the current live schema three weeks later and proven end-to-end. Added a short status
footer to the file itself recording this verification and pointing to this doc, per this
project's own convention for migrations re-checked long after being written. Still not
applied — this project's standing "write migrations, leave them unapplied" discipline; ready
for a deliberate apply pass whenever that's scheduled. No new migration number needed — no
new migration content, only confirmation of the existing one.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
