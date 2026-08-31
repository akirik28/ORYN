# Migration-gap audit — 2026-08-31

Answers three questions: is the `posts`/`post_likes`/`post_revisions` gap (migration 0058)
actually reachable today; apply-or-gate, with reasoning; and what else in the repo assumes
a migration that isn't live. Nothing in this document has been applied — read-only
Supabase MCP queries and a local, throwaway Postgres replica only.

## 1. Is 0058 reachable? Two different code paths, two different answers.

**The student-facing social layer — `lib/social/post-actions.ts` and
`lib/social/posts.ts` (createPost, repost, editPost, deletePost, likePost, unlikePost,
reportPost, getFeedPage, getPost, getLikedPostIds) — is provably unreachable, not merely
unlinked.** This was already true before this audit and is already mechanically tested
(`__tests__/social/posts-hidden.test.ts`), verified here rather than assumed:

- **No route.** Nothing under `app/` renders a feed or a post.
- **No caller at all.** `post-actions.ts` is imported by nothing except a test file;
  `posts.ts` is imported by nothing, not even a test. Confirmed by grep across
  `app/`, `features/`, `lib/` — zero application importers.
- **No Server Action endpoint.** Both files carry `import "server-only"`, never
  `"use server"` — confirmed directly (`head -3` on each). Next never mints a callable
  action id for them.
- **Flag-gated redundantly.** Every exported entry point calls `assertSocialFeedEnabled()`
  before touching the database, which throws unless `ORYN_ENABLE_SOCIAL_FEED` is the exact
  string `"true"` — not set anywhere in this environment.
- **Migration 0058 itself is unapplied** — confirmed against `oryn-qa-scratch` directly
  (`list_tables`): no `posts`, `post_likes`, or `post_revisions` table exists.

Five independent layers, each sufficient alone. This part of the codebase already meets
the standard its own comment sets: "provably unreachable, not merely unlinked."

**The admin moderation surface is a different, weaker story — and it is NOT covered by
any of the five layers above.** `app/(app)/admin/actions.ts`'s `removeReportedPost` and
`restoreReportedPost`, and `app/(app)/admin/page.tsx`'s `postIds`-gated query, all query
`posts`/`post_likes` **directly**, bypassing `post-actions.ts` and `posts.ts` entirely:

- **These ARE real, callable Server Actions.** `admin/actions.ts` carries a genuine
  `"use server"` directive (confirmed) — Next mints a real action id. `requireAdmin()` is
  the only gate; `assertSocialFeedEnabled()` is never called anywhere in this file.
- **They would fail today if invoked with real data** — `relation "posts" does not exist"
  — since the tables genuinely don't exist.
- **But invocation is currently impossible, for a reason outside this file entirely.**
  `PostRemovalControl` (the only caller of `removeReportedPost`/`restoreReportedPost`)
  renders only when `report.post_id` is truthy (`admin/page.tsx:158`,
  `{report.post_id ? (...) : null}`). The *only* code anywhere that ever writes
  `message_reports.post_id` is `reportPost` in `post-actions.ts` — itself gated behind
  every one of the five layers above. Two other live, reachable report-filing paths exist
  (`app/(app)/messages/actions.ts`, reporting a message; `app/(app)/u/[id]/recommendation-actions.ts`,
  reporting a recommendation) — checked both insert payloads directly: neither ever sets
  `post_id`. So today, nothing can populate the one piece of data this admin path needs to
  fire.

**In CEO's terms: "off" and "unreachable" are not the same thing, and this audit found
exactly one call site where they diverge.** The social layer is *unreachable* (five
independent structural guarantees). The admin path is merely *off* — safe only because
its precondition happens to be unreachable *elsewhere*, with nothing in the admin path
itself enforcing that. Nothing currently tests or asserts this chain; a change to any one
link (a future Server Action added to `post-actions.ts` without re-reading the flag file's
own warning, a different table ever gaining a `post_id`-setting insert) would silently
restore admin-path reachability while the tables are still absent.

## 2. Recommendation: apply 0058, don't gate the admin code

**Apply migration 0058 to `oryn-qa-scratch`.** Reasoning:

- It is purely additive DDL — three new tables, one new nullable column on
  `message_reports` (`post_id`, alongside the already-applied `recommendation_id`), new
  RLS policies on the new tables only. It does not alter, drop, or touch any existing row.
- **It does not turn the social feature on.** The flag file is explicit that its five
  layers are independent and redundant — "the other four are what stops it from quietly
  stopping being true" if any one slips. Applying 0058 removes exactly one of five; the
  route, nav, Server Action, and flag layers hold unchanged. The founder's actual
  constraint — nothing reachable by a logged-in student — stays fully intact.
- **The legal-review gate this feature is genuinely waiting on is about turning the
  feature ON for students**, not about whether the tables may exist. Applying the
  migration doesn't cross that line; it removes a gap between what's already-shipped admin
  code assumes and what the schema has.
- The alternative — gating `removeReportedPost`/`restoreReportedPost`/the `admin/page.tsx`
  query against the tables' absence — treats a symptom of a schema gap with defensive code
  for a precondition this audit just proved cannot currently occur through any live path.
  That is exactly the "don't add handling for scenarios that can't happen" trap: the real
  fix is applying the migration that was always supposed to ship with this admin code, not
  building a permanent workaround around its absence.

Applying it also directly closes the one gap in the existing "provably unreachable" proof:
after 0058 is applied, the admin path's remaining protection (nothing can populate
`post_id`) becomes moot, because there is no longer a missing table behind it, and
`posts-hidden.test.ts`'s five layers keep the *feature* off exactly as designed.

## 3. The wider question: what else assumes a migration that isn't live?

Method: built a fresh local Postgres from all 70 current migrations in order (the actual
"what the code expects", not a claim about it), extracted its complete `information_schema.columns`
for `public`, and diffed that against `oryn-qa-scratch`'s live columns directly. 1,068
expected columns; 1,034 live; zero columns exist live that migrations don't expect (no
drift in the other direction). **34 columns missing, all attributable to exactly three
migrations — 0058 already covered above, plus two nobody had flagged this session:**

### Migration 0057 (`university_program_kilavuz_kodu.sql`) — also entirely unapplied
Adds one column: `university_programs.kilavuz_kodu`.

### Migration 0059 (`schema_gaps_2026-08-22.sql`) — also entirely unapplied
Adds: `opportunities.access_channel`, `university_requirements.unmet_consequence`,
`university_programs.ucas_code`, `university_deadlines.scope`.

**Neither is news to the codebase — both are self-documented as unapplied directly in
`types/database.ts`'s own comments** ("Migration 0059 (unapplied)", "Migration 0060
(unapplied)" — the latter comment is now stale; 0060 **is** live, confirmed directly, so
that specific comment should be corrected whenever this area is next touched). What's new
here is confirming it against the live database rather than trusting the comment, and
tracing reachability rather than leaving it as a known-but-unmeasured gap.

**Reachability, checked the same way as 0058 — explicit `.select()` column lists,
property reads, and insert/update payloads, not just "does the type exist":**

- Zero explicit selects name any of these five columns anywhere in `app/`, `features/`,
  or `lib/`.
- Zero code reads `.access_channel`, `.unmet_consequence`, `.ucas_code`, `.kilavuz_kodu`
  (on `university_programs` specifically — `university_program_placement_cycles.kilavuz_kodu`
  is a *different* column, added by 0055, live and actively used throughout
  `lib/programs/yok-atlas-matching.ts`; the two are easy to conflate by name alone, so this
  was checked by tracing each write target directly, not by the column name matching).
- Zero insert/update payloads in live code (`app/`, `features/`, `lib/`) name any of the
  five; the only source-writer near this territory
  (`lib/programs/yok-atlas-matching.ts`) writes `university_program_placement_cycles`, not
  `university_programs` — confirmed by reading its actual insert target, not assumed.
  `lib/dev/fixtures.ts` references `access_channel`, but that module is dev-only fixture
  data (spec Phase 49), never a live write path.

**Conclusion: 0057 and 0059 are currently completely inert.** Nothing reads or writes any
of their five columns through any reachable path today. This is a real gap — `types/database.ts`
asserts these fields are always present (non-optional), which is a live lie about the
schema — but not an active crash risk the way 0058's admin-path precondition chain is. The
risk is entirely prospective: the first piece of code that starts trusting the type (a
natural thing to do, since nothing marks these fields as unsafe beyond a code comment)
gets `undefined` where TypeScript promises a real value.

**Recommendation, offered but not the primary ask here:** apply 0057 and 0059 in the same
pass as 0058. Same reasoning — purely additive, currently inert, closes a known and
self-documented gap, and removes a live type-safety lie before anything starts depending
on it. Lower urgency than 0058 (nothing is one accidental data-write away from breaking),
so this is a recommendation to batch, not a claim that it's equally time-sensitive.

**On why three consecutive migrations from the same few days ended up unapplied while
everything before and after landed:** not confirmed directly (would need history this
audit didn't have reason to reconstruct), but the shape matches
[[migration-0020-duplicate-version-blocks-fresh-deploy]] and tonight's own near-miss on
0069/0070 closely enough to name as the likely mechanism: a numbering collision in the
057-059 range at some point historically, silently stopping an incremental `db push`
partway through — the same failure shape, on an already-partly-migrated database instead
of an empty one, before the numbering-collision test or the migration-replay CI existed to
catch it. Offered as the probable explanation, not asserted as confirmed fact.
