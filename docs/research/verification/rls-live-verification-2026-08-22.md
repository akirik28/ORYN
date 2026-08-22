# Live RLS verification — Surface 1 (`/u/[id]`) + full-schema sweep

**2026-08-22, BUG-1**, assigned by ORYN-CEO after `docs/production-route-audit.md`'s
"Known gaps" section named real RLS-policy verification as the one remaining gap, blocked
in that audit's own environment (no Docker, no live Supabase project). This session has
live Supabase MCP access to a real, hosted project (`oryn-qa-scratch`) with real Auth +
PostgREST + RLS — that blocker no longer applies here.

**Method**: real GoTrue password sign-in as the two QA accounts (`@supabase/supabase-js`
+ the real anon/publishable key — the actual client the app itself uses), against the
live project. Deliberately not a simulated/hand-rolled JWT — the audit doc that assigned
this explicitly warned a stub risks false confidence if it diverges from the real
Auth+PostgREST behavior. Every result below is what the real stack actually returned to a
real authenticated (or anonymous) session, not an inference from reading policy SQL.

**Precedent**: `docs/known-issues.md`'s Chat 3 history records a prior session doing this
once for the social-privacy migration specifically, against a disposable scratch project.
Treated as a lead, not as coverage, per assignment — re-verified from scratch below rather
than assumed still valid. It still holds for the two cases it originally covered
(pending-direction asymmetry, declined-keeps-leaking) — see rows 5 and 8.

## Test data and cleanup

One `connections` row created between QA accounts A (`46dd6f7e-ab57-411f-8ff7-64ce2cf16a07`)
and B (`e9eba798-195d-4859-960c-4b8968df7819`) — id `426f7f2e-1272-435a-a509-5ef531e1ddf2`
(pending → accepted), deleted and recreated as id `0f63a76d-54dc-4e7c-b08d-3b3da405141c`
(pending → declined) for the decline-specific check, then deleted. One temporary
`is_public=true` flip on account A. **All test data removed and restored** — verified via
a direct admin query after cleanup: `connections_count=0`, `a_is_public=false`,
`b_is_public=false`, matching the exact pre-test baseline (both accounts were already
`is_public=false` with zero connections before this session started).

## Surface 1 — `/u/[id]` public-profile exposure

Contract under test: `lib/social/public-profile-authorization.ts`'s `canViewBasicProfile`
and the `public_profiles` view (migrations 0023/0024). 9 checks, 8 passed.

| # | Identity / state | Query | Expected | Actual | Verdict |
|---|---|---|---|---|---|
| 1 | anon, no session | `public_profiles` for A (private) | null | null | PASS |
| 2 | anon, no session | `profiles` direct for A (private) | null | null | PASS |
| 3 | A→B, no connection, B private | `public_profiles` for B | null | null | PASS |
| 4 | A→self | `profiles` direct for A | full row | full row | PASS |
| 5 | A(requester)→B(recipient), pending | `public_profiles` for B | null (migration 0024's fixed direction) | null | PASS |
| 6 | B(recipient)→A(requester), pending | `public_profiles` for A | safe-column row only | safe-column row only, exact whitelist match | PASS |
| 7 | A↔B, accepted | `public_profiles` both directions | safe-column row both ways | safe-column row both ways | PASS |
| 8 | B(recipient)→A, declined | `public_profiles` for A | null (the "declined kept leak forever" fix) | null | PASS |
| 9 | anon, no session | `public_profiles` for A with `is_public=true` | null (view granted to `authenticated` only per migration 0023's comment) | **the full safe-column row** | **FAIL** |

### The hole (#9), root cause, and fix

`grant select on public.public_profiles to authenticated;` (migration 0023) reads as the
sole gate. It is not. Checked `information_schema.role_table_grants` directly: `anon`
already holds SELECT (and DELETE/INSERT/UPDATE/etc.) on `public_profiles` — and, checked
via `pg_default_acl`, on **every table and view in `public`**, ~90+ objects, via this
project's standing bootstrap default (`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT
... TO anon, authenticated, service_role`, owned by `postgres`/`supabase_admin`, set at
project creation — not something any migration in this repo did). Grants are additive; an
explicit `GRANT ... TO authenticated` cannot revoke a broader grant that already exists.

`public_profiles` is a security-definer view (0023's own comment: "the default -- no
security_invoker"), so the grant was never the real gate — the view's own WHERE clause
is. That clause's `is_public = true` branch never references `auth.uid()`; it is
satisfied by the row's own data regardless of caller identity. The base `profiles` table
is correctly unaffected (row #2, and re-confirmed directly against the public row: anon
querying `profiles` for A with `is_public=true` still returns null — `"select own
profile"`'s `id = auth.uid()` has no is_public exception).

Verified `auth.uid()`'s actual live definition before relying on it:
```sql
select coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), ''),
  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
)::uuid
```
Resolves to NULL for the anon key (no `sub` claim) — confirmed empirically too (every
anon-identity connection-based branch in the view, which does reference `auth.uid()`,
correctly returned null throughout baseline testing).

**Fix**: `supabase/migrations/0061_public_profiles_require_authenticated.sql` — written,
**not applied**. Adds `auth.uid() is not null` as a top-level guard in the view's WHERE
clause, chosen over `revoke select on public_profiles from anon` because this view's own
established pattern (0023's comment) is to hard-code its full security contract into the
view definition itself rather than depend on an external grant staying in sync — exactly
the class of drift that produced this bug. A revoke would fix today's symptom but not the
failure mode: a future `create or replace view` (0024 already did this once) that doesn't
re-state the revoke silently reopens it, with the schema-wide default ACL providing the
`anon` grant again with no migration ever saying so.

**Exposure measured live** (`oryn-qa-scratch`, 2026-08-22): 7 profiles total, 1 currently
`is_public=true`. One row, in a QA scratch project — not a production incident. Blast
radius is bounded to `PUBLIC_PROFILE_SAFE_COLUMNS` only (display_name, headline, about,
country, curriculum, graduation_year, looking_for) — never the private-only fields
(school_name/birth_year/is_admin/etc., confirmed via #2/#4), and only for a profile a
student has already chosen to mark public, one at a time by id, with no enumeration path
found in the app code. Still real: minor-safety-relevant data readable by anyone with no
account, when the product tells students it's visible to other logged-in Oryn students.
Escalated by ORYN-CEO to the founder as backlog item 30 (PR queued, not applied).

## Sweep — the same defect class, elsewhere

Assigned by CEO after the `public_profiles` finding, before continuing to surface 2:
check whether this pattern (a permitting branch that never references `auth.uid()`, on an
object accessible to `anon` by the schema-wide default) recurs.

### Unapplied migrations (0057–0060; live DB is at 0056)

- **0057, 0059, 0060**: no `create policy`, `create view`, `security definer`, or
  `grant ... to` statements at all — pure column/index/enum additions. Clean, nothing to
  check.
- **0058 (`social_posts.sql`) — found the identical pattern, worse exposure, fixed in
  place.** `"read visible posts"` on `public.posts` had no `TO authenticated`
  restriction (every other policy in this file does have a hard `= auth.uid()` condition
  at the top level — checked each one individually: `create own post`, `author edits own
  post`, `author deletes own post`, `select own likes`, `post author sees its likes`,
  `like a visible post`, `remove own like`, `author reads own post revisions` all require
  identity unconditionally, only `read visible posts` had an identity-free OR-branch).
  The `oryn_public` branch — `visibility = 'oryn_public' and is_profile_public(author_id)`
  — never references the caller. Once applied, this would have let an anonymous caller
  read the full content of every `oryn_public`-visibility post from every public-profiled
  author — a materially worse exposure than `public_profiles`, since a post carries
  user-authored text/media, not a fixed safe-column whitelist. **Not applied anywhere**
  (this feature ships behind a kill switch and a founder-gated legal review per the
  file's own header — no deployed state to correct), so fixed **in place** rather than
  with a corrective migration, per CEO's explicit direction: a corrective migration on
  top of an unapplied file would be pure ceremony and leaves a known-bad file in the tree
  for someone to apply by accident. Added `to authenticated` to the policy and rewrote
  the file's line-41 comment, which had cited `public_profiles`/0023 as precedent for "no
  anonymous tier, ever" — precisely the belief that turned out to be wrong. The
  replacement comment states the actual mechanism (schema-wide default ACL; the
  restriction that matters is on the policy, not the grant) so a future reader doesn't
  inherit the same wrong reasoning a second time.

### The mechanical signature, precisely

The defect is not "an object doesn't mention `auth.uid()`" — a whole-object check for
that string is not sufficient and produces both false positives and false negatives. It
is specifically: **a single permitting branch, inside an OR chain, that is satisfied
without referencing the caller's identity at all.** `public_profiles`'s own WHERE clause
*does* contain `auth.uid()` — twice, in the two connection-based branches — which is
exactly why a whole-object grep for "does this reference auth.uid()" would have called
it safe. The bug is in the one branch that doesn't: `is_public = true`. Every policy and
view below was therefore read branch-by-branch, not grepped as a whole object, and that
distinction is the actual finding worth generalizing: two experienced authors and at
least one prior code review missed this specifically because the check that would catch
it — per-branch identity coverage, not object-level keyword presence — isn't one anyone
naturally runs by reading SQL.

### Live policies (`pg_policies`, all of `public` schema — every row, every branch, read
### individually, not sampled and not grepped)

All ~90 table-level policies checked individually, branch by branch. Two shapes, both
correct:
- **Owner-scoped** (the large majority): every permitting branch is `<column> =
  auth.uid()`, including every OR'd branch (`connections`, `messages`, `recommendations`,
  `skill_endorsements` — each branch checked, all identity-bound, including nested EXISTS
  subqueries which themselves require `auth.uid()`). Safe unconditionally: `auth.uid()`
  resolves to NULL for `anon`, so no branch is ever satisfied by an anonymous caller.
- **Reference/catalog data** (`universities`, `opportunities`, `university_programs`,
  `school_profiles`, `canonical_entities`, and 15 others): `qual: true` (unconditionally
  permitted) but `roles: {authenticated}` — Postgres simply does not evaluate a policy
  for a role it isn't scoped to, so an `anon` session matches zero policies on these
  tables and RLS's default-deny applies. This is the same protection `public_profiles`
  needed and didn't have — every one of these tables already has it correctly, via `for
  select to authenticated using (true)` at creation time (not a retrofit).

**Zero additional vulnerable table policies found.** Independently corroborated: every
table in `public` has RLS enabled (`pg_class.relrowsecurity`, checked directly — 0 rows
with it disabled), so there is no table sitting fully open behind the default grant with
nothing gating it at all.

### Views (the object class where this can actually hide — a view's WHERE clause is not
### an RLS policy and does not appear in `pg_policies`)

Only two views exist in the entire `public` schema (`pg_views`, exhaustive, not sampled),
and the distinction between them is `security_invoker`, checked via `pg_class`/
`reloptions`, not assumed:

- **`public_profiles`** — `security_invoker` unset (Postgres default: `false`, i.e.
  security-definer — runs as the view owner, bypassing the caller's own RLS on the
  underlying `profiles` table). This is *why* a missing identity check in its own WHERE
  clause matters: nothing else in the query path checks who's asking. The finding above;
  fixed (0061, unapplied).
- **`current_university_student_counts`** — **initially misclassified in an earlier
  draft of this report as the same gap at lower severity. That was wrong, corrected
  before this shipped.** Its WHERE clause also has no identity check, but it is
  `security_invoker = true` (confirmed directly: `reloptions` shows
  `security_invoker=true`) — the caller's *own* RLS applies to the underlying
  `universities`/`university_profile_metrics` tables it reads from, and those tables are
  correctly `to authenticated`-restricted. Verified empirically, not just by the
  security_invoker flag: an anonymous client queried against this view returns `[]` —
  zero rows, not data. **Not vulnerable. No fix needed, none applied.**

### The standing rule this sweep confirms

In this project, a table or view in `public` is readable by `anon` by default (schema-
wide `pg_default_acl`, set at bootstrap) — confirmed to apply with no exceptions (every
table has RLS enabled) and to matter for exactly one object (the one security-definer
view; the one security-invoker view is structurally immune regardless of its own WHERE
clause). RLS policies (for tables) or a security-definer view's own WHERE clause (for
views — which have no RLS of their own, and where `security_invoker` determines whether
the WHERE clause is even the relevant gate) are the only real gate. A permitting branch
that never references `auth.uid()`, checked branch-by-branch rather than object-by-
object, is a public branch, regardless of what any `GRANT` statement says or implies.
Two independent authors (migrations 0023 and 0058) wrote the same incorrect belief into
comments, each citing the other as precedent, before
this sweep. Any future table/view creation should be checked against this signature
before merge, not just against its own stated intent.

## Surface 2 — admin gate: critical, live, self-service privilege escalation

Started surface 2 with the more fundamental question before the surface-level one:
before testing whether `requireAdmin()` correctly blocks a non-admin from `/admin`, is
there anything at the database level stopping a user from setting `is_admin = true` on
their own row directly. There wasn't, and it was tested live rather than assumed.

| Identity | Query | Expected | Actual | Verdict |
|---|---|---|---|---|
| B (`is_admin=false`, ordinary account) | `update profiles set is_admin = true where id = <own id>`, via B's own real authenticated session | rejected — RLS should not let a caller grant themselves admin | **succeeded — no error, no rejection** | **FAIL, CRITICAL** |

**Root cause**: `profiles`' RLS is exclusively row-scoped (`"select own profile"` /
`"update own profile"`, both `id = auth.uid()`, migration 0014). Row-scoping answers
"which row" — it says nothing about "which columns within that row." `is_admin` is an
ordinary column (migration 0002: `boolean not null default false`) with no protective
trigger. Checked directly before concluding this, not inferred from the RLS policy
alone: enumerated every trigger on `profiles` — `profiles_set_updated_at` and three
`enforce_canonical_entity_type` triggers on the entity-id columns. None touch `is_admin`.

**Verification discipline**: reverted `is_admin` to `false` in the same script run
immediately after confirming the write succeeded, then independently re-confirmed via a
separate admin-access query (not the same client/session that performed the test write)
— `is_admin=false`, matching the pre-test state. ORYN-CEO independently re-derived the
same two structural facts (row-scoped-only policy, no protective trigger) within minutes
of the report, from `pg_policies`/`pg_trigger` directly rather than trusting this
report's account of them.

**Blast radius**: `is_admin` is the sole input to `isAdminProfile()`
(`lib/security/is-admin.ts`) and therefore to `requireAdmin()`, which gates `/admin` and
every export in `app/(app)/admin/actions.ts`. Confirmed directly: every one of those,
once past `requireAdmin()`, calls `createAdminClient()` — the service-role client, which
bypasses RLS entirely. This is not "read a page" — it is full service-role-backed access
to the entire schema, self-grantable by any account with a single API call and no UI.
Materially worse than the `public_profiles` finding above: that one required a student to
have opted into "public" and exposed a fixed safe-column whitelist; this one requires
nothing from anyone and grants everything. Live state: exactly one admin exists in
`oryn-qa-scratch` (QA account A, deliberately founder-granted).

**Precedent this codebase already had and never applied here**: `profiles` itself already
carries three column-scoped `BEFORE UPDATE OF <col>` guard triggers (migration 0038,
`enforce_canonical_entity_type` on the three entity-id columns) — the exact mechanism,
on the exact table, never extended to the one column that grants privilege. Migration
0058's `posts_guard_system_columns` (reset-to-`OLD`, gated on `current_user <>
'service_role'`) is the closer precedent for the fix's actual shape, since it protects a
"looks client-writable, is actually system-owned" column rather than validating a
foreign-key-shaped value.

**Related, lower-severity finding, same root cause**: cataloged every column on
`profiles` for the same shape (presented as system-computed, no actual protection).
Two more qualify, both self-directed rather than cross-user:
- `profile_strength_score` — written only by `lib/scoring/persist.ts`, displayed as the
  "Career Profile" score on the dashboard header and `MobileNav` badge, and read
  cross-user by `lib/benchmarking/cohort.ts` for peer-comparison cohorts (so an unguarded
  write pollutes another student's benchmark view too, not just the writer's own).
- `completeness_percent` — same write-owner; directly sets
  `dataConfidence = completeness_percent >= 60 ? "high" : "medium"` in
  `lib/admissions/persist.ts`, so a student could force their own admission-outlook
  confidence label to "high" regardless of actual completeness.

Every other column on `profiles` (the ~20 remaining, including the three already guarded
for a different reason by migration 0038) is genuinely meant to be student-writable via
Settings or onboarding and was deliberately left unguarded — see the migration's own
per-column reasoning.

**Fix written, not applied**: `supabase/migrations/0062_profiles_guard_protected_columns.sql`.
A `BEFORE UPDATE OF is_admin, profile_strength_score, completeness_percent` trigger,
mirroring `posts_guard_system_columns`'s reset-not-raise shape exactly: resets each
protected column to `OLD` unless `current_user = 'service_role'`, silently rather than
with an exception (an exception would tell an attacker precisely which column is
guarded, and would fail an otherwise-legitimate multi-column profile update for an
unrelated reason). Regression test: `__tests__/security/profiles-guard.test.ts` (6
assertions — the reset behavior per column, the exact column list and nothing more, the
service-role detection mechanism, the trigger-depth guard, the column-scoped `OF`
clause, the not-applied marker).

## Files touched

- `supabase/migrations/0061_public_profiles_require_authenticated.sql` (new, **written,
  not applied**).
- `supabase/migrations/0062_profiles_guard_protected_columns.sql` (new, **written, not
  applied**).
- `supabase/migrations/0058_social_posts.sql` (edited in place — unapplied file, no
  deployed state to correct; policy fix + comment correction).
- `__tests__/security/profiles-guard.test.ts` (new regression test).
- `__tests__/social/posts-schema.test.ts` (migration-count ceiling bumped, per its own
  comment's instruction, for both 0061 and 0062).
- `docs/known-issues.md` (two new entries).
- This file.

No live database write survives this pass. Both live-write tests (the surface-1
connection/is_public tests, and the surface-2 `is_admin` escalation test) created state
that was reverted within the same session and independently re-verified reverted via a
separate read path afterward.
