# Does a parent account actually work, end to end — the verification plan

**Rewritten 2026-09-04, later the same night, against the real shipped schema — twice now.**
The original version of this doc (still below in spirit) was written before P1 existed,
against the spec's documented shape. All seven lanes have since merged — `supabase/migrations/
0116_parent_accounts.sql` is the real, final contract for the feature's core, read in full for
the first rewrite, not re-derived from the spec. Two migrations have since followed it: **0117**
(`profiles.parent_email_prompt_*`, four columns) is a student-side prompt-dismissal clock with
no RLS and no parent path — out of scope, and structurally so: `get_parent_child_profile`'s
explicit nine-column `SELECT` list can't widen to include a new `profiles` column by accident,
which is the whitelist design paying for itself. **0118** (`parent_links.last_commentary_sent_at`)
*is* in scope — a new column on the one table the guard trigger protects, added after that
trigger was written, which is exactly how C3 below found the trigger didn't know about it yet.
Two things the spec couldn't have predicted and the original plan didn't know to check: the
guard trigger itself (which freezes `confirmed_at` unless the caller is the student), and three
RPCs (`get_parent_child_profile`/`_target_universities`/`_applications`) taking an explicit
`p_student uuid` rather than three raw tables with a parent-read policy. **Still nothing run —
0116 is staged, not applied. The founder runs it by hand; nobody else does or asks him to.**

**This pass's job: close the gap between "0116 uygulandı" and a verified answer to minutes.**
Every check below is pre-written, ready to paste into one script the moment the migration
lands — not a checklist to design against once it does.

## What changed about the actual attack/verification surface

**Only three tables get a genuine row-level policy for the parent role**:
`opportunity_matches`, `profile_scores`, `profile_score_snapshots` — every column on them is a
foreign key, a system score, or a system reason code, none of it student-authored prose.
**`target_universities`, `applications`, and `profiles` get no table-level parent policy at
all** — RLS defaults to deny, so a raw `select` against them as a parent returns nothing
regardless of link status, not because access control worked, but because there's no policy
granting it either way. Real access to those three goes through **three SECURITY DEFINER
functions**, each gated by `is_active_parent_of(p_student)` in its own `WHERE` clause, each
returning a curated column list that structurally omits the free-text fields K1 forbids —
`advisor_instructions` (profiles), `notes` (target_universities, applications). This isn't a
weaker version of the row-policy approach; it's the one mechanism that can hide a column
column-by-column, which a row-level policy provably cannot (§5's own header spells this out —
Postgres RLS filters rows, not columns, and "parent" and "student" are the same `authenticated`
role).

`is_active_parent_of(p_student uuid)` is the single choke point every one of those three
functions and all three direct-table policies call — one place to test, per K2.

## The three checks this pass adds, because the original plan predates them

**The `confirmed_at` provenance guard.** `parent_links_guard_immutable_columns()` (the
before-update trigger) freezes `confirmed_at` to its old value on any `UPDATE` whose caller
isn't the student — including the parent's own legitimate revoke. `confirmed_at` is the record
of *when a guardian was granted access to a minor's data*; a parent's revoke silently also
rewriting it would be a metadata-integrity gap even though it has no bearing on
`is_active_parent_of()` (only `status` does). **C1 below tests this directly**: impersonate the
parent, revoke (a real, allowed write), and confirm `confirmed_at` didn't move even though the
same statement could have tried to touch it.

**The two-state seam.** A revoked parent and an active parent whose child's specific content
table is genuinely empty must not produce the same result. They don't, by construction —
`get_parent_child_profile` returns **zero rows** for anyone `is_active_parent_of()` rejects
(revoked, pending, no link), and **exactly one row** (the identity fields) for an active link,
*regardless* of whether the sibling content functions (`_target_universities`/`_applications`)
happen to return zero rows for that same student. The identity row's presence or absence is the
signal; content-table emptiness is not. **C2 below proves this on real rows**: the QA subject
already has 0 real `applications` — a genuine, live "active parent, empty content table" case
requiring no synthetic data — checked against a revoked link's all-zero result on the same
function.

**The same hole, reopened by the next migration, on a different column.** `parent_links_guard_immutable_columns`
freezes six named columns — `parent_user_id`, `student_user_id`, `invited_email`, `invited_at`,
`created_at`, and (conditionally) `confirmed_at`. Migration 0118 adds a seventh,
`last_commentary_sent_at` (P5's weekly-commentary window), *after* the trigger was written —
the trigger has no way to know about a column that didn't exist yet, so it doesn't freeze it,
and the identical smuggling shape C1 was written to catch is open again on the new column
unless the trigger is updated alongside it. **C3a below tests exactly that, in the same UPDATE
as C1** (one revoke attempt, two smuggled columns, both must freeze) **— and C3b tests the
other direction a freeze-everything fix could get wrong**: the not-yet-armed commentary batch
runner will need to write this same column legitimately, through the admin client (no
`request.jwt.claims`, `auth.uid()` reads `NULL`). A trigger guard broad enough to block the
parent must not also be broad enough to block that job — C3b confirms the legitimate write
still lands.

## The script — every check, ready to paste, nothing run yet

Test subjects, both real, already-existing accounts (not created for this, not touched by
it): **student** = "Daniel Okafor" (`026e9295-1a83-4192-b57a-326aa2807b45` — confirmed live:
3 target_universities, 211 opportunity_matches, 9 profile_scores, 3 advisor_conversations, 6
weekly_actions, 0 applications). **parent** = "Elif Demir" (`7722ebe9-55af-49e6-9722-8547b8ce33a7`,
otherwise unrelated to Daniel). Both are QA fixtures, neither is a real person's account.

`parent_user_id`/`student_user_id` are real foreign keys into `auth.users` — a synthetic UUID
would fail the constraint, so this reuses two real rows rather than fabricating either side;
only the `parent_links` row itself is synthetic, and it never survives the rollback.

```sql
-- ════════════════════════════════════════════════════════════════
-- PARENT-ACCOUNT E2E — run only after 0116 is applied. One
-- transaction, always rolled back at the end. Nothing here persists.
-- ════════════════════════════════════════════════════════════════
begin;

-- Three links to the same real student, one per status, so B4/B5/B2
-- all run against identical underlying data and only the link status
-- varies. savepoints wrap the two checks expected to raise a real
-- exception (B11's duplicate insert, B7-B9's writes don't raise --
-- RLS-blocked writes affect 0 rows silently, confirmed earlier
-- tonight) so one expected failure doesn't abort the whole script.

insert into public.parent_links (parent_user_id, student_user_id, status, confirmed_at)
values ('7722ebe9-55af-49e6-9722-8547b8ce33a7', '026e9295-1a83-4192-b57a-326aa2807b45', 'active', now());

-- ---------- B2: permitted content, active link ----------
set local role authenticated;
set local request.jwt.claims = '{"sub":"7722ebe9-55af-49e6-9722-8547b8ce33a7","role":"authenticated"}';

select 'B2 direct: opportunity_matches' as check, count(*) from public.opportunity_matches where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B2 direct: profile_scores' as check, count(*) from public.profile_scores where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B2 direct: profile_score_snapshots' as check, count(*) from public.profile_score_snapshots where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B2 rpc: get_parent_child_profile' as check, * from public.get_parent_child_profile('026e9295-1a83-4192-b57a-326aa2807b45');
select 'B2 rpc: get_parent_child_target_universities' as check, count(*) from public.get_parent_child_target_universities('026e9295-1a83-4192-b57a-326aa2807b45');
select 'B2 rpc: get_parent_child_applications (expect 0 -- real, not revoked)' as check, count(*) from public.get_parent_child_applications('026e9295-1a83-4192-b57a-326aa2807b45');

-- ---------- B1: advisor_instructions never leaks through the RPC ----------
-- (informational -- the function's own SELECT list already excludes the column; this
-- confirms it live rather than by reading source, per "a check that passes because
-- someone fixed it in advance is exactly as valuable as one that fails.")
select 'B1: get_parent_child_profile column list' as check, string_agg(column_name, ', ')
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'advisor_instructions';
-- Then eyeball the B2 rpc: get_parent_child_profile row above -- 9 named columns, no
-- advisor_instructions among them by construction (schema-checked, not filtered at runtime).

-- ---------- B3: forbidden content, active link -- must all be zero ----------
select 'B3: advisor_conversations' as check, count(*) from public.advisor_conversations where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B3: advisor_messages' as check, count(*) from public.advisor_messages am join public.advisor_conversations ac on ac.id = am.conversation_id where ac.user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B3: evidence_files' as check, count(*) from public.evidence_files where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B3: feedback_reports' as check, count(*) from public.feedback_reports where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B3: weekly_actions (deferred to P5, not built yet -- must still be 0)' as check, count(*) from public.weekly_actions wa join public.weekly_plans wp on wp.id = wa.plan_id where wp.user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'B3: weekly_plans' as check, count(*) from public.weekly_plans where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';

-- ---------- C1 + C3a: confirmed_at AND last_commentary_sent_at survive the parent's own revoke ----------
-- Combined into one UPDATE on purpose: a single malicious/buggy client write smuggling
-- edits to BOTH columns at once is the realistic shape of this attempt, not two separate
-- ones. last_commentary_sent_at (migration 0118) postdates the guard trigger's original
-- write -- confirm 44's fix (folding it into the same freeze) actually landed, not just
-- that confirmed_at alone still holds.
select 'C1/C3a before: confirmed_at, last_commentary_sent_at' as check, confirmed_at, last_commentary_sent_at from public.parent_links where parent_user_id = '7722ebe9-55af-49e6-9722-8547b8ce33a7' and student_user_id = '026e9295-1a83-4192-b57a-326aa2807b45';

update public.parent_links
set status = 'revoked', confirmed_at = now(), last_commentary_sent_at = now()  -- both smuggled edits the trigger must undo
where parent_user_id = '7722ebe9-55af-49e6-9722-8547b8ce33a7' and student_user_id = '026e9295-1a83-4192-b57a-326aa2807b45';

select 'C1/C3a after: status + both timestamps (expect revoked, BOTH unchanged)' as check, status, confirmed_at, last_commentary_sent_at
from public.parent_links where parent_user_id = '7722ebe9-55af-49e6-9722-8547b8ce33a7' and student_user_id = '026e9295-1a83-4192-b57a-326aa2807b45';

-- ---------- C3b: the same guard must NOT block the legitimate batch-job write ----------
-- A trigger that freezes everyone looks safe and isn't -- the future commentary batch
-- runner (lib/digest/parent-commentary.ts, not yet armed) writes this column through the
-- admin client, which carries no request.jwt.claims at all, so auth.uid() reads NULL --
-- reset role/claims below to leave impersonation entirely, the same connection shape a
-- real service-role write has, not a third identity invented for this check.
reset role;
reset request.jwt.claims;

with attempt as (
  update public.parent_links set last_commentary_sent_at = now()
  where parent_user_id = '7722ebe9-55af-49e6-9722-8547b8ce33a7' and student_user_id = '026e9295-1a83-4192-b57a-326aa2807b45'
  returning last_commentary_sent_at
)
select 'C3b: admin-equivalent write to last_commentary_sent_at (expect 1 row, a fresh timestamp -- NOT frozen)' as check, count(*), max(last_commentary_sent_at) from attempt;

-- ---------- B4/B5 + C2 (new): revoked link leaks nothing, incl. the two-state seam ----------
-- The link is now revoked (C1/C3a did it) -- reuse it rather than a fourth insert. Re-enter
-- parent impersonation first -- C3b's own check needed to leave it entirely (reset role
-- above), and it does not carry forward on its own.
set local role authenticated;
set local request.jwt.claims = '{"sub":"7722ebe9-55af-49e6-9722-8547b8ce33a7","role":"authenticated"}';

select 'B4/B5 rpc: get_parent_child_profile on revoked (expect 0 rows)' as check, count(*) from public.get_parent_child_profile('026e9295-1a83-4192-b57a-326aa2807b45');
select 'B4/B5 direct: opportunity_matches on revoked (expect 0)' as check, count(*) from public.opportunity_matches where user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
select 'C2: revoked profile-row count vs. earlier active-empty-applications count -- compare by eye against the B2 rpc rows above (1 row + 0 applications = active-empty; 0 rows here = revoked). Different shapes, not the same screen.' as check;

-- ---------- B7-B9: write denial, an active-link parent ----------
-- The parent's OWN update policy only ever allows moving status TOWARD 'revoked' (§2's
-- self-activation block, K3's whole point) -- setting it back to 'active' must run under
-- the unimpersonated connection, not the parent, or this UPDATE is itself RLS-denied and
-- every check below it would "pass" for the wrong reason (still-revoked, not correctly-
-- denied-while-active). Re-impersonate immediately after, for the actual checks.
reset role;
reset request.jwt.claims;
update public.parent_links set status = 'active' where parent_user_id = '7722ebe9-55af-49e6-9722-8547b8ce33a7' and student_user_id = '026e9295-1a83-4192-b57a-326aa2807b45';
set local role authenticated;
set local request.jwt.claims = '{"sub":"7722ebe9-55af-49e6-9722-8547b8ce33a7","role":"authenticated"}';

with attempt as (
  update public.target_universities set status = 'applying' where user_id = '026e9295-1a83-4192-b57a-326aa2807b45' returning id
)
select 'B8: parent UPDATE on target_universities (expect 0 rows affected)' as check, count(*) from attempt;

with attempt as (
  update public.profiles set display_name = 'tampered' where id = '026e9295-1a83-4192-b57a-326aa2807b45' returning id
)
select 'B8: parent UPDATE on profiles (expect 0 rows affected)' as check, count(*) from attempt;

with attempt as (
  insert into public.target_universities (user_id, university_id, status) select '026e9295-1a83-4192-b57a-326aa2807b45', id, 'exploring' from public.universities limit 1 returning id
)
select 'B7: parent INSERT on target_universities (expect 0 rows -- error or empty, either is a pass)' as check, count(*) from attempt;

-- ---------- B10: multi-child scoping (a real second student, Mei Tanaka) ----------
reset role;
reset request.jwt.claims;
insert into public.parent_links (parent_user_id, student_user_id, status, confirmed_at)
values ('7722ebe9-55af-49e6-9722-8547b8ce33a7', '96f3274c-f486-4b96-b28d-97d8be50bc3b', 'active', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"7722ebe9-55af-49e6-9722-8547b8ce33a7","role":"authenticated"}';
select 'B10: get_parent_child_profile(daniel) still returns only daniel, never mei''s row mixed in' as check, display_name from public.get_parent_child_profile('026e9295-1a83-4192-b57a-326aa2807b45');
select 'B10: get_parent_child_profile(mei)' as check, display_name from public.get_parent_child_profile('96f3274c-f486-4b96-b28d-97d8be50bc3b');

-- ---------- B11: unique constraint ----------
reset role;
reset request.jwt.claims;
savepoint before_dup;
insert into public.parent_links (parent_user_id, student_user_id, status) values ('7722ebe9-55af-49e6-9722-8547b8ce33a7', '026e9295-1a83-4192-b57a-326aa2807b45', 'pending');
-- expect: ERROR 23505 unique_violation. If this SELECT is reached instead, the constraint is missing.
select 'B11 FAILED -- duplicate insert should have raised 23505' as check;
rollback to savepoint before_dup;

-- ---------- B12: backfill ----------
select 'B12: non-student account_role count (expect 0 tonight)' as check, count(*) from public.profiles where account_role is distinct from 'student';

rollback;  -- always. nothing above this line survives.
```

**On running it**: paste as one script into the Supabase SQL editor (or `execute_sql`) — every
`select ... as check` row is self-labeled, so the output reads top-to-bottom as a report. The
B11 block is expected to error with `23505`; if the script instead reaches the "B11 FAILED"
line, that's the actual finding, not a script bug. Everything else should produce a clean row
per check, expected values noted in each label.

**This script assumes both 0116 and 0118 are applied.** They may not land in the same sitting —
if only 0116 has landed, the C3a/C3b block (the two `last_commentary_sent_at` references)
will error on an undefined column and abort the transaction before B4/B5-B12 ever run. If
0118 isn't in yet, comment out or delete the C3a/C3b block first (and drop
`last_commentary_sent_at` from C1/C3a's combined `UPDATE`, restoring it to a plain
`confirmed_at`-only smuggle attempt) — the rest of the script is unaffected either way.

## What this pass needs beyond a green light: nothing

The script above is complete and self-contained. It doesn't touch a payment provider, doesn't
need a browser or a signed-in session (the whole point of the impersonation method), doesn't
need new fixture accounts (Daniel/Elif/Mei all already exist with the right shapes), and
doesn't need `account_role` set on either test account first — confirmed by reading the
migration directly that none of its policies or functions reference `account_role` at all; it's
a label (§1's own comment says so), not part of the access-control mechanism `is_active_parent_of`
implements. The gap between "0116 uygulandı" and a read report is exactly as long as it takes
to paste this script and read the output.

## What this pass did not do

Did not run any of the above — 0116 is not applied, checked directly immediately before writing
this. Did not apply the migration or ask anyone to. Did not touch a browser. Did not write a
seed script beyond what's embedded in the transaction above, since none is needed. Did not
verify P5's weekly-plan/digest surface (not built yet, explicitly deferred per the migration's
own §6) or P7's upgrade pop-ups (a UI concern, not a schema one) — out of this plan's scope,
named so nobody assumes silence means checked.

---

## Original plan (2026-09-04, earlier the same night) — superseded above, kept for the reasoning

The rest of this document is the original, pre-P1 version. Its verification *method* (SQL
impersonation inside a transaction that always rolls back) is unchanged and still the
mechanism the rewrite above uses — only the specific checks needed updating once the real
schema landed. Kept rather than deleted so the earlier reasoning (why `/design-preview` fails
this class of check, the proof the impersonation method works) stays attached to its own
context.

Seven lanes (P1–P7) are building one feature against an unmerged schema. Every branch will be
green in isolation — that proves each lane did what it claims, not that the assembled feature
does what G1 ("asla ama asla") and K2 (enforced in the database, not the interface) actually
require. **This is the design. Nothing below has been run — P1 isn't merged yet.** Run this as
branches land, in the order §5 gives.

### The actual problem

Two tools this fleet already reaches for both fail this specific job:

**`/design-preview/*` is fixture-only.** Confirmed directly on the rename-DB-render-check
(`docs/rename-db-render-check-2026-09-04.md`) and true here for a sharper reason: this
feature's entire risk surface is *whether the real RLS policy blocks a real cross-account
write*. A fixture has no RLS to violate — it would pass every check by construction and prove
nothing.

**A real logged-in browser view is out.** The shared browser pane holds the founder's live
session; a genuine login-and-click-through — the obvious way to "just check it works" — is
exactly the action the render-check task was warned off of, for the same reason.

So the actual problem isn't "run some checks" — it's **how do you prove a parent sees a real
child's real rows, and provably cannot write to them, without a real login and without a
fixture that can't fail?**

### The technique — proven today, not proposed

Postgres RLS keys off `auth.uid()`, which reads `request.jwt.claims`. A privileged SQL
connection can set that claim for itself, inside a transaction, run exactly the query a real
authenticated client would run, observe the real result, and **roll back before anything
commits.** No session, no cookie, no browser — and it isn't a workaround of RLS, it's RLS
running for real against a claim the query sets on purpose, then discarded.

Proved this against `profiles`' own live policies before writing this plan, not after:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<a real profile id>","role":"authenticated"}';
select count(*) from public.profiles;              -- unfiltered scan
rollback;
```

**Result: 1.** The real table has far more than one row; RLS narrowed an unfiltered scan down
to exactly the impersonated user's own row, live, today. A second proof, same session: an
`UPDATE` targeting a *different* user's row while impersonating the first returned **0 rows
affected** — no error, RLS simply made the row invisible to match against. That's the
observable signal write-denial actually produces: not an exception to catch, a row count to
check for zero. Both transactions rolled back; nothing in the live database changed.

This is the plan's method throughout: impersonate a specific `(parent_user_id)`, attempt the
real operation against the real schema, check the real result, roll back always. It's also a
strictly *harder* test than a click-through would be — a hidden button proves the UI didn't
offer the write; this proves the write is impossible regardless of what any future UI offers.

### A structural risk that was flagged before P1 landed, and got fixed independently

**RLS is row-level, not column-level.** Named here before P1 merged: a policy granting a
parent `SELECT` on a linked student's `profiles` row would grant the whole row, including
`advisor_instructions`, unless P1 specifically projected it out. **44 never wrote that policy
at all** — the real migration routes profile reads through `get_parent_child_profile()`, a
curated function whose own SELECT list is the whitelist. The risk was real and the fix
predates this doc catching up to it; see the rewrite above for the confirmed, current shape.
