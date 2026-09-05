# Feature-flag enforcement audit — Server Actions and API routes, 2026-09-05

CEO's exact ask, following the §12 minor-safe audit: page-level enforcement was already
grepped and verified for `ORYN_ENABLE_MESSAGING`/`ORYN_ENABLE_CONNECTIONS`
(`requireMessagingEnabled()`/`requireConnectionsEnabled()` called at the top of every
relevant page). **Not yet checked: every Server Action and API route** — a page-level
check alone doesn't stop a Server Action from being called directly, argument and all,
regardless of what the UI shows.

## Method

1. Every `"use server"` file touching `messages`, `connections`, `blocked_users`,
   `message_reports`, `posts`, or `post_likes` — read in full, every exported function
   checked individually for a call to the matching `assert*Enabled()` guard.
2. Every `app/api/**/route.ts` touching the same tables, or importing from `lib/social`/
   `lib/messaging` at all (broader than a literal string match, in case a route reaches
   these tables through a helper rather than a raw table name).
3. `supabase/functions/` checked for Edge Functions that might reach these tables outside
   the Next.js app entirely — the directory doesn't exist in this repo, so this is moot.

## Confirmed clean

- **`app/(app)/messages/actions.ts`** — all 5 exports (`sendMessage`,
  `markConversationRead`, `blockUser`, `unblockUser`, `reportMessage`) call
  `assertMessagingEnabled()` as their first line.
- **`app/(app)/connections/actions.ts`** — all 3 exports (`sendConnectionRequest`,
  `respondToConnectionRequest`, `removeConnection`) call `assertConnectionsEnabled()` as
  their first line.
- **`lib/social/post-actions.ts`** — all 7 exports (`createPost`, `repost`, `editPost`,
  `deletePost`, `likePost`, `unlikePost`, `reportPost`) call `assertSocialFeedEnabled()`,
  and the module goes further: it deliberately has no `"use server"` directive at all, so
  it isn't even a callable RPC endpoint regardless of the flag — a dedicated test
  (`__tests__/social/posts-hidden.test.ts`) mechanically asserts nothing under `app/`
  imports it. Two independent layers, not one.
- **`app/(app)/admin/actions.ts`** — every export calls `requireAdmin()` (confirmed by
  grep, three call sites). Its `message_reports`/`posts` moderation actions
  (`removeReportedPost`, `restoreReportedPost`) operate only on rows that can already
  exist regardless of the social-feed flag's state, and since nothing can currently
  create a `posts` row while `createPost` stays gated, this surface has nothing to act on
  today — not a new finding, matches what a prior audit already recorded.
- **No API route** imports from `lib/social` or `lib/messaging`, or touches these tables,
  other than `/api/export-data` — which is a read of a student's own existing data via
  the normal RLS-scoped client, not a use of the feature, and correctly needs no flag
  check (exporting old messages, if any existed, isn't "using" messaging).
- **No Supabase Edge Functions exist in this repo** — nothing to check there.
- `app/(app)/advisor/actions.ts` and `app/api/advisor/chat/route.ts` matched the initial
  keyword scan on the string "messages" — false positives, every hit is `advisor_messages`
  (the AI advisor conversation table, an always-on, unrelated feature) or the word
  appearing in unrelated prose.
- `app/(app)/profile/professional-actions.ts` and `app/(app)/profile/featured-actions.ts`
  (contact_info, headline/about, featured_items) have no dependency on connection status
  at all — pure "edit your own profile content," correctly outside this flag's scope.

## Two real findings

**1. `writeRecommendation()` and `endorseSkill()` gate on an accepted connection but never
check the connections flag themselves — the exact "protection borrowed, not standing
alone" pattern named three times today.**

- `app/(app)/u/[id]/recommendation-actions.ts`'s `writeRecommendation()` requires
  `hasAcceptedConnection` (via `checkRecommendationEligibility`) before inserting into
  `recommendations`. No call to `assertConnectionsEnabled()` anywhere in the file.
- `app/(app)/u/[id]/endorsement-actions.ts`'s `endorseSkill()` requires the identical
  `hasAcceptedConnection` (via `checkEndorsementEligibility`) before inserting into
  `skill_endorsements`. Same absence.
- **Why this is real despite being unexploitable today**: right now, no two students can
  ever have an *accepted* connection, because the only path that creates one
  (`sendConnectionRequest`/`respondToConnectionRequest`) is itself correctly gated by
  `assertConnectionsEnabled()`. So `hasAcceptedConnection` is always false, and both
  functions always return their `not_connected` error. But that's an *indirect*
  guarantee — these two functions are protected only because a *different* file's gate
  holds, not because they check anything themselves. If an accepted connection were ever
  created another way (a future code path, an admin/QA seeding script, a migration
  backfill) — anything that writes `connections.status = 'accepted'` outside
  `respondToConnectionRequest` — recommendations and endorsements would become writable
  immediately, silently, with the feature flag still reading "off." Confirmed this isn't
  already covered by a test the way messaging/connections/posts are: there is no
  `recommendations-hidden.test.ts` or `endorsements-hidden.test.ts` — `recommendations.
  test.ts` and `skill-endorsements.test.ts` exist but only test the pure eligibility
  predicates, not gating.
- Lower-severity same-shape gap in the same two files: `setRecommendationVisibility`,
  `deleteRecommendation`, and `withdrawEndorsement` have no flag check either — these
  only touch a row the caller already owns (author/recipient), so the blast radius if
  ever reachable is "interact with your own recommendation/endorsement," not "create a
  new relationship" — named for completeness, not because it's the same severity as the
  write path above.

**2. Separate bug, found in passing, same file: `reportRecommendation()` trusts a
caller-supplied `reportedUserId` instead of re-deriving it server-side.**

`app/(app)/u/[id]/recommendation-actions.ts`'s `reportRecommendation(recommendationId,
reportedUserId, reason)` inserts `reportedUserId` directly from the caller's argument.
Contrast `lib/social/post-actions.ts`'s `reportPostForUser`, in the same codebase, which
re-reads the post row and uses `post.author_id` specifically **so a caller can't name an
uninvolved student as the accused party** — its own comment states this exact reasoning.
`reportRecommendation` has no equivalent re-derivation: a caller can pass any
`recommendationId` they can see alongside *any* `reportedUserId`, and a moderation report
accusing that arbitrary person is filed. Not a feature-flag question — flagging it
because it's the identical vulnerability shape the codebase already fixed once elsewhere,
just not in this file.

## What's confirmed vs. not attempted

Confirmed by direct reading of the current file contents (not memory, not a prior
session's claim) for every file named above. Not attempted: proving the "if a connection
were ever created another way" scenario against a real database — that's a hypothetical
about a future code path, not a live gap to reproduce today, consistent with why this
finding is framed as "borrowed protection" rather than "currently exploitable."

Report only, per the pattern this session has followed for every audit — no code
changed. Both findings are small, well-understood fixes (`assertConnectionsEnabled()` at
the top of each write path; re-derive `reportedUserId` from the row) if wanted.
