# Account deletion — does it actually work, end to end?

**Read-only audit. No account was created or deleted to produce this — every finding
below comes from reading `deleteMyAccount()` and `removeAllUserStorage()` in full,
querying the live `oryn-qa-scratch` schema (`pg_constraint`, `pg_trigger`,
`information_schema`), reading the Supabase SDK source that the code calls into, and one
direct, read-only HTTP call to the Storage API's list endpoint — never a write, never a
specific user's data, never anything resembling an account operation.**

## Headline: it works. One real, narrow gap in the failure path; one previously
## undocumented, currently-dormant edge case.

## 1. Does it delete what it claims?

**Database: yes, 42 of 43 user-owned tables fully cascade.** Queried
`pg_constraint` directly for every foreign key targeting `profiles(id)` — not the
migration files, not a prior document's count, the live schema today. 43 distinct
tables reference `profiles(id)`; 42 are `ON DELETE CASCADE`. The one exception is the
same one already known and documented: `ai_usage.user_id` is `ON DELETE SET NULL`
(migration `0013_ops.sql`), so an `ai_usage` row survives as an anonymized record — no
`user_id`, no prompt content, only `feature`/`provider`/`model`/token counts/cost. This
is recorded as an open question in `LAWYER_FLAGS.aiUsageAnonymization`
(`lib/legal/content.ts`), not silently accepted. Nothing new here — re-verified, not
re-discovered.

A second column, `message_reports.reviewed_by`, is also `SET NULL` — but that is
correctly not "the student's own data": it is the reviewing admin's attribution on a
report, and losing that link when the admin's account is deleted is the right behavior
(same conclusion `DATA_RIGHTS_AUDIT.md` already reached). `message_reports`' own two
student-facing columns (`reporter_id`, `reported_user_id`) both cascade normally.

Cross-checked the table list against every `user_id`/`viewer_id`/`author_id`/etc.-shaped
column in `information_schema.columns` (the same technique `__tests__/export/tables.ts`'s
own derived test uses) — no table with student-identifying data exists outside the 43
already accounted for. No orphaned table has appeared since `DATA_RIGHTS_AUDIT.md`,
despite roughly a dozen migrations landing in the meantime.

**`auth.users`: genuinely hard-deleted, not soft-deleted.** `admin.auth.admin.deleteUser(session.userId!)`
passes only one argument. Read the SDK source directly
(`node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js`):
`async deleteUser(id, shouldSoftDelete = false)` — "Defaults to false for backward
compatibility." The call sends `DELETE /admin/users/{id}` with
`{ should_soft_delete: false }`. This matters because a soft-deleted user would leave
the row in place and never fire the cascade at all — silently making every claim above
false while the student sees a success message. Confirmed that isn't happening.

**Storage: all three user-owned buckets are covered, including one that doesn't exist
yet.** `USER_OWNED_STORAGE_BUCKETS = ["evidence", "cv-uploads", "post-media"]`.
`storage.buckets` today only has `evidence` and `cv-uploads` live — `post-media` doesn't
exist yet (the social-posts feature is switched off). This raised a real question: does
listing a bucket that doesn't exist throw, and does that mean `removeAllUserStorage()`
throws on `post-media` for every single deletion attempt today, blocking the entire
feature? Checked directly rather than assumed: a raw, read-only `POST` to
`{project}/storage/v1/object/list/post-media` returns **HTTP 200 with `[]`** — the exact
same response as listing `evidence` for a prefix with no objects. Supabase Storage's list
endpoint does not distinguish "bucket doesn't exist" from "bucket exists, nothing
matches" for this call shape. `post-media` is silently a no-op, not a failure. This was
the single most consequential thing to get right in this audit and it holds.

## 2. Does it delete anything it shouldn't? (Spec §58)

**No — and not by luck, structurally.** Queried `pg_constraint` for any foreign key
where `universities`, `opportunities`, `university_requirements`, `university_programs`,
or any other global/institutional table is the *source* of a reference to
`profiles`/`auth.users`. There are none. Cascade in Postgres only flows from a table
holding the foreign key to the table it references — for a student's profile deletion to
touch `universities`, some column on `universities` (or a table it owns) would have to
reference `profiles(id)`. No such column exists anywhere in the schema. This isn't a
policy being followed; it's a relationship that was never created, which is the more
durable kind of safe.

Also checked for a *trigger*-based side channel — an `AFTER DELETE` trigger on any
user-owned table that might reach into global data as an application-level side effect,
independent of FK cascade. Queried `pg_trigger` for every trigger on `profiles` and on
the tables that link a student to global data (`saved_opportunities`,
`target_universities`, `opportunity_matches`, and the global tables themselves). Every
trigger found is `BEFORE`/`AFTER UPDATE` (timestamp maintenance, canonical-entity-type
enforcement, computed-column guards) — nothing fires on delete, anywhere near this path.

What *does* happen, correctly: deleting a student's profile cascades their own row out of
`saved_opportunities`/`target_universities`/`opportunity_matches` (their personal "I
saved this" relationship disappears) without touching the `opportunities`/`universities`
row those tables point at — that row is shared by every other student and is never
deleted by anyone's individual departure. This is the intended behavior, verified rather
than assumed.

## 3. What survives, and is it deliberate?

Documented survivors: `ai_usage` (anonymized, flagged for counsel — see above),
`message_reports.reviewed_by` (correctly not the student's data).

**One previously undocumented, currently dormant edge case, found in this pass:**
`canonical_entity_merges.merged_by` references `auth.users(id)` directly (not
`profiles`) with `ON DELETE NO ACTION` — not `SET NULL`, not `CASCADE`. If a real user id
were ever recorded here for an account that later runs `deleteMyAccount()`, Postgres
would **refuse the delete outright** (`admin.auth.admin.deleteUser()` would return an
error), which is the safe direction to fail in — a blocked deletion the student sees as
an error, not a silent partial one. Checked whether this is live today: all 37 existing
rows have `merged_by = NULL` (canonical-entity merges have apparently always been
recorded without an attributed user). So today, this cannot block anyone's deletion —
but it isn't documented anywhere as a deliberate choice either, and would start mattering
the moment any admin tooling begins recording a real id here. Worth a one-line decision
(`SET NULL` would match the `message_reports.reviewed_by` precedent, if the intent is
"an admin's own account deletion shouldn't be blocked by an old merge they performed")
rather than leaving it as an accidental `NO ACTION` nobody chose on purpose.

## 4. What happens when it fails halfway?

**Storage fails first — correctly guarded, both by the code and by
`__tests__/account/delete-storage.test.ts`.** If any bucket's `list()` or `remove()`
call fails, `removeAllUserStorage()` throws `StorageCleanupError` before any deletion of
files in a later bucket even starts (`__tests__/account/delete-storage.test.ts`'s own
"a failure on the first bucket stops processing" test pins this), and
`deleteMyAccount()`'s `catch` block returns an honest error without ever calling
`admin.auth.admin.deleteUser()`. The account and every database row survive intact. This
is the safe, already-correct half of the ordering.

**The reverse — storage succeeds, then `deleteUser()` fails — is a real, narrow gap.**
There is no way to make this transactional: Storage and Postgres are different systems,
and the code's own ordering comment acknowledges exactly this constraint. If storage
cleanup completes (files genuinely, irrecoverably gone) and the subsequent
`admin.auth.admin.deleteUser()` call then fails for any reason — a transient Auth API
error, the `canonical_entity_merges` edge case above if it ever activates, anything —
the function returns the same generic message ("Couldn't delete your account. Please try
again or contact support.") as any other failure. The student has no way to know from
that message that their uploaded evidence and CVs are already gone even though their
account, oddly, still exists. A retry would find empty buckets (a harmless no-op per
§1's finding above) and likely succeed on the second attempt — but the message doesn't
say any of that, and a support contact reading only "couldn't delete your account" would
have no reason to suspect files were already lost.

Not fixed here, on purpose — this is the single highest-stakes function in the product,
this pass was scoped read-only specifically because verifying a fix would mean executing
the thing being audited, and a change to this exact file deserves the same test-first
scrutiny `removeAllUserStorage()` itself already has, not a same-night patch appended to
an audit. Flagging precisely instead: the fix, when made, is almost certainly a distinct
error message for "storage succeeded, account deletion did not" rather than any change to
the ordering itself — the ordering is already the safer of the two choices.

## Bibliography (for the next person who needs to re-verify any of this)

- `pg_constraint` (live, `oryn-qa-scratch`) — every FK targeting `profiles`/`auth.users`,
  with `confdeltype`.
- `pg_trigger` (live) — every trigger on `profiles`, the global tables, and the tables
  linking students to them.
- `information_schema.columns` (live) — cross-check for any user-identifying column
  outside the 43-table FK list.
- `node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js` — `deleteUser`'s
  `shouldSoftDelete` default.
- One read-only `POST {project}/storage/v1/object/list/post-media` — confirms a
  nonexistent bucket returns `200 []`, not an error.
- `app/(app)/settings/actions.ts` (`deleteMyAccount`), `lib/account/delete-storage.ts`
  (`removeAllUserStorage`), `__tests__/account/delete-storage.test.ts`,
  `features/settings/delete-account-dialog.tsx` (confirms the "type DELETE to confirm"
  UI the code comment claims exists).
