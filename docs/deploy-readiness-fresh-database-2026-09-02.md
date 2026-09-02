# Deploy readiness — what actually breaks on a fresh database — 2026-09-02

CEO's ask: this database (`oryn-qa-scratch`, `qtcvcflzxbuagvvwahhu`) has 87 of 90 migrations
applied incrementally over months; a real founder deploy is the exact inverse — a brand-new
Supabase project, all 90 applied at once, no history. Four questions: (1) does 0058's kill
switch stay off, (2) do all 90 apply in order from zero, (3) what does the app assume exists
that no migration creates, (4) are the 0089/0090 degrade guards tested in the direction they'll
actually run in on a fresh deploy — present, not absent. Read-only on live, report don't fix.

Branch: `oryn/deploy-readiness-2026-09-02`, off `d0127b88`.

## Method

Point 2 is answerable empirically, not just by reading SQL, so that's how it was answered:
built a fresh local Postgres 17 (Homebrew, no Docker — `supabase start` hangs in this sandbox,
per established practice), bootstrapped a minimal stand-in for what a brand-new Supabase
project already has before any project migration runs (`anon`/`authenticated`/`service_role`
roles, `auth.users` + `auth.uid()`/`auth.role()`, `storage.buckets`/`storage.objects` +
`foldername()`/`filename()`, an empty `supabase_realtime` publication, schema-wide grants),
then replayed all 90 migration files against it in filename order via `psql -v
ON_ERROR_STOP=1`. This never touched live — a new, disposable local database, dropped after
this pass. Points 1, 3, and 4 are a mix of code reading and querying the resulting fresh
database directly; where a claim about *live's current state* mattered, it was queried fresh
this session (read-only `SELECT`s via Supabase MCP against `qtcvcflzxbuagvvwahhu`), not
recalled from memory, per this project's own standing rule that `list_migrations` and stale
memory are both leads to verify, not findings to cite.

## 1. Does 0058 switch the social feed on when every migration runs in order?

**No — verified two ways, not one.**

**Empirically**: after the full 90-migration replay, `posts`/`post_likes`/`post_revisions`
all exist (0058 ran) and all have **0 rows**. The tables being present is not in question —
whether anything can ever write to them is, and nothing can.

**By code, exhaustively rather than sampling**: `lib/social/posts-feature-flag.ts` documents
five layers (no route, no nav link, no `"use server"` on the mutation file, the flag itself,
migration presence). Re-verified fresh rather than trusted from memory: `find app -iname
"*post*" -o -iname "*feed*"` returns nothing; `lib/social/post-actions.ts` confirmed to still
carry no `"use server"` directive. Went one step further than the existing five-layer proof:
grepped for a real caller of **every one of the nine exported mutation functions** in
`post-actions.ts` (`createPost(ForUser)`, `repost(ForUser)`, `editPost(ForUser)`,
`deletePost(ForUser)`, `likePost(ForUser)`, `unlikePost(ForUser)`, `reportPost(ForUser)`) —
not just `reportPost`, which is as far as the existing writeup went. A first pass caught six
false-positive hits on "repost" (`lib/social/posts-feed.ts`, `posts-visibility.ts`, `posts.ts`,
`posts-input.ts`, `rate-limit-config.ts`, `lib/admin/queries.ts`) — all six turned out to be
the English word in a comment or a `kind: "repost"` type field, not a call to the function;
confirmed by checking each file for an actual `post-actions` import (none). **Real result: zero
callers of any of the nine, anywhere in the app, full stop.** This is a stronger claim than
"reportPost is unreachable" — the entire mutation surface is dead code today, and migration
0058 running on a fresh deploy only creates empty tables nothing can ever populate.

The admin-moderation surface is the one place code genuinely imports from the social layer
(`app/(app)/admin/actions.ts`, `features/admin/sections/reports-section.tsx`,
`features/admin/post-removal-control.tsx`) — but from `lib/social/posts-moderation.ts` (pure
helpers), not `post-actions.ts`. `removeReportedPost`/`restoreReportedPost` are real,
`requireAdmin()`-gated Server Actions that *could* run — but they operate on `posts` rows that
can never exist, since nothing ever calls `createPost`, and `lib/admin/queries.ts`'s
`getReports()` still filters `post_id` with `typeof id === "string"` (its own comment now
explains why: the column can be genuinely `undefined` pre-migration, and `undefined !== null`
would otherwise poison an `.in()` query) — confirmed unchanged.

**Checked whether this is a one-off or a pattern**: two other feature kill switches exist,
`lib/social/connections-feature-flag.ts` and `lib/messaging/messaging-feature-flag.ts`. Neither
has a migration-presence layer — messaging's own comment states its tables and routes are
*already fully applied and live*; connections' tables are likewise already live. Both gate
purely on an env var (`ORYN_ENABLE_CONNECTIONS`/`ORYN_ENABLE_MESSAGING`, exact-match `"true"`,
deliberately absent from `.env.example`) — identical mechanism regardless of fresh vs. current
deploy. **0058 is the only one of the three where migration state is even part of the
picture, and it's redundant there, not load-bearing.**

## 2. Order dependencies — do all 90 apply cleanly from zero?

**Yes, empirically confirmed. Zero failures, zero duplicate version numbers.**

`ls supabase/migrations/ | sed -E 's/^([0-9]+)_.*/\1/' | sort | uniq -d` — empty. The known
`0020` duplicate-version defect (two files both claiming version 20, which aborted `supabase
db push` at migration 21/68 on a fresh database) was fixed 2026-08-31 by renumbering to `0068`
— re-confirmed here that no new collision has been introduced since across the fifteen
migrations added since that fix (0068 was renumbered from the pre-existing 20 files; 90 total
now).

The full replay (method above) applied all 90 files in filename order against a truly fresh
database with **zero errors** at any step. This is the strongest evidence available short of
an actual production deploy: not "the SQL looks fine," but "this exact sequence, run this exact
way, against something built to resemble what a new Supabase project provides, completed
clean."

**One caveat stated precisely, not glossed over**: this used `psql -f` in filename order, which
is what a fresh `supabase db push` *should* also do — but `oryn-qa-scratch`'s own history
(memory: `supabase_migrations.schema_migrations` has no row for twelve applied migrations, so
a `db push` against *this* project specifically would re-run and die on a policy without `if
not exists`) means the CLI's own ledger-diffing behavior was not exercised here, only the raw
SQL sequence. For a genuinely new project (empty ledger, matching a fresh deploy exactly) this
distinction doesn't apply — `db push` and a raw sequential replay are the same operation when
the ledger starts empty. Flagging the distinction so it's not silently assumed away.

## 3. What does the app assume exists that no migration creates?

**Checked storage buckets, extensions, roles/grants, and seed data. All four came back clean.**

- **Storage buckets**: grepped `app/`/`lib/`/`features/` for `.storage.from(` — three buckets
  referenced: `cv-uploads`, `evidence`, `post-media`. All three are created by migrations
  (`0015_storage_buckets.sql`: `evidence`, `cv-uploads`; `0058_social_posts.sql`: `post-media`)
  — confirmed on the fresh replay: `select * from storage.buckets` returns exactly these three,
  all `public: false`, matching AGENTS.md §11's "never publicly addressable by default." No
  bucket referenced in code is missing from every migration.
- **Extensions**: `pgcrypto` (`0001`), `pg_trgm` + `unaccent` (`0038`), all via `create
  extension if not exists`, all in Supabase's standard allowed-extension list for a project's
  own role to enable — no extension the app depends on requires a manual dashboard step.
- **Roles/grants**: zero `create role`/`create user` statements anywhere in `supabase/
  migrations/` — the app relies entirely on the standard `anon`/`authenticated`/`service_role`
  roles every Supabase project provisions automatically at creation, never a custom one a
  migration would need to (and doesn't) create.
- **Seed data**: grepped for hardcoded system-user-ID/`SEED_`-style constants in app code —
  none found. The only seed-shaped `insert into` statements in any migration
  (`canonical_field_policies` and `entity_verification_queue`, both in `0038`/`0039`) are
  themselves migration-shipped, not a manual step someone took once and never recorded.

**Not found: any hand-added column, table, or config invisible to a from-scratch replay.**
Consistent with (though not proof beyond) the prior unwritten-columns sweep, which categorized
the schema from `information_schema` directly rather than from migration files — the two
methods agreeing is a reasonable cross-check, not independent confirmation of the same claim
twice.

## 4. Do the 0089/0090 degrade guards work in the direction they'll actually run in on a fresh deploy — column present, not absent?

**Checked precisely rather than assumed either way. For both migrations, the present-value case
is real, explicit, tested — CEO's named top suspicion does not hold here.**

Both columns are `not null default ...` (`plan_tier text not null default 'standard'`;
all seven `notify_*` are `boolean not null default true`) — confirmed against the real fresh
database, not just the migration file: `information_schema.columns` shows exactly `is_nullable:
NO`, `column_default: 'standard'::text` / `true`, correct types. This matters structurally:
neither column can ever be *present-but-null* — Postgres guarantees a real value on every row
the moment the migration lands, so the `?? default` fallbacks in both consumers exist purely
for the *absent-column* case (`undefined`, not `null`), never fire once the column exists, and
have nothing subtle to get wrong in the present direction as far as the fallback mechanism
itself goes.

- **`lib/tier/plan-tier.ts`'s `resolvePlanTier`** — `profile.plan_tier ?? "standard"`.
  `__tests__/tier/plan-tier.test.ts` explicitly tests **both** directions: `resolvePlanTier({
  plan_tier: "ultra" })` → `"ultra"` and `resolvePlanTier({ plan_tier: "standard" })` →
  `"standard"`, alongside the absent-column case. The present-value case is tested, contrary
  to the general worry. Further de-risked structurally: the function's own comment states
  there is no write path at all yet ("no payment/upgrade flow this pass") — every fresh
  profile gets `'standard'` from the column default and nothing in today's code ever sets
  `'ultra'`, so the one value that would exercise a real behavior difference from the
  degrade-default doesn't currently get produced by anything.
- **`lib/notifications/create.ts`'s `categoryIsEnabled()`** — this is the sharper case, since
  the Settings UI *does* write real `false` values once 0090 is applied.
  `__tests__/notifications/create.test.ts` has a dedicated `"migration 0090 preference gate"`
  block covering: explicitly disabled (skips the insert, returns `false`), explicitly enabled
  (inserts normally), **and** a test specifically designed to catch a wrong-column read (all
  seven columns returned, only one `false`, asserts the *right* category is the one gated) —
  plus the absent-column degrade, an unrelated-read-failure-fails-open case, a
  no-profile-row case, and a defense-in-depth null-value case the test's own comment says
  "the real column is not-null default true, this is defense in depth for the mock layer
  only." This is the exact scenario CEO named — a student who explicitly muted a category —
  and it's covered.

**The honest limit of this evidence, stated precisely**: both test files are unit tests against
a *mocked* Supabase client, not an integration test against a real Postgres round-trip with the
migration actually applied. What this pass adds beyond re-reading those tests is exactly that
missing piece — the fresh-replay database now has both migrations genuinely applied, and
`information_schema` confirms the real column shape (type, nullability, default) matches
exactly what the mocks assume. That closes the gap between "the function's logic is correct
against a hypothetical present value" and "the present value Postgres actually returns has the
shape the function assumes" — it does not run the actual TypeScript functions against the
real database, which would be the one remaining, stronger level of proof, and would need
wiring a real Supabase client to local Postgres to attempt.

## What this pass did not do

- Did not run `supabase db push` itself (not installed/exercised this session) — the `psql`
  replay is the same underlying SQL sequence but not a test of the CLI's own migration-ledger
  bookkeeping. For a genuinely empty ledger (a real fresh project) these coincide; noted as a
  caveat above, not glossed over.
- Did not wire a real Supabase client against the fresh local database to execute
  `resolvePlanTier`/`categoryIsEnabled` as actual function calls — evaluated their correctness
  by matching real column metadata against what their unit tests already assume, not by
  running the functions themselves end-to-end.
- Did not audit RLS policy *correctness* on a fresh database (only that policies are created
  without error) — Postgres access control in this schema lives in three places (policies,
  column grants, triggers; see prior finding on `profiles.is_admin`), and this pass confirmed
  the replay completes, not that every policy evaluates identically to production. Out of
  scope for "does it break," in scope for a future correctness pass if wanted.
- One live comparative query (`select count(*) from information_schema.tables`) was blocked
  by the permission classifier mid-session; not retried, since the five targeted existence
  checks that did succeed already establish the concrete deltas that matter (`plan_tier`,
  `notify_deadline`, `posts`, `message_reports.post_id`, `post-media` bucket — all confirmed
  absent on live today, all confirmed present after a fresh replay).

## Bottom line

Nothing found that breaks a fresh deploy. The one thing CEO named as the likeliest real risk —
0058 silently switching the social feed on — is the most thoroughly checked item in this report
and comes back clean on both an empirical replay and an exhaustive (not sampled) code check.
Order dependency is proven, not inferred. The app doesn't assume anything a migration fails to
create. The two present-case degrade guards CEO flagged as most likely undertested both have
real, explicit present-case coverage already — worth knowing precisely rather than assuming the
general "everything's tested for absence" pattern held here too.
