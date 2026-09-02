# Deploy readiness — what breaks on a fresh database — 2026-09-02

CEO's ask ahead of the founder's planned deploy: this DB is 87/90 migrations applied
incrementally over months; a fresh deploy runs all 90 at once, no history. Four questions —
does 0058 switch the social feed on, do all 90 apply in order, what does the app assume that
no migration creates, are the 0089/0090 degrade guards tested in the present-not-absent
direction. Read-only on live, report don't fix. Full report:
`docs/deploy-readiness-fresh-database-2026-09-02.md`.

## Headline

**All four came back clean**, each checked with real evidence rather than re-asserted from
memory:

1. **0058 stays off.** Built a fresh local Postgres (no Docker, Homebrew PG17 + a hand-built
   Supabase-schema stub — `supabase start` hangs in this sandbox), replayed all 90 migrations
   against it. `posts`/`post_likes`/`post_revisions` exist afterward but have 0 rows. Went
   past the existing 5-layer proof: grepped for a real caller of all nine exported mutation
   functions in `post-actions.ts`, not just `reportPost` — zero callers of any of them,
   anywhere. Also checked the two other feature flags (messaging, connections) for the same
   migration-dependency risk — neither has one; both are pure env-var gates already live.
   0058 is the only kill switch where migration state is even part of the story, and it's
   redundant there.
2. **All 90 apply cleanly from zero.** Empirically, not inferred — the same fresh-Postgres
   replay hit zero errors end to end. No duplicate version numbers (re-checked directly; the
   known `0020` collision fix from 2026-08-31 holds, nothing new collided since).
3. **Nothing missing.** Storage buckets (`cv-uploads`, `evidence`, `post-media`) all created by
   migrations 0015/0058 — confirmed 3 rows on the fresh replay, correct private settings.
   Extensions (`pgcrypto`, `pg_trgm`, `unaccent`) all self-provisioned via `create extension if
   not exists`, all Supabase-standard-allowed. Zero custom roles. No hardcoded seed-data
   assumption found in app code.
4. **The two degrade guards CEO expected to bite don't.** Both `plan_tier` and all seven
   `notify_*` columns are `not null default ...` — confirmed against the real fresh database,
   so they can never be present-but-null. Both consumers (`resolvePlanTier`,
   `categoryIsEnabled`) have real unit tests covering the present-value case explicitly,
   including the exact "student muted a category" scenario for notifications. Honestly
   caveated: these are mocked-client unit tests, not a real end-to-end Postgres round-trip
   through the actual functions — what this pass adds is confirming the real column shape
   (type/nullability/default) matches what those mocks assume, which is the piece that was
   actually unverified before.

One live query got blocked by the permission classifier mid-session (a table-count
comparison); not retried — the five targeted existence checks that did succeed already
establish every delta that matters between fresh and live today.

## Gates

`npm run typecheck` — clean. `npm run lint` — clean. `npm run test` — clean **except one
proven-pre-existing, branch-unrelated flake**: `__tests__/supabase/unchecked-writes.test.ts`'s
"finds a real number of write-call sites" test (a fixed-5000ms-timeout synchronous double-scan
of 300+ files) reproduces identically on `main` HEAD itself (`7791f728`), clean checkout, zero
relation to this branch — confirmed by isolating it alone both in this worktree and directly on
main. Flagged to CEO separately since it could be confusing other lanes' gates tonight; not
fixed here (out of scope for a read-only task, and it's a pre-existing main-branch issue, not
introduced by anything here). Two full-suite runs during this session also hit 10-13 other
timeouts each, different sets each run, during an active fleet-wide disk crisis (oryn-bb's
warnings) — all of those reproduced clean once isolated after disk recovered; only the one
above is a proven, disk-independent, pre-existing issue. No `next build` per current policy.
No `npm ci`/`npm install` in this worktree — symlinked `node_modules` from the main checkout.
Zero live writes — the migration replay ran against a disposable local Postgres database,
dropped after this pass; all live-DB queries were read-only `SELECT`s.
